// This file is a standalone entry point: bun run src/workers/ocr.worker.ts

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import Tesseract from 'tesseract.js';
import { db } from '../db';
import { documents, auditLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { OCR_QUEUE_NAME, type OcrJobData } from './ocr.queue';

// Worker connection (MUST be maxRetriesPerRequest: null)
const workerConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker<OcrJobData>(
  OCR_QUEUE_NAME,
  async (job) => {
    const { documentId, plaintextBase64, mimeType } = job.data;
    console.log(`[OCR] Processing document ${documentId}`);
    
    // 1. Convert base64 to buffer (in-memory only)
    const buffer = Buffer.from(plaintextBase64, 'base64');
    
    // 2. Run Tesseract OCR
    const { data } = await Tesseract.recognize(buffer, 'eng');
    const ocrText = data.text;
    
    // 3. Extract structured fields via regex patterns
    const extractedFields = extractFields(ocrText);
    
    // 4. Update document in DB
    await db.update(documents)
      .set({
        ocrText,
        extractedFields,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    
    // 5. Log OCR processing in audit log
    await db.insert(auditLogs).values({
      action: 'ocr_process',
      documentId,
      actorLabel: 'ocr-worker',
      createdAt: new Date(),
    });
    
    // 6. Explicitly discard plaintext
    // (buffer goes out of scope here, GC will clean it)
    
    console.log(`[OCR] Completed document ${documentId}, extracted ${ocrText.length} chars`);
  },
  {
    connection: workerConnection,
    concurrency: 2,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

// Field extraction helpers
function extractFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  
  // PAN number: 5 letters + 4 digits + 1 letter
  const panMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]/i);
  if (panMatch) fields.panNumber = panMatch[0].toUpperCase();
  
  // Aadhaar number: 4 digits space 4 digits space 4 digits
  const aadhaarMatch = text.match(/\d{4}\s?\d{4}\s?\d{4}/);
  if (aadhaarMatch) fields.aadhaarNumber = aadhaarMatch[0];
  
  // Passport number: letter followed by 7 digits
  const passportMatch = text.match(/[A-Z]\d{7}/i);
  if (passportMatch) fields.passportNumber = passportMatch[0].toUpperCase();
  
  // Date patterns: DD/MM/YYYY or DD-MM-YYYY
  const dateMatches = text.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/g);
  if (dateMatches) {
    if (dateMatches[0]) fields.date1 = dateMatches[0];
    if (dateMatches[1]) fields.date2 = dateMatches[1];
  }
  
  return fields;
}

// Graceful shutdown
worker.on('completed', (job) => {
  console.log(`[OCR] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[OCR] Job ${job?.id} failed:`, err.message);
});

process.on('SIGTERM', async () => {
  console.log('[OCR] Shutting down worker...');
  await worker.close();
  workerConnection.disconnect();
  process.exit(0);
});

console.log('[OCR] Worker started, waiting for jobs...');

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

// Producer connection (finite retry for API)
const producerConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
});

export const OCR_QUEUE_NAME = 'ocr-processing';

export interface OcrJobData {
  documentId: string;
  plaintextBase64: string; // transient, discarded after OCR
  mimeType: string;
}

export const ocrQueue = new Queue<OcrJobData>(OCR_QUEUE_NAME, {
  connection: producerConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

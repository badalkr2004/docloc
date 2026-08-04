import { x25519 } from '@noble/curves/ed25519.js';
import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';

export interface ClientKeyPair {
  publicKeyBase64: string;
  privateKeyBytes: Uint8Array;
}

export interface EncryptedDocumentResult {
  encryptedFileBytes: Uint8Array;
  wrappedDekBase64: string;
  plaintextBase64: string;
}

// 1. Base64 helpers
export function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binString);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0)!);
}

// 2. Base64 URL safe helpers
export function bytesToBase64Url(bytes: Uint8Array): string {
  let base64 = bytesToBase64(bytes);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64ToBytes(base64);
}

// 3. Generate key pair
export function generateUserKeyPair(): ClientKeyPair {
  const privateKeyBytes = x25519.utils.randomSecretKey();
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);
  return {
    publicKeyBase64: bytesToBase64(publicKeyBytes),
    privateKeyBytes,
  };
}

// 4. Derive key
export function deriveKeyFromPassphrase(passphrase: string, saltBytes: Uint8Array): Uint8Array {
  const passBytes = new TextEncoder().encode(passphrase);
  return hkdf(sha256, passBytes, saltBytes, new TextEncoder().encode('DocLocker-Passphrase-v1'), 32);
}

// 5. Encrypt private key
export function encryptPrivateKeyWithPassphrase(
  privateKeyBytes: Uint8Array,
  passphrase: string
): { encryptedBlob: string; saltBase64: string } {
  const salt = randomBytes(16);
  const key = deriveKeyFromPassphrase(passphrase, salt);
  const nonce = randomBytes(12);
  const cipher = gcm(key, nonce);
  const ciphertext = cipher.encrypt(privateKeyBytes);
  
  const packed = new Uint8Array(nonce.length + ciphertext.length);
  packed.set(nonce, 0);
  packed.set(ciphertext, nonce.length);
  
  return {
    encryptedBlob: bytesToBase64(packed),
    saltBase64: bytesToBase64(salt),
  };
}

// 6. Decrypt private key
export function decryptPrivateKeyWithPassphrase(
  encryptedBlobBase64: string,
  saltBase64: string,
  passphrase: string
): Uint8Array {
  const packed = base64ToBytes(encryptedBlobBase64);
  const salt = base64ToBytes(saltBase64);
  const key = deriveKeyFromPassphrase(passphrase, salt);
  const nonce = packed.slice(0, 12);
  const ciphertext = packed.slice(12);
  const cipher = gcm(key, nonce);
  return cipher.decrypt(ciphertext);
}

// 7. Encrypt doc
export function encryptDocumentForUpload(
  fileBytes: Uint8Array,
  ownerPublicKeyBase64: string
): EncryptedDocumentResult {
  const dek = randomBytes(32);
  const docNonce = randomBytes(12);
  const cipher = gcm(dek, docNonce);
  const ciphertext = cipher.encrypt(fileBytes);
  const encryptedFileBytes = new Uint8Array(docNonce.length + ciphertext.length);
  encryptedFileBytes.set(docNonce, 0);
  encryptedFileBytes.set(ciphertext, docNonce.length);
  
  const ephemeralPriv = x25519.utils.randomSecretKey();
  const ephemeralPub = x25519.getPublicKey(ephemeralPriv);
  const ownerPub = base64ToBytes(ownerPublicKeyBase64);
  const sharedSecret = x25519.getSharedSecret(ephemeralPriv, ownerPub);
  const wrapKey = hkdf(sha256, sharedSecret, new Uint8Array(0), new TextEncoder().encode('docloc-dek-wrap'), 32);
  const wrapNonce = randomBytes(12);
  const wrapCipher = gcm(wrapKey, wrapNonce);
  const wrappedDek = wrapCipher.encrypt(dek);
  
  const packedWrap = new Uint8Array(ephemeralPub.length + wrapNonce.length + wrappedDek.length);
  packedWrap.set(ephemeralPub, 0);
  packedWrap.set(wrapNonce, ephemeralPub.length);
  packedWrap.set(wrappedDek, ephemeralPub.length + wrapNonce.length);
  
  return {
    encryptedFileBytes,
    wrappedDekBase64: bytesToBase64(packedWrap),
    plaintextBase64: bytesToBase64(fileBytes), // OCR usage
  };
}

// 8. Unwrap DEK
export function unwrapDek(wrappedDekBase64: string, ownerPrivateKeyBytes: Uint8Array): Uint8Array {
  const packedWrap = base64ToBytes(wrappedDekBase64);
  const ephemeralPub = packedWrap.slice(0, 32);
  const wrapNonce = packedWrap.slice(32, 44);
  const wrappedDek = packedWrap.slice(44);
  
  const sharedSecret = x25519.getSharedSecret(ownerPrivateKeyBytes, ephemeralPub);
  const wrapKey = hkdf(sha256, sharedSecret, new Uint8Array(0), new TextEncoder().encode('docloc-dek-wrap'), 32);
  const wrapCipher = gcm(wrapKey, wrapNonce);
  return wrapCipher.decrypt(wrappedDek);
}

// 9. Decrypt doc
export function decryptDocumentFile(encryptedFileBytes: Uint8Array, dek: Uint8Array): Uint8Array {
  const docNonce = encryptedFileBytes.slice(0, 12);
  const ciphertext = encryptedFileBytes.slice(12);
  const cipher = gcm(dek, docNonce);
  return cipher.decrypt(ciphertext);
}

// 10. Re-wrap DEK
export function createShareKeyAndReWrapDek(dek: Uint8Array): {
  shareKeyUrlSafe: string;
  wrappedDekForGrantBase64: string;
} {
  const shareKey = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = gcm(shareKey, nonce);
  const wrappedDek = cipher.encrypt(dek);
  
  const packed = new Uint8Array(nonce.length + wrappedDek.length);
  packed.set(nonce, 0);
  packed.set(wrappedDek, nonce.length);
  
  return {
    shareKeyUrlSafe: bytesToBase64Url(shareKey),
    wrappedDekForGrantBase64: bytesToBase64(packed),
  };
}

// 11. Unwrap with share key
export function unwrapDekWithShareKey(
  wrappedDekForGrantBase64: string,
  shareKeyUrlSafe: string
): Uint8Array {
  const packed = base64ToBytes(wrappedDekForGrantBase64);
  const shareKey = base64UrlToBytes(shareKeyUrlSafe);
  const nonce = packed.slice(0, 12);
  const wrappedDek = packed.slice(12);
  
  const cipher = gcm(shareKey, nonce);
  return cipher.decrypt(wrappedDek);
}

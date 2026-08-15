import crypto from 'crypto';
import { config } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Returns a 32-byte Buffer key from the config encryption key.
 */
function getKey(): Buffer {
  let keyHex = config.encryptionKey;
  if (!keyHex || keyHex.length < 64) {
    // Generate deterministic 32-byte key from whatever string was supplied
    return crypto.createHash('sha256').update(keyHex || 'default_secret_key_32_bytes_fallback').digest();
  }
  return Buffer.from(keyHex.slice(0, 64), 'hex');
}

/**
 * Encrypts plaintext string using AES-256-GCM
 * Returns formatted string: "iv:ciphertext:authTag" (in hex)
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypts string encrypted with encrypt()
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }
  
  const [ivHex, cipherHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generates a secure random URL-safe token (e.g. for group invites)
 */
export function generateRandomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

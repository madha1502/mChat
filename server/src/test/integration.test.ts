import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt, generateRandomToken } from '../utils/crypto.js';
import {
  registerSchema,
  loginSchema,
  loginOtpSchema,
  sendOtpSchema,
  verifyOtpSchema,
  connectWhatsAppSchema,
} from '../validators/index.js';

test('Security & Crypto: AES-256-GCM Encryption and Decryption', () => {
  const secretApiKey = 'EAABwb298f2b38f837hf832974hf893274';
  const encrypted = encrypt(secretApiKey);

  assert.notEqual(encrypted, secretApiKey, 'Encrypted token should not equal plaintext');
  assert.equal(encrypted.split(':').length, 3, 'Encrypted format should be iv:cipher:authTag');

  const decrypted = decrypt(encrypted);
  assert.equal(decrypted, secretApiKey, 'Decrypted token should match original plaintext');
});

test('Security & Crypto: Password Hashing with bcrypt', async () => {
  const plainPassword = 'SuperSecretPassword123!';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  assert.notEqual(hashedPassword, plainPassword);
  assert.ok(await bcrypt.compare(plainPassword, hashedPassword));
  assert.equal(await bcrypt.compare('WrongPassword', hashedPassword), false);
});

test('Validation: 6-Digit OTP Schemas (Send, Verify, Login, Register)', () => {
  // Send OTP
  const send = sendOtpSchema.parse({ email: 'user@gmail.com', purpose: 'register', name: 'Bubu' });
  assert.equal(send.email, 'user@gmail.com');
  assert.equal(send.purpose, 'register');

  // Verify OTP
  assert.throws(() => verifyOtpSchema.parse({ email: 'user@gmail.com', otp: '123' })); // too short
  const verified = verifyOtpSchema.parse({ email: 'user@gmail.com', otp: '654321', purpose: 'login' });
  assert.equal(verified.otp, '654321');

  // Login OTP
  const loginOtp = loginOtpSchema.parse({ email: 'user@gmail.com', otp: '987654' });
  assert.equal(loginOtp.otp, '987654');
});

test('Validation: Real User Registration & Login schemas', () => {
  // Registration validation
  assert.throws(() => registerSchema.parse({ name: 'A', username: 'ab', email: 'invalid', password: '123' }));
  const validReg = registerSchema.parse({
    name: 'Alex Morgan',
    username: 'alex_morgan',
    email: 'alex.morgan@gmail.com',
    password: 'password123',
    otp: '123456',
  });
  assert.equal(validReg.username, 'alex_morgan');
  assert.equal(validReg.email, 'alex.morgan@gmail.com');
  assert.equal(validReg.otp, '123456');

  // Login validation
  assert.throws(() => loginSchema.parse({ identifier: '', password: '' }));
  const validLogin = loginSchema.parse({ identifier: 'alex_morgan', password: 'password123' });
  assert.equal(validLogin.identifier, 'alex_morgan');
});

test('Validation: WhatsApp Business connection schema', () => {
  const validWA = {
    displayPhoneNumber: '+91 9876543210',
  };
  const parsed = connectWhatsAppSchema.parse(validWA);
  assert.equal(parsed.displayPhoneNumber, '+91 9876543210');
});

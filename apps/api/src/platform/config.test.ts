import { expect, it } from 'vitest';
import { parseEnvironment } from './config.js';

const base = {
  APP_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://localhost/windops',
  ELECTRIC_URL: 'http://localhost:3001',
  ELECTRIC_SECRET: 'development',
  EMAIL_FROM: 'Wind Ops <test@example.com>',
  SMTP_URL: 'smtp://localhost:1025',
};
it('validates database without exposing values', () => {
  expect(() => parseEnvironment({ ...base, DATABASE_URL: 'super-secret' })).toThrow('DATABASE_URL');
  try {
    parseEnvironment({ ...base, DATABASE_URL: 'super-secret' });
  } catch (error) {
    expect(String(error)).not.toContain('super-secret');
  }
});
it('requires provider credentials', () => {
  expect(() => parseEnvironment({ ...base, EMAIL_TRANSPORT: 'resend' })).toThrow('RESEND_API_KEY');
});
it('requires production HTTPS', () => {
  expect(() => parseEnvironment({ ...base, NODE_ENV: 'production' })).toThrow('HTTPS');
});
it('loads local defaults', () => {
  expect(parseEnvironment(base).PORT).toBe(3000);
});

import type { ZodSchema } from 'zod';
import { Errors } from './errors.js';

export function parseWith<T>(schema: ZodSchema<T>, input: unknown): T {
  const res = schema.safeParse(input);
  if (!res.success) {
    throw Errors.badRequest('Validation failed', res.error.flatten());
  }
  return res.data;
}


import { z } from 'zod';
export const healthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('windops-api'),
});
export const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }),
});
export type Health = z.infer<typeof healthSchema>;
export type ApiError = z.infer<typeof errorSchema>;

import { z } from "zod";

export const ApiErrorPayloadSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()),
  }),
});

export type ApiErrorPayload = z.infer<typeof ApiErrorPayloadSchema>;

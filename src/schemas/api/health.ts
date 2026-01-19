import { z } from 'zod';

export const HealthResponseSchema = z.object({
    status: z.string().describe('Service status'),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

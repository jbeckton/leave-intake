import z from 'zod';

// Define Runtime Context Schema
export const RuntimeContextSchema = z.object({
  employeeId: z.string().optional(),
  employerId: z.string().optional(),
});

export type RuntimeContext = z.infer<typeof RuntimeContextSchema>;

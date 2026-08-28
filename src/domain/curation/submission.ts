import { z } from "zod";

/**
 * Portfolio submission schema — validates user input before DB insert.
 * ponytail: minimal fields, extend when needed.
 */

export const SubmissionSchema = z.object({
  url: z.string().url("Must be a valid URL").max(300),
  creatorName: z.string().trim().min(1, "Name is required").max(200),
  creatorRole: z.string().trim().min(1, "Role is required").max(120),
  email: z.string().email("Invalid email").max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type SubmissionInput = z.infer<typeof SubmissionSchema>;

export interface SubmissionResult {
  success: boolean;
  id?: string;
  error?: string;
}

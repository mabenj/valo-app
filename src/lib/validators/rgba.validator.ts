import { z } from "zod";

export const RgbaValidator = z.object({
    red: z.number().min(0).max(255),
    green: z.number().min(0).max(255),
    blue: z.number().min(0).max(255),
    alpha: z.number().min(0).max(1)
});

export type Rgba = z.infer<typeof RgbaValidator>;

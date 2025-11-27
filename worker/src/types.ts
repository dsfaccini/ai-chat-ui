import { z } from 'zod'

export const SlugSchema = z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9-]{1,63}$/)

export const RegistrationSchema = z.object({
    slug: SlugSchema,
    token: z.string().min(16),
    port: z.number().int().min(1).max(65535),
    updatedAt: z.string().optional(),
})

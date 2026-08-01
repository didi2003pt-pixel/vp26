import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "A palavra-passe deve ter pelo menos 12 caracteres.")
  .max(128, "A palavra-passe é demasiado longa.")
  .regex(/[a-z]/, "Inclui pelo menos uma letra minúscula.")
  .regex(/[A-Z]/, "Inclui pelo menos uma letra maiúscula.")
  .regex(/[0-9]/, "Inclui pelo menos um número.");

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  nickname: z.string().trim().min(3).max(40).regex(/^[\p{L}\p{N}._-]+$/u),
  city: z.string().trim().min(2).max(100),
  country: z.string().trim().length(2).default("PT"),
  password: passwordSchema,
  acceptTerms: z.literal("on"),
  acceptPrivacy: z.literal("on"),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

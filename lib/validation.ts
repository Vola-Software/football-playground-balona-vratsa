import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Имейлът е задължителен")
    .email("Невалиден имейл адрес"),
  password: z.string().min(1, "Паролата е задължителна"),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, "Имейлът е задължителен")
    .email("Невалиден имейл адрес")
    .max(254, "Имейлът е твърде дълъг"),
  password: z
    .string()
    .min(8, "Паролата трябва да е поне 8 символа")
    .max(72, "Паролата е твърде дълга"),
  phone: z
    .string()
    .min(1, "Телефонният номер е задължителен")
    .regex(
      /^\+?[0-9\s\-().]{7,20}$/,
      "Невалиден телефонен номер"
    ),
  teamName: z
    .string()
    .max(100, "Името на отбора е твърде дълго")
    .optional(),
});

export const createBookingSchema = z.object({
  fieldId: z.string().min(1, "Изберете игрище"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата"),
  hour: z.number().int().min(0).max(23),
  teamAName: z.string().max(100, "Твърде дълго").optional(),
  teamBName: z.string().max(100, "Твърде дълго").optional(),
  notes: z.string().max(500, "Бележката е твърде дълга").optional(),
});

export const rejectBookingSchema = z.object({
  reason: z
    .string()
    .min(1, "Причината е задължителна")
    .max(500, "Причината е твърде дълга"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

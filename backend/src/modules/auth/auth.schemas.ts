import { z } from "zod";

export const RegisterSchema = z.object({
  email: z
    .string()
    .email("Email invalide")
    .max(255)
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Mot de passe : 8 caractères minimum")
    .max(72, "Mot de passe : 72 caractères maximum")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre",
    ),
  pseudo: z
    .string()
    .min(3, "Pseudo : 3 caractères minimum")
    .max(30, "Pseudo : 30 caractères maximum")
    .regex(/^[a-zA-Z0-9_\-\.]+$/, "Pseudo : lettres, chiffres, _ - . uniquement"),
  birthDate: z
    .string()
    .datetime({ message: "Date de naissance invalide (ISO 8601)" })
    .refine((d) => {
      const age = (Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18;
    }, "Tu dois avoir au moins 18 ans pour t'inscrire"),
  gender: z.enum(["HOMME", "FEMME", "AUTRE"]),
  city: z.string().min(1, "Ville requise").max(100),
});

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requis"),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshDto = z.infer<typeof RefreshSchema>;

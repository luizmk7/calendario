import { z } from "zod";
import { companySchema } from "./validation";
const id = z.string().min(1).max(100);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  });
const post = z
  .object({
    id,
    companyId: id,
    title: z.string().trim().max(150),
    date: dateSchema,
    format: z.enum(["Feed", "Stories", "Reels"]),
    topic: z.string().trim().max(250),
    quantity: z.number().int().min(1).max(100),
    publishedQuantity: z.number().int().min(0).max(100),
  })
  .refine(
    (p) => p.publishedQuantity <= p.quantity,
    "A quantidade publicada não pode superar a prevista.",
  );
const note = z.object({
  id: z.string().uuid(),
  companyId: id,
  body: z.string().trim().min(1).max(5000),
  date: dateSchema.nullable(),
  resolved: z.boolean(),
});
export const portalAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("saveCompany"), company: companySchema }),
  z.object({ action: z.literal("deleteCompany"), id }),
  z.object({ action: z.literal("savePost"), post }),
  z.object({ action: z.literal("deletePost"), id }),
  z.object({ action: z.literal("saveNote"), note }),
  z.object({ action: z.literal("deleteNote"), id: z.string().uuid() }),
  z.object({
    action: z.literal("sendNews"),
    news: z.object({
      companyId: id,
      body: z.string().trim().min(1).max(5000),
      date: dateSchema.nullable(),
    }),
  }),
  z.object({
    action: z.literal("updateNews"),
    id: z.string().uuid(),
    resolved: z.boolean().optional(),
    read: z.literal(true).optional(),
  }),
  z.object({
    action: z.literal("linkClient"),
    email: z.string().trim().email().max(254),
    companyId: id,
  }),
  z.object({ action: z.literal("revokeClient"), clientId: z.string().uuid() }),
]);

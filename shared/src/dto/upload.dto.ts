import { z } from 'zod';

/** Whitelisted upload kinds — backend picks the bucket / key prefix per kind. */
export const UPLOAD_KINDS = ['pet-photo', 'avatar'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

/** Owner asks: "I want to upload a thing of this kind". */
export const RequestUploadUrlDto = z.object({
  kind: z.enum(UPLOAD_KINDS),
  mimeType: z.enum(ALLOWED_IMAGE_MIME),
  /** Bytes — used both for client-side check and to stamp Content-Length on the presign. */
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024), // 10 MB
});
export type RequestUploadUrlDto = z.infer<typeof RequestUploadUrlDto>;

/** Backend hands back: the temp PUT URL + the eventual public URL to store. */
export const UploadUrlResponse = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  fileKey: z.string(),
  expiresAt: z.string().datetime(),
  /** Headers the client MUST send on the PUT — e.g. {"Content-Type": "image/jpeg"}. */
  requiredHeaders: z.record(z.string()),
});
export type UploadUrlResponse = z.infer<typeof UploadUrlResponse>;

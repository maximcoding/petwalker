import { z } from 'zod';

export const SendMessageDto = z.object({
  body: z.string().min(1).max(4000),
});
export type SendMessageDto = z.infer<typeof SendMessageDto>;

/** Sent over the WS gateway as the `chat:message:send` payload. */
export const ChatMessageFrame = z.object({
  bookingId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});
export type ChatMessageFrame = z.infer<typeof ChatMessageFrame>;

/** REST cursor-paginated history. Sent as querystring. */
export const ListMessagesQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQuery>;

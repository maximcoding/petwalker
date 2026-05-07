export const ChatEvent = {
  /** client → server: send a new message */
  MessageSend: 'chat:message:send',
  /** server → clients: a message was created */
  MessageNew: 'chat:message:new',
  /** server → clients: someone is typing */
  Typing: 'chat:typing',
  /** server → clients: read-receipt update */
  Read: 'chat:read',
  /** generic error frame */
  Error: 'chat:error',
} as const;

export type ChatEvent = (typeof ChatEvent)[keyof typeof ChatEvent];

export const TrackingEvent = {
  /** walker app → server: GPS ping */
  Ping: 'tracking:ping',
  /** server → owner: latest position */
  Position: 'tracking:position',
  /** server → both: walk started */
  WalkStarted: 'tracking:walk:started',
  /** server → both: walk ended (with stats) */
  WalkEnded: 'tracking:walk:ended',
  Error: 'tracking:error',
} as const;

export type TrackingEvent = (typeof TrackingEvent)[keyof typeof TrackingEvent];

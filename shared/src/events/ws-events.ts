import type { GeoSample, UUID } from '../types/common.js';
import type { Message } from '../types/message.js';

/**
 * Wire-level events exchanged on the tracking and chat WebSocket gateways.
 *
 * Both directions use a `type`-discriminated union so handlers can switch on it.
 * The names are namespaced (`tracking:*`, `chat:*`) so a single client can
 * multiplex both gateways onto one logger / debug panel without ambiguity.
 */

// ────────────── tracking ──────────────

/** Provider → server. One GPS sample, captured by expo-location. */
export interface TrackingPingEvent {
  type: 'tracking:ping';
  walkId: UUID;
  sample: GeoSample;
}

/** Server → both. The provider just hit Start; clients should subscribe. */
export interface TrackingStartedEvent {
  type: 'tracking:started';
  walkId: UUID;
  bookingId: UUID;
  startedAt: string;
}

/** Server → both. Owner sees the trail extend in real time. */
export interface TrackingSampleEvent {
  type: 'tracking:sample';
  walkId: UUID;
  sample: GeoSample;
}

/** Server → both. Final state on End walk. */
export interface TrackingEndedEvent {
  type: 'tracking:ended';
  walkId: UUID;
  endedAt: string;
  distanceM: number;
}

export type WsTrackingClientEvent = TrackingPingEvent;
export type WsTrackingServerEvent =
  | TrackingStartedEvent
  | TrackingSampleEvent
  | TrackingEndedEvent;

// ────────────── chat ──────────────

/** Client → server. */
export interface ChatSendEvent {
  type: 'chat:send';
  bookingId: UUID;
  body: string;
}

/** Server → both. New message persisted, fanned out to all members of the room. */
export interface ChatMessageEvent {
  type: 'chat:message';
  message: Message;
}

export type WsChatClientEvent = ChatSendEvent;
export type WsChatServerEvent = ChatMessageEvent;

// ────────────── web notifications ──────────────

export interface WebNotificationReceivedEvent {
  type: 'notification:received';
  notification: {
    id: string;
    userId: string;
    eventType: string;
    title: string;
    body: string;
    deepLink: string | null;
    readAt: string | null;
    createdAt: string;
  };
}

export type WsNotificationsServerEvent = WebNotificationReceivedEvent;

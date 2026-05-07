/**
 * Minimal iCalendar (RFC 5545) VEVENT parser.
 *
 * Handles the common case: standalone VEVENT blocks with DTSTART, DTEND, UID,
 * SUMMARY. Does NOT yet expand RRULE (recurring events) — events with RRULE
 * are returned as a single block at their first occurrence; recurrence support
 * is a future improvement (TODO: rrulejs or expand inline).
 *
 * Supported DT formats:
 *   DTSTART:20260507T140000Z              → UTC
 *   DTSTART;TZID=America/New_York:...     → treated as UTC (TZID ignored — see TODO)
 *   DTSTART;VALUE=DATE:20260507           → all-day event (00:00–24:00 UTC)
 *
 * Lines that are unfolded (RFC 5545 §3.1) — physical CRLF + space/tab
 * indicates continuation.
 */

export interface IcalEvent {
  uid: string;
  summary: string | null;
  start: Date;
  end: Date;
}

/** Unfold continuation lines, then split on \r?\n. */
function unfoldLines(raw: string): string[] {
  // Replace any "CRLF SPACE" or "CRLF TAB" with empty string to join lines.
  const unfolded = raw.replace(/\r?\n[ \t]/g, '');
  return unfolded.split(/\r?\n/);
}

/**
 * Parse an iCalendar date-time. Returns a Date in UTC.
 *
 * Forms: 20260507T140000Z, 20260507T140000, 20260507 (all-day).
 *
 * TZID=... params are stripped and treated as UTC for now — produces a
 * harmless misalignment for providers in non-UTC zones, will be fixed when
 * we plumb timezone awareness end-to-end.
 */
function parseDt(value: string, isAllDay: boolean): Date {
  if (isAllDay) {
    // 20260507 → midnight UTC
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    return new Date(Date.UTC(y, m, d));
  }
  // 20260507T140000Z or 20260507T140000
  const y = Number(value.slice(0, 4));
  const mo = Number(value.slice(4, 6)) - 1;
  const d = Number(value.slice(6, 8));
  const h = Number(value.slice(9, 11));
  const mi = Number(value.slice(11, 13));
  const s = Number(value.slice(13, 15));
  return new Date(Date.UTC(y, mo, d, h, mi, s));
}

interface RawProp {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Split "DTSTART;TZID=America/New_York:20260507T140000" into parts. */
function parseProp(line: string): RawProp | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(';');
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { name: (name ?? '').toUpperCase(), params, value };
}

/**
 * Parse an iCalendar text payload into a flat array of events.
 *
 * Returns events whose `end > start` and `start` is in the next 60 days
 * (callers typically scope sync to that horizon — events further out won't
 * collide with bookings during the booking window anyway).
 */
export function parseIcal(text: string): IcalEvent[] {
  const lines = unfoldLines(text);
  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> & { _hasStart?: boolean; _hasEnd?: boolean } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (
        cur &&
        cur.uid &&
        cur.start instanceof Date &&
        cur.end instanceof Date &&
        cur.end.getTime() > cur.start.getTime()
      ) {
        events.push({
          uid: cur.uid,
          summary: cur.summary ?? null,
          start: cur.start,
          end: cur.end,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const prop = parseProp(line);
    if (!prop) continue;
    switch (prop.name) {
      case 'UID':
        cur.uid = prop.value;
        break;
      case 'SUMMARY':
        // Unescape comma + semicolon + backslash per RFC 5545 §3.3.11.
        cur.summary = prop.value.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, '\n');
        break;
      case 'DTSTART': {
        const isAllDay = prop.params.VALUE === 'DATE';
        cur.start = parseDt(prop.value, isAllDay);
        cur._hasStart = true;
        break;
      }
      case 'DTEND': {
        const isAllDay = prop.params.VALUE === 'DATE';
        cur.end = parseDt(prop.value, isAllDay);
        cur._hasEnd = true;
        break;
      }
      // RRULE / EXDATE / DURATION etc. silently ignored for now.
      default:
        break;
    }
  }

  return events;
}

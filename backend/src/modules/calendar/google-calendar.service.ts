import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Thin wrapper around Google's `freebusy.query` endpoint.
 *
 * Why freebusy and not events.list:
 *  - We only need to know IF the user is busy at a given moment, not
 *    the title/location/attendees of each event.
 *  - The consent prompt for `calendar.freebusy` is reassuring ("see
 *    when you're busy") vs `events.readonly` ("read all your events").
 *  - Output is already in the shape we want — flat array of busy
 *    windows — no recurrence-rule expansion, no all-day-event quirks.
 */
@Injectable()
export class GoogleCalendarService {
  private readonly log = new Logger(GoogleCalendarService.name);

  /**
   * Query primary-calendar busy windows in `[timeMin, timeMax)`.
   * Returns a flat array of {start, end} pairs. Empty array means
   * "user is wide open in this window".
   */
  async getBusyWindows(
    accessToken: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<Array<{ start: Date; end: Date }>> {
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: 'primary' }],
      }),
    });

    if (res.status === 401) {
      // Caller should refresh and retry. Surface a typed marker via
      // the message so the controller layer can branch.
      throw new ServiceUnavailableException('google-401');
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      this.log.warn(`freebusy ${res.status}: ${txt.slice(0, 300)}`);
      throw new ServiceUnavailableException(
        `Google freebusy.query failed (${res.status})`,
      );
    }

    const json = (await res.json()) as FreeBusyResponse;
    const cal = json.calendars?.primary;
    if (!cal) return [];
    if (cal.errors && cal.errors.length > 0) {
      this.log.warn(`freebusy calendar errors: ${JSON.stringify(cal.errors)}`);
      throw new ServiceUnavailableException(
        `Google reported calendar errors: ${cal.errors.map((e) => e.reason).join(', ')}`,
      );
    }
    return (cal.busy ?? []).map((b) => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }));
  }
}

interface FreeBusyResponse {
  calendars?: Record<
    string,
    {
      busy?: Array<{ start: string; end: string }>;
      errors?: Array<{ domain: string; reason: string }>;
    }
  >;
}

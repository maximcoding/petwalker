import { AuthApi } from './endpoints/auth.api.js';
import { BookingsApi } from './endpoints/bookings.api.js';
import { CalendarApi } from './endpoints/calendar.api.js';
import { ChatApi } from './endpoints/chat.api.js';
import { PaymentsApi } from './endpoints/payments.api.js';
import { PetsApi } from './endpoints/pets.api.js';
import { ProvidersApi } from './endpoints/providers.api.js';
import { PushApi } from './endpoints/push.api.js';
import { ReviewsApi } from './endpoints/reviews.api.js';
import { UsersApi } from './endpoints/users.api.js';
import { HttpClient, type HttpClientOptions } from './http.js';

export class PetwalkerApi {
  readonly http: HttpClient;
  readonly auth: AuthApi;
  readonly users: UsersApi;
  readonly pets: PetsApi;
  readonly bookings: BookingsApi;
  readonly providers: ProvidersApi;
  readonly chat: ChatApi;
  readonly reviews: ReviewsApi;
  readonly payments: PaymentsApi;
  readonly push: PushApi;
  readonly calendar: CalendarApi;

  constructor(opts: HttpClientOptions) {
    this.http = new HttpClient(opts);
    this.auth = new AuthApi(this.http);
    this.users = new UsersApi(this.http);
    this.pets = new PetsApi(this.http);
    this.bookings = new BookingsApi(this.http);
    this.providers = new ProvidersApi(this.http);
    this.chat = new ChatApi(this.http);
    this.reviews = new ReviewsApi(this.http);
    this.payments = new PaymentsApi(this.http);
    this.push = new PushApi(this.http);
    this.calendar = new CalendarApi(this.http);
  }
}

export type { HttpClientOptions } from './http.js';

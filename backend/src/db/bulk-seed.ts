/**
 * Bulk seed generator — for stress-testing UI density and pagination.
 *
 * CLI:
 *   pnpm --filter @petwalker/backend db:bulk-seed
 *
 * Tunable via env (defaults shown):
 *   NUM_PROVIDERS=10000
 *   NUM_PETS=50000
 *   NUM_BOOKINGS=50000
 *
 * Idempotent for provider-side data (cognitoSub conflict skip). Olivia's
 * owner-side data (pets, bookings, derived walks/messages) is wiped before
 * each run so re-runs don't pile up duplicates.
 *
 * Pre-req: Olivia must already exist in the users table — sign in once via
 * cognito-local first, then run this.
 */

import '../config/load-env.js';
import { eq, sql } from 'drizzle-orm';

import { createDb } from './client.js';
import {
  bookings,
  messages,
  pets,
  providerAvailability,
  providerServiceOfferings,
  recurringSeries,
  serviceProviderProfiles,
  users,
  walks,
  type UserRow,
} from './schema/index.js';

// ────────────── config ──────────────
const N_PROVIDERS = Number(process.env.NUM_PROVIDERS ?? 10_000);
const N_PETS = Number(process.env.NUM_PETS ?? 50_000);
const N_BOOKINGS = Number(process.env.NUM_BOOKINGS ?? 50_000);

// postgres-js bind-param ceiling is ~32K. Each row has ~10 columns, so
// BATCH * cols < 32K. 500 leaves plenty of headroom.
const BATCH = 500;

const OLIVIA_COGNITO_SUB = 'b5f5ddb1-effd-4845-a8e6-052ec0140c0e';

// ────────────── data pools ──────────────
const SERVICE_TYPES = [
  'walking',
  'grooming',
  'sitting',
  'boarding',
  'training',
  'daycare',
  'photography',
  'massage_wellness',
  'senior_care',
  'veterinary',
  'fitness',
] as const;
type ServiceType = typeof SERVICE_TYPES[number];

// Hourly rates in cents — niche/professional services price higher.
const PRICES: Record<ServiceType, [number, number]> = {
  walking: [1500, 4500],
  grooming: [3000, 9000],
  sitting: [1800, 5000],
  boarding: [5000, 15000],
  training: [3500, 12000],
  daycare: [2000, 3500],
  photography: [8000, 15000],
  massage_wellness: [5000, 10000],
  senior_care: [2500, 5000],
  veterinary: [8000, 20000],
  fitness: [3000, 6000],
};

// Weights for offering distribution. Mass-market services get most providers,
// specialist services stay rare but visible. Total isn't normalized here —
// `pickWeighted` does that.
const SERVICE_WEIGHTS: Record<ServiceType, number> = {
  walking: 60,
  sitting: 25,
  grooming: 20,
  boarding: 15,
  training: 15,
  daycare: 12,
  fitness: 8,
  massage_wellness: 8,
  senior_care: 8,
  photography: 5,
  veterinary: 3,
};

// Greater-NYC bbox.
const LAT_MIN = 40.55;
const LAT_MAX = 40.95;
const LNG_MIN = -74.25;
const LNG_MAX = -73.7;

// Display-only city pool for the new "Location" chip on provider cards.
// We pick uniformly — no geographic accuracy here, since the chip is
// just a label and the search still uses lat/lng + radius.
const CITIES = [
  'Brooklyn',
  'Queens',
  'Manhattan',
  'Bronx',
  'Staten Island',
  'Hoboken',
  'Jersey City',
  'Astoria',
  'Park Slope',
  'Williamsburg',
  'Long Island City',
];

const FIRST_NAMES = [
  'Alex', 'Jamie', 'Sam', 'Pat', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Quinn',
  'Avery', 'Blake', 'Cameron', 'Dakota', 'Emerson', 'Finley', 'Gray', 'Hayden', 'Indigo', 'Jules',
  'Kai', 'Logan', 'Marlowe', 'Nico', 'Oakley', 'Phoenix', 'Reese', 'Sage', 'Tatum', 'Wren',
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Oliver', 'Sophia', 'Elijah', 'Isabella', 'James',
  'Mia', 'William', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Theodore',
  'Abigail', 'Jack', 'Emily', 'Levi', 'Elizabeth', 'Sebastian', 'Mila', 'Mateo', 'Ella', 'Daniel',
  'Michael', 'Sofia', 'Ethan', 'Camila', 'Aiden', 'Aria', 'David', 'Scarlett', 'Joseph',
  'Lily', 'Jackson', 'Chloe', 'Owen', 'Nora', 'Carter', 'Madison', 'Leo', 'Hazel', 'Wyatt',
  'Layla', 'Asher', 'Aubrey', 'Hudson', 'Stella', 'Lincoln', 'Anthony', 'Zoey', 'Caleb',
];

const LAST_NAMES = [
  'Walker', 'Sitter', 'Groomer', 'Trainer', 'Boarder', 'Field', 'Park', 'Rivers', 'Hill', 'Lane',
  'Brook', 'Vale', 'Glen', 'Wood', 'Stone', 'Reed', 'Sloane', 'Reeves', 'Booker', 'Holt',
  'Cross', 'Ortiz', 'Chen', 'Patel', 'Singh', 'Khan', 'Garcia', 'Lopez', 'Martinez',
  'Hernandez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Young',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hall', 'Adams', 'Baker', 'Nelson', 'Mitchell',
];

const BIO_TEMPLATES = [
  'Friendly and reliable {role} with {years} years of experience. {breeds} are my specialty.',
  'Certified {role}. Patient, calm, and great with {breeds}.',
  '{years} years caring for {breeds}. Background in animal behavior.',
  'Stay-at-home {role} — your dog gets undivided attention.',
  'Vet-tech background. Experienced with anxious or reactive {breeds}.',
  'Weekend and evening availability. Comfortable with {breeds} of all sizes.',
  'Professional {role} insured and bonded. {years} years on the job.',
  'I treat every dog like my own. {breeds} welcome.',
];

const ROLE_LABEL: Record<ServiceType, string> = {
  walking: 'walker',
  grooming: 'groomer',
  sitting: 'sitter',
  boarding: 'boarder',
  training: 'trainer',
  daycare: 'daycare host',
  photography: 'pet photographer',
  massage_wellness: 'wellness specialist',
  senior_care: 'senior-care specialist',
  veterinary: 'veterinarian',
  fitness: 'fitness coach',
};

const BREED_FAMILIES = [
  'small breeds', 'large breeds', 'puppies', 'senior dogs', 'high-energy breeds',
  'rescue dogs', 'doodles', 'terriers', 'retrievers', 'shepherds',
];

const PET_BREEDS = [
  'Golden Retriever', 'Labrador', 'Border Collie', 'French Bulldog', 'Poodle',
  'Beagle', 'German Shepherd', 'Dachshund', 'Yorkie', 'Bulldog',
  'Boxer', 'Husky', 'Chihuahua', 'Shih Tzu', 'Cavalier King Charles',
  'Pug', 'Australian Shepherd', 'Corgi', 'Mini Schnauzer', 'Maltese',
  'Bernese', 'Doberman', 'Great Dane', 'Pit Bull mix', 'Cocker Spaniel',
];

const PET_NAMES = [
  'Biscuit', 'Mocha', 'Pepper', 'Luna', 'Charlie', 'Cooper', 'Bella', 'Buddy', 'Daisy', 'Max',
  'Lucy', 'Bailey', 'Sadie', 'Toby', 'Rocky', 'Tucker', 'Oliver', 'Chloe', 'Lola', 'Jack',
  'Roxy', 'Duke', 'Stella', 'Riley', 'Bear', 'Zeus', 'Zoe', 'Penny', 'Sophie', 'Coco',
  'Henry', 'Maggie', 'Murphy', 'Finn', 'Ruby', 'Leo', 'Molly', 'Oscar', 'Ginger', 'Milo',
  'Nala', 'Apollo', 'Hazel', 'Boomer', 'Willow', 'Gus', 'Rosie', 'Shadow', 'Olive', 'Beau',
];

const PET_NOTES = [
  'Loves frisbee. Hates squirrels.',
  'High energy — needs at least 60 min daily.',
  'Snorts when happy.',
  'Anxious around strangers — slow introductions please.',
  'Knows sit, stay, lay down.',
  'Pulls on leash; working on it.',
  'Allergic to chicken.',
  'Loves water — happy to swim.',
  'Senior dog, walks slowly.',
  'Best friends with every other dog.',
  null,
  null,
];

const BOOKING_NOTES = [
  'Please bring water bowl.',
  'He gets nervous around bicycles.',
  'Loves long walks!',
  'Senior dog — slow pace.',
  'Allergic to chicken.',
  'Gate code: 1234',
  'Park is 2 blocks south, please use it.',
  'Photos appreciated 📸',
  null,
  null,
  null,
];

const CHAT_LINES = [
  'Hey! On our way.',
  'Got it 👍',
  'Thanks for the update!',
  'All good — had a great time.',
  'Be there in 5.',
  'Just finished, photos coming.',
  'Heads up, traffic on the bridge.',
  'No problem!',
  'Pet ate well today.',
  'Walk was a bit shorter due to rain.',
  'See you next week!',
  'Thanks again 🙏',
];

const CANCELLATION_REASONS = ['Schedule conflict', 'Sick dog', 'Family emergency', 'Weather', 'Travel'];

// ────────────── deterministic PRNG (Mulberry32) for reproducibility ──────────────
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(424242);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;
const randInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const randFloat = (lo: number, hi: number) => lo + rng() * (hi - lo);

/**
 * Weighted random pick from a [value, weight][] list. `excludeSet` filters out
 * already-picked values without mutating inputs — used to draw N distinct
 * services for one provider while still respecting the weight distribution.
 */
function pickWeighted<T>(
  pool: readonly (readonly [T, number])[],
  excludeSet?: Set<T>,
): T {
  const filtered = excludeSet ? pool.filter(([v]) => !excludeSet.has(v)) : pool;
  const total = filtered.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of filtered) {
    r -= w;
    if (r <= 0) return v;
  }
  return filtered[filtered.length - 1]![0];
}

const SERVICE_POOL: readonly (readonly [ServiceType, number])[] = SERVICE_TYPES.map(
  (s) => [s, SERVICE_WEIGHTS[s]] as const,
);

// ────────────── batched insert helper ──────────────
async function chunkInsert<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: T[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  conflict?: 'do-nothing',
  label?: string,
): Promise<void> {
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const q = db.insert(table).values(slice);
    await (conflict === 'do-nothing' ? q.onConflictDoNothing() : q);
    done += slice.length;
    if (label && done % (BATCH * 10) === 0) {
      process.stdout.write(`\r  ${label}: ${done}/${rows.length}`);
    }
  }
  if (label) process.stdout.write(`\r  ${label}: ${rows.length}/${rows.length}\n`);
}

// ────────────── generators ──────────────
function buildProvider(i: number) {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const r = rng();
  // Most providers are specialists (1-2 services); a long tail does 3+.
  const numServices = r < 0.45 ? 1 : r < 0.78 ? 2 : r < 0.93 ? 3 : r < 0.99 ? 4 : 5;
  const picked = new Set<ServiceType>();
  const services: ServiceType[] = [];
  for (let n = 0; n < numServices; n++) {
    const s = pickWeighted(SERVICE_POOL, picked);
    picked.add(s);
    services.push(s);
  }
  const offerings = services.map((s) => ({
    serviceType: s,
    hourlyRateCents: randInt(PRICES[s][0], PRICES[s][1]),
  }));
  const primary = services[0]!;
  const bio = pick(BIO_TEMPLATES)
    .replace('{role}', ROLE_LABEL[primary])
    .replace('{years}', String(randInt(2, 18)))
    .replace('{breeds}', pick(BREED_FAMILIES));

  const cognitoSub = `seed-prv-${String(i).padStart(6, '0')}`;
  return {
    cognitoSub,
    email: `${first}.${last}.${i}@petwalker.test`.toLowerCase(),
    fullName: `${first} ${last}`,
    // Deterministic random avatar from pravatar.cc, seeded by cognitoSub.
    avatarUrl: `https://i.pravatar.cc/256?u=${cognitoSub}`,
    bio,
    baseLat: randFloat(LAT_MIN, LAT_MAX).toFixed(6),
    baseLng: randFloat(LNG_MIN, LNG_MAX).toFixed(6),
    serviceRadiusKm: String(randInt(3, 30)),
    // Display chips on the provider card. baseCity is a free-form label;
    // experienceSinceYear feeds the "Walking since {year}" chip. Keep the
    // "since" range plausible (5–20 years ago).
    baseCity: pick(CITIES),
    experienceSinceYear: new Date().getUTCFullYear() - randInt(5, 20),
    offerings,
  };
}

function buildPet(i: number) {
  // placedog.net serves random dog photos at the requested size, seeded by id.
  // ?id range is roughly 1-180 — modulo to stay in range, but vary over i.
  const dogId = (i % 180) + 1;
  return {
    name: i < PET_NAMES.length ? PET_NAMES[i]! : `${pick(PET_NAMES)}-${i}`,
    breed: pick(PET_BREEDS),
    weightKg: randFloat(4, 45).toFixed(2),
    ageYears: randFloat(0.5, 14).toFixed(1),
    notes: pick(PET_NOTES),
    photoUrl: `https://placedog.net/400/400?id=${dogId}`,
  };
}

// ────────────── main ──────────────
async function main(): Promise<void> {
  const db = createDb({ logger: false });
  console.log(`bulk-seed: ${N_PROVIDERS} providers · ${N_PETS} pets · ${N_BOOKINGS} bookings`);
  const t0 = Date.now();

  // 1. Providers ----------------------------------------------------------
  const userRows = Array.from({ length: N_PROVIDERS }, (_, i) => {
    const p = buildProvider(i);
    return {
      cognitoSub: p.cognitoSub,
      email: p.email,
      role: 'provider' as const,
      fullName: p.fullName,
      avatarUrl: p.avatarUrl,
      _bio: p.bio,
      _baseLat: p.baseLat,
      _baseLng: p.baseLng,
      _serviceRadiusKm: p.serviceRadiusKm,
      _baseCity: p.baseCity,
      _experienceSinceYear: p.experienceSinceYear,
      _offerings: p.offerings,
    };
  });

  console.log('\n→ providers');
  await chunkInsert(
    users,
    userRows.map((u) => ({
      cognitoSub: u.cognitoSub,
      email: u.email,
      role: u.role,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
    })),
    db,
    'do-nothing',
    'users',
  );

  // Pull back id by cognitoSub so we can FK profiles + offerings.
  console.log('  loading provider ids');
  const providerRows = await db
    .select({ id: users.id, cognitoSub: users.cognitoSub })
    .from(users)
    .where(sql`cognito_sub LIKE 'seed-prv-%'`);
  const subToId = new Map(providerRows.map((r) => [r.cognitoSub, r.id]));

  // Profiles
  const profileValues = userRows.flatMap((u) => {
    const id = subToId.get(u.cognitoSub);
    if (!id) return [];
    return [{
      userId: id,
      bio: u._bio,
      serviceRadiusKm: u._serviceRadiusKm,
      baseLat: u._baseLat,
      baseLng: u._baseLng,
      baseCity: u._baseCity,
      experienceSinceYear: u._experienceSinceYear,
    }];
  });
  await chunkInsert(serviceProviderProfiles, profileValues, db, 'do-nothing', 'profiles');

  // Offerings
  const offeringValues = userRows.flatMap((u) => {
    const id = subToId.get(u.cognitoSub);
    if (!id) return [];
    return u._offerings.map((o) => ({
      providerId: id,
      serviceType: o.serviceType,
      hourlyRateCents: o.hourlyRateCents,
      active: true,
    }));
  });
  await chunkInsert(providerServiceOfferings, offeringValues, db, 'do-nothing', 'offerings');

  // Availability — 24/7 for everyone (so any booking time validates).
  const availabilityValues = userRows.flatMap((u) => {
    const id = subToId.get(u.cognitoSub);
    if (!id) return [];
    return Array.from({ length: 7 }, (_, dow) => ({
      providerId: id,
      dayOfWeek: dow,
      startTime: '00:00:00',
      endTime: '23:59:00',
    }));
  });
  await chunkInsert(providerAvailability, availabilityValues, db, 'do-nothing', 'availability');

  // 2. Olivia + her data --------------------------------------------------
  const [olivia] = await db.select().from(users).where(eq(users.cognitoSub, OLIVIA_COGNITO_SUB));
  if (!olivia) {
    console.log(
      `\n⚠ Olivia (cognitoSub=${OLIVIA_COGNITO_SUB}) not found. Sign in once via cognito-local then re-run.`,
    );
    return;
  }

  console.log('\n→ wiping Olivia\'s prior pets + bookings (cascade drops walks/messages)');
  // Order matters: recurring_series.pet_id has a FK without ON DELETE
  // CASCADE, so we have to drop the parent series rows before the pets
  // they reference. Bookings → walks/messages cascade via their own FKs.
  await db.delete(recurringSeries).where(eq(recurringSeries.ownerId, olivia.id));
  await db.delete(bookings).where(eq(bookings.ownerId, olivia.id));
  await db.delete(pets).where(eq(pets.ownerId, olivia.id));

  // Pets
  console.log('\n→ pets');
  const petValues = Array.from({ length: N_PETS }, (_, i) => {
    const p = buildPet(i);
    return {
      ownerId: olivia.id,
      name: p.name,
      breed: p.breed,
      weightKg: p.weightKg,
      ageYears: p.ageYears,
      notes: p.notes,
      photoUrl: p.photoUrl,
      species: 'dog',
    };
  });
  await chunkInsert(pets, petValues, db, undefined, 'pets');

  console.log('  loading pet ids');
  const oliviaPets = await db.select({ id: pets.id }).from(pets).where(eq(pets.ownerId, olivia.id));

  // Bookings — 50K across all statuses with weighted distribution
  console.log('\n→ bookings');
  const allOfferings = await db.select().from(providerServiceOfferings);
  const offeringsByProv = new Map<string, { serviceType: ServiceType; hourlyRateCents: number }[]>();
  for (const o of allOfferings) {
    const arr = offeringsByProv.get(o.providerId) ?? [];
    arr.push({ serviceType: o.serviceType as ServiceType, hourlyRateCents: o.hourlyRateCents });
    offeringsByProv.set(o.providerId, arr);
  }

  const allProviders = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`cognito_sub LIKE 'seed-prv-%'`);

  const now = Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  // Status distribution:
  //   pending      12%
  //   confirmed    20%
  //   in_progress   1%
  //   completed    50%
  //   cancelled    17%
  const bookingValues: (typeof bookings.$inferInsert)[] = [];
  for (let i = 0; i < N_BOOKINGS; i++) {
    const provider = pick(allProviders) as { id: string };
    const provOfferings = offeringsByProv.get(provider.id);
    if (!provOfferings || provOfferings.length === 0) continue;
    const offering = pick(provOfferings);
    const pet = pick(oliviaPets);
    const durationMin = pick([15, 30, 45, 60, 90, 120, 180]);
    const priceCents = Math.round(offering.hourlyRateCents * (durationMin / 60));

    const r = rng();
    let status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    let scheduledAt: Date;
    let cancelledBy: 'owner' | 'provider' | null = null;
    let cancelledAt: Date | null = null;
    let refundCents = 0;
    let providerFeeCents = 0;

    if (r < 0.12) {
      status = 'pending';
      scheduledAt = new Date(now + randInt(1, 30) * day + randInt(0, 1440) * minute);
    } else if (r < 0.32) {
      status = 'confirmed';
      scheduledAt = new Date(now + randInt(1, 60) * day + randInt(0, 1440) * minute);
    } else if (r < 0.33) {
      status = 'in_progress';
      scheduledAt = new Date(now - randInt(1, 30) * minute);
    } else if (r < 0.83) {
      status = 'completed';
      scheduledAt = new Date(now - randInt(1, 365) * day);
    } else {
      status = 'cancelled';
      scheduledAt = new Date(now - randInt(1, 90) * day);
      cancelledBy = rng() < 0.6 ? 'owner' : 'provider';
      cancelledAt = new Date(scheduledAt.getTime() - randInt(2, 48) * hour);
      refundCents = priceCents;
      if (cancelledBy === 'provider') {
        providerFeeCents = Math.round(priceCents * 0.15);
      }
    }

    bookingValues.push({
      ownerId: olivia.id,
      providerId: provider.id,
      petId: pet.id,
      serviceType: offering.serviceType,
      scheduledAt,
      durationMin,
      priceCents,
      notes: pick(BOOKING_NOTES),
      status,
      cancelledBy,
      cancelledAt,
      cancellationReason: cancelledBy ? pick(CANCELLATION_REASONS) : null,
      refundCents,
      appFeeCents: 0,
      providerFeeCents,
    });
  }
  await chunkInsert(bookings, bookingValues, db, undefined, 'bookings');

  // Walks for in_progress and ~30% of completed walking bookings
  console.log('\n→ walks');
  const allBookings = await db
    .select({
      id: bookings.id,
      providerId: bookings.providerId,
      serviceType: bookings.serviceType,
      status: bookings.status,
      scheduledAt: bookings.scheduledAt,
      durationMin: bookings.durationMin,
    })
    .from(bookings)
    .where(eq(bookings.ownerId, olivia.id));

  const walkRows: (typeof walks.$inferInsert)[] = [];
  for (const b of allBookings) {
    if (b.serviceType !== 'walking') continue;
    if (b.status === 'in_progress') {
      walkRows.push({
        bookingId: b.id,
        startedAt: new Date(now - 10 * minute),
        polyline: Array.from({ length: 5 }, (_, i) => ({
          lat: 40.7335 + i * 0.001,
          lng: -74.0027 - i * 0.0008,
          t: now - (5 - i) * 2 * minute,
        })),
      });
    } else if (b.status === 'completed' && rng() < 0.3) {
      const start = new Date(b.scheduledAt);
      const end = new Date(start.getTime() + b.durationMin * minute);
      walkRows.push({
        bookingId: b.id,
        startedAt: start,
        endedAt: end,
        polyline: Array.from({ length: 8 }, (_, i) => ({
          lat: 40.7128 + i * 0.001,
          lng: -74.006 - i * 0.0008,
          t: start.getTime() + (i * (end.getTime() - start.getTime())) / 7,
        })),
        distanceM: randInt(800, 3500),
      });
    }
  }
  await chunkInsert(walks, walkRows, db, 'do-nothing', 'walks');

  // Messages on ~25% of in-progress + completed bookings (any service type)
  console.log('\n→ messages');
  const messageRows: (typeof messages.$inferInsert)[] = [];
  for (const b of allBookings) {
    if (b.status !== 'in_progress' && b.status !== 'completed') continue;
    if (rng() > 0.25) continue;
    const numMsgs = randInt(2, 6);
    for (let i = 0; i < numMsgs; i++) {
      messageRows.push({
        bookingId: b.id,
        senderId: rng() < 0.5 ? olivia.id : b.providerId,
        body: pick(CHAT_LINES),
      });
    }
  }
  await chunkInsert(messages, messageRows, db, undefined, 'messages');

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✓ done in ${elapsed}s`);
  console.log(`  ${N_PROVIDERS} providers, ${oliviaPets.length} pets, ${bookingValues.length} bookings, ${walkRows.length} walks, ${messageRows.length} messages.`);
}

try {
  await main();
  process.exit(0);
} catch (err) {
  console.error('bulk-seed failed:', err);
  process.exit(1);
}

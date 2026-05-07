// CLI: `pnpm --filter @petwalker/backend db:seed`
//
// HEAVY dev seed — 1000 providers, 100 pets, 5000 bookings. Idempotent.
// Run after `make db-fresh` (or against an existing DB — Olivia's owner-side
// data is wiped first; provider-side data uses ON CONFLICT DO NOTHING).
//
// After it runs, sign in as `olivia@petwalker.test` (Password123!) and you'll
// see infinite-scroll-grade data on every screen: providers list paginates,
// bookings list spans every status with hundreds in each tab, search filters
// are actually meaningful.

import '../config/load-env.js';
import { eq, sql } from 'drizzle-orm';

import { createDb } from './client.js';
import {
  bookings,
  messages,
  pets,
  providerAvailability,
  providerServiceOfferings,
  serviceProviderProfiles,
  users,
  walks,
  type UserRow,
} from './schema/index.js';

const OLIVIA_COGNITO_SUB = 'b5f5ddb1-effd-4845-a8e6-052ec0140c0e';

const N_PROVIDERS = 1000;
const N_PETS = 100;
const N_BOOKINGS = 5000;
const BATCH = 200; // postgres-js bind-param ceiling: keep batches modest

// Service distribution per provider — weighted so most providers offer 1-2
// services with a long tail offering all 5.
const SERVICE_TYPES = ['walking', 'grooming', 'sitting', 'boarding', 'training'] as const;
type ServiceType = typeof SERVICE_TYPES[number];

const PRICES: Record<ServiceType, [number, number]> = {
  walking: [1500, 4500],
  grooming: [3000, 9000],
  sitting: [1800, 5000],
  boarding: [5000, 15000],
  training: [3500, 12000],
};

// NYC + extended area lat/lng bounding box (Tri-state casual radius)
const LAT_MIN = 40.55;
const LAT_MAX = 40.95;
const LNG_MIN = -74.25;
const LNG_MAX = -73.7;

const FIRST_NAMES = [
  'Alex', 'Jamie', 'Sam', 'Pat', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Quinn',
  'Avery', 'Blake', 'Cameron', 'Dakota', 'Emerson', 'Finley', 'Gray', 'Hayden', 'Indigo', 'Jules',
  'Kai', 'Logan', 'Marlowe', 'Nico', 'Oakley', 'Phoenix', 'Reese', 'Sage', 'Tatum', 'Wren',
  'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Oliver', 'Sophia', 'Elijah', 'Isabella', 'James',
  'Mia', 'William', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Theodore',
  'Abigail', 'Jack', 'Emily', 'Levi', 'Elizabeth', 'Sebastian', 'Mila', 'Mateo', 'Ella', 'Daniel',
  'Avery', 'Michael', 'Sofia', 'Ethan', 'Camila', 'Aiden', 'Aria', 'David', 'Scarlett', 'Joseph',
  'Lily', 'Jackson', 'Chloe', 'Owen', 'Nora', 'Carter', 'Madison', 'Leo', 'Hazel', 'Wyatt',
  'Layla', 'Asher', 'Aubrey', 'Hudson', 'Stella', 'Lincoln', 'Riley', 'Anthony', 'Zoey', 'Caleb',
];

const LAST_NAMES = [
  'Walker', 'Sitter', 'Groomer', 'Trainer', 'Boarder', 'Field', 'Park', 'Rivers', 'Hill', 'Lane',
  'Brook', 'Vale', 'Glen', 'Wood', 'Stone', 'Reed', 'Sloane', 'Reeves', 'Booker', 'Holt',
  'Cross', 'Quinn', 'Ortiz', 'Chen', 'Patel', 'Singh', 'Khan', 'Garcia', 'Lopez', 'Martinez',
  'Hernandez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
  'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Young',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hall', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell',
];

const BIO_TEMPLATES = [
  'Friendly and reliable {role} with {years} years of experience. {breeds} are my specialty.',
  'Certified {role}. Patient, calm, and great with {breeds}.',
  '{years} years caring for {breeds}. Background in animal behavior.',
  'Stay-at-home {role} — your dog gets undivided attention. Big yard, low-key vibes.',
  'Vet-tech background. Experienced with anxious or reactive {breeds}.',
  'Weekend and evening availability. Comfortable with {breeds} of all sizes.',
  'Professional {role} insured and bonded. {years} years on the job.',
  'I treat every dog like my own. {breeds} welcome.',
  'Local {role} — flexible schedule, quick turnaround. Love {breeds} especially.',
  'Boutique {role} service. Photo updates included with every visit.',
];

const ROLE_LABEL: Record<ServiceType, string> = {
  walking: 'walker',
  grooming: 'groomer',
  sitting: 'sitter',
  boarding: 'boarder',
  training: 'trainer',
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

// ────────────── deterministic PRNG (Mulberry32) for reproducible seeds ──────────────
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
const rng = mulberry32(42);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;
const randInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const randFloat = (lo: number, hi: number) => lo + rng() * (hi - lo);

interface ProviderSeed {
  cognitoSub: string;
  email: string;
  fullName: string;
  bio: string;
  baseLat: string;
  baseLng: string;
  serviceRadiusKm: string;
  offerings: { serviceType: ServiceType; hourlyRateCents: number }[];
}

function generateProviders(n: number): ProviderSeed[] {
  const out: ProviderSeed[] = [];
  const usedEmails = new Set<string>();
  for (let i = 0; i < n; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    let email = `${first}.${last}.${i}@petwalker.test`.toLowerCase();
    while (usedEmails.has(email)) email = `${first}.${last}.${i}.${randInt(0, 9999)}@petwalker.test`.toLowerCase();
    usedEmails.add(email);

    // Pick 1-5 services per provider, weighted toward 1-2
    const r = rng();
    const numServices = r < 0.4 ? 1 : r < 0.75 ? 2 : r < 0.92 ? 3 : r < 0.98 ? 4 : 5;
    const shuffled = [...SERVICE_TYPES].sort(() => rng() - 0.5).slice(0, numServices);
    const offerings = shuffled.map((s) => ({
      serviceType: s,
      hourlyRateCents: randInt(PRICES[s][0], PRICES[s][1]),
    }));
    const primary = shuffled[0]!;
    const bio = pick(BIO_TEMPLATES)
      .replace('{role}', ROLE_LABEL[primary])
      .replace('{years}', String(randInt(2, 18)))
      .replace('{breeds}', pick(BREED_FAMILIES));

    out.push({
      cognitoSub: `seed-prv-${String(i).padStart(4, '0')}`,
      email,
      fullName: `${first} ${last}`,
      bio,
      baseLat: randFloat(LAT_MIN, LAT_MAX).toFixed(6),
      baseLng: randFloat(LNG_MIN, LNG_MAX).toFixed(6),
      serviceRadiusKm: String(randInt(3, 30)),
      offerings,
    });
  }
  return out;
}

interface PetSeed {
  name: string;
  breed: string;
  weightKg: string;
  ageYears: string;
  notes: string | null;
}

function generatePets(n: number): PetSeed[] {
  const out: PetSeed[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      name: `${pick(PET_NAMES)}${i < PET_NAMES.length ? '' : '-' + i}`,
      breed: pick(PET_BREEDS),
      weightKg: randFloat(4, 45).toFixed(2),
      ageYears: randFloat(0.5, 14).toFixed(1),
      notes: pick(PET_NOTES),
    });
  }
  return out;
}

async function chunkInsert<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: T[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  conflict?: 'do-nothing',
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const q = db.insert(table).values(slice);
    await (conflict === 'do-nothing' ? q.onConflictDoNothing() : q);
  }
}

async function main(): Promise<void> {
  const db = createDb({ logger: false });
  console.log(`seeding heavy: ${N_PROVIDERS} providers, ${N_PETS} pets, ${N_BOOKINGS} bookings…`);

  // ---- generate everything in memory first --------------------------------
  const PROVIDERS = generateProviders(N_PROVIDERS);
  const PETS_GEN = generatePets(N_PETS);

  // ---- providers (idempotent via cognitoSub conflict) --------------------
  await chunkInsert(
    users,
    PROVIDERS.map((p) => ({
      cognitoSub: p.cognitoSub,
      email: p.email,
      role: 'provider' as const,
      fullName: p.fullName,
    })),
    db,
    'do-nothing',
  );
  console.log(`  ✓ users inserted`);

  // Pull back id<->cognitoSub map to attach profiles + offerings
  const providerRows = await db
    .select({ id: users.id, cognitoSub: users.cognitoSub })
    .from(users)
    .where(sql`cognito_sub LIKE 'seed-prv-%'`);
  const subToId = new Map(providerRows.map((r) => [r.cognitoSub, r.id]));

  const profileValues = PROVIDERS.flatMap((p) => {
    const id = subToId.get(p.cognitoSub);
    if (!id) return [];
    return [{
      userId: id,
      bio: p.bio,
      serviceRadiusKm: p.serviceRadiusKm,
      baseLat: p.baseLat,
      baseLng: p.baseLng,
    }];
  });
  await chunkInsert(serviceProviderProfiles, profileValues, db, 'do-nothing');
  console.log(`  ✓ profiles inserted`);

  const offeringValues = PROVIDERS.flatMap((p) => {
    const id = subToId.get(p.cognitoSub);
    if (!id) return [];
    return p.offerings.map((o) => ({
      providerId: id,
      serviceType: o.serviceType,
      hourlyRateCents: o.hourlyRateCents,
      active: true,
    }));
  });
  await chunkInsert(providerServiceOfferings, offeringValues, db, 'do-nothing');
  console.log(`  ✓ ${offeringValues.length} offerings inserted`);

  // Mon-Sun availability for everyone (00:00–23:59 UTC for the heaviest variety
  // — booking validation will accept anything inside that window).
  const availabilityValues = PROVIDERS.flatMap((p) => {
    const id = subToId.get(p.cognitoSub);
    if (!id) return [];
    return Array.from({ length: 7 }, (_, dow) => ({
      providerId: id,
      dayOfWeek: dow,
      startTime: '00:00:00',
      endTime: '23:59:00',
    }));
  });
  await chunkInsert(providerAvailability, availabilityValues, db, 'do-nothing');
  console.log(`  ✓ ${availabilityValues.length} availability slots inserted`);

  // ---- olivia ------------------------------------------------------------
  const [olivia] = await db.select().from(users).where(eq(users.cognitoSub, OLIVIA_COGNITO_SUB));
  if (!olivia) {
    console.log(
      `note: Olivia (cognitoSub=${OLIVIA_COGNITO_SUB}) not in DB yet — sign in once via cognito-local then re-run for pets+bookings.`,
    );
    return;
  }

  // ---- wipe Olivia's owner-side data (cascade drops walks + messages) ----
  await db.delete(bookings).where(eq(bookings.ownerId, olivia.id));
  await db.delete(pets).where(eq(pets.ownerId, olivia.id));

  // ---- pets --------------------------------------------------------------
  await chunkInsert(
    pets,
    PETS_GEN.map((p) => ({
      ownerId: olivia.id,
      name: p.name,
      breed: p.breed,
      weightKg: p.weightKg,
      ageYears: p.ageYears,
      notes: p.notes,
      species: 'dog',
    })),
    db,
  );
  const oliviaPets = await db.select().from(pets).where(eq(pets.ownerId, olivia.id));
  console.log(`  ✓ ${oliviaPets.length} pets inserted`);

  // ---- bookings — 5000 across all statuses --------------------------------
  // Status distribution (weighted to look real):
  //   pending       12%   - future
  //   confirmed     20%   - future
  //   in_progress    1%   - happening now
  //   completed     50%   - past
  //   cancelled     17%   - past, mix of owner + provider
  const allProviders = await db
    .select()
    .from(users)
    .where(sql`cognito_sub LIKE 'seed-prv-%'`);
  const allOfferings = await db.select().from(providerServiceOfferings);
  // index offerings by provider for fast lookup
  const offeringsByProv = new Map<string, { serviceType: ServiceType; hourlyRateCents: number }[]>();
  for (const o of allOfferings) {
    const arr = offeringsByProv.get(o.providerId) ?? [];
    arr.push({ serviceType: o.serviceType as ServiceType, hourlyRateCents: o.hourlyRateCents });
    offeringsByProv.set(o.providerId, arr);
  }

  const now = Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const bookingValues: (typeof bookings.$inferInsert)[] = [];
  for (let i = 0; i < N_BOOKINGS; i++) {
    const provider = pick(allProviders) as UserRow;
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
    let appFeeCents = 0;
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
      scheduledAt = new Date(now - randInt(1, 180) * day);
    } else {
      status = 'cancelled';
      scheduledAt = new Date(now - randInt(1, 60) * day);
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
      notes: rng() < 0.3 ? pick([
        'Please bring water bowl.',
        'He gets nervous around bicycles.',
        'Loves long walks!',
        'Senior dog — slow pace.',
        'Allergic to chicken.',
        null,
      ]) : null,
      status,
      cancelledBy,
      cancelledAt,
      cancellationReason: cancelledBy ? pick(['Schedule conflict', 'Sick dog', 'Family emergency', 'Weather']) : null,
      refundCents,
      appFeeCents,
      providerFeeCents,
    });
  }

  await chunkInsert(bookings, bookingValues, db);
  console.log(`  ✓ ${bookingValues.length} bookings inserted`);

  // ---- walks for in-progress + completed walking bookings ----------------
  const allBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.ownerId, olivia.id));
  const walkRows: (typeof walks.$inferInsert)[] = [];
  let walksAttached = 0;
  for (const b of allBookings) {
    if (b.serviceType !== 'walking') continue;
    if (b.status === 'in_progress') {
      const polyline = Array.from({ length: 5 }, (_, i) => ({
        lat: 40.7335 + i * 0.001,
        lng: -74.0027 - i * 0.0008,
        t: now - (5 - i) * 2 * minute,
      }));
      walkRows.push({
        bookingId: b.id,
        startedAt: new Date(now - 10 * minute),
        polyline,
      });
      walksAttached++;
    } else if (b.status === 'completed' && rng() < 0.4) {
      const start = new Date(b.scheduledAt);
      const end = new Date(start.getTime() + b.durationMin * minute);
      const polyline = Array.from({ length: 8 }, (_, i) => ({
        lat: 40.7128 + i * 0.001,
        lng: -74.006 - i * 0.0008,
        t: start.getTime() + (i * (end.getTime() - start.getTime())) / 7,
      }));
      walkRows.push({
        bookingId: b.id,
        startedAt: start,
        endedAt: end,
        polyline,
        distanceM: randInt(800, 3500),
      });
      walksAttached++;
    }
  }
  await chunkInsert(walks, walkRows, db, 'do-nothing');
  console.log(`  ✓ ${walksAttached} walks attached`);

  // ---- chat messages on a random sample of in-progress + completed walks --
  const messageRows: (typeof messages.$inferInsert)[] = [];
  const SAMPLE = ['Hey! On our way.', 'Got it 👍', 'Thanks for the update!',
    'All good — Mocha had a great time.', 'Be there in 5.', 'Just finished, photos coming.',
    'Heads up, traffic on the bridge.', 'No problem!', 'Pet ate well today.',
    'Walk was a bit shorter due to rain.'];
  for (const b of allBookings) {
    if (b.status !== 'in_progress' && b.status !== 'completed') continue;
    if (rng() > 0.3) continue; // only ~30% of qualifying bookings get chat
    const numMsgs = randInt(2, 6);
    for (let i = 0; i < numMsgs; i++) {
      const sender = rng() < 0.5 ? olivia.id : b.providerId;
      messageRows.push({
        bookingId: b.id,
        senderId: sender,
        body: pick(SAMPLE),
      });
    }
  }
  await chunkInsert(messages, messageRows, db);
  console.log(`  ✓ ${messageRows.length} messages attached`);

  console.log(`\nseed complete: ${PROVIDERS.length} providers, ${oliviaPets.length} pets, ${bookingValues.length} bookings, ${walksAttached} walks, ${messageRows.length} messages.`);
}

try {
  await main();
  process.exit(0);
} catch (err) {
  console.error('seed failed:', err);
  process.exit(1);
}

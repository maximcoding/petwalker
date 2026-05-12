import type { MockPet } from './types';

const OWNER_ID = 'me';

function years(ago: number, months = 0): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - ago);
  d.setMonth(d.getMonth() - months);
  return d;
}

export const PETS: MockPet[] = [
  {
    id: 'pet_001',
    ownerId: OWNER_ID,
    name: 'Bagel',
    photo: '/images/pets/bagel.jpg',
    species: 'dog',
    breed: 'Golden retriever',
    dob: years(3),
    weightKg: 28,
    sex: 'male',
    neutered: true,
    feeding: 'Twice a day, no chicken (mild allergy).',
    allergies: ['Chicken', 'Wheat'],
    behavior: ['Friendly with strangers', 'Pulls on the leash'],
  },
  {
    id: 'pet_002',
    ownerId: OWNER_ID,
    name: 'Pepper',
    photo: '/images/pets/pepper.jpg',
    species: 'dog',
    breed: 'French bulldog',
    dob: years(2, 4),
    weightKg: 11,
    sex: 'female',
    neutered: true,
    feeding: 'Three small meals + treats.',
    behavior: ['Snores loudly', 'Loves children'],
  },
  {
    id: 'pet_003',
    ownerId: OWNER_ID,
    name: 'Mochi',
    photo: '/images/pets/mochi.jpg',
    species: 'cat',
    breed: 'Ragdoll',
    dob: years(5),
    weightKg: 6.5,
    sex: 'female',
    neutered: true,
    feeding: 'Wet food morning, dry food evening.',
    medications: ['Joint supplement (Cosequin) — 1 chew daily'],
    behavior: ['Shy at first', 'Very affectionate after 10 min'],
  },
];

export const PETS_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p])) as Record<
  string,
  MockPet
>;

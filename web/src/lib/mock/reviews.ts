import type { MockReview, ServiceCategory } from './types';

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60_000);
}

function r(
  id: string,
  providerId: string,
  ownerName: string,
  stars: 1 | 2 | 3 | 4 | 5,
  body: string,
  serviceCategory: ServiceCategory,
  days: number,
  reply?: string,
): MockReview {
  return {
    id,
    bookingId: `b_review_${id}`,
    ownerName,
    stars,
    body,
    serviceCategory,
    createdAt: daysAgo(days),
    providerReply: reply ? { body: reply, createdAt: daysAgo(days - 1) } : undefined,
  };
}

// Keyed by provider id. Only a few providers populated — enough to
// exercise the reviews list UI on the detail page.
export const REVIEWS_BY_PROVIDER: Record<string, MockReview[]> = {
  p_001: [
    r('rv_001', 'p_001', 'Anna M.', 5, "Sara is brilliant with our reactive border collie. Took her time, sent photos mid-walk, never rushed.", 'walking', 4, 'Thank you Anna! Loki is a star.'),
    r('rv_002', 'p_001', 'Tom F.', 5, "Trained Bagel out of leash pulling in three sessions. The 'rock' check-in technique is gold.", 'training', 18),
    r('rv_003', 'p_001', 'Priya S.', 5, "Sat with Mochi while we were in Boston for a wedding. Photos every visit, water topped up, plant watered. ", 'sitting', 32),
  ],
  p_003: [
    r('rv_004', 'p_003', 'Cassie L.', 5, "Came right to our door in the van. Pepper hates baths but Jamie kept her calm the whole time.", 'grooming', 7),
    r('rv_005', 'p_003', 'Mike R.', 5, "Best groom my doodle has had. They got the puppy cut shape exactly right.", 'grooming', 22),
  ],
  p_012: [
    r('rv_006', 'p_012', 'Sofia D.', 5, "Oakley caught a missed pill in our med list — texted us, brought a backup. Absolute pro.", 'walking', 5),
    r('rv_007', 'p_012', 'Marc V.', 4, "Reliable and gentle with my 13-year-old lab. Slightly slow to respond at first but every walk since has been great.", 'seniorCare', 11),
  ],
};

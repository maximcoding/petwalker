-- Extend service_type enum with six new categories.
-- Each ADD VALUE runs as its own statement (Postgres requires this when
-- mixing with subsequent operations); the journal's breakpoints split them.

ALTER TYPE "service_type" ADD VALUE IF NOT EXISTS 'daycare';--> statement-breakpoint
ALTER TYPE "service_type" ADD VALUE IF NOT EXISTS 'photography';--> statement-breakpoint
ALTER TYPE "service_type" ADD VALUE IF NOT EXISTS 'massage_wellness';--> statement-breakpoint
ALTER TYPE "service_type" ADD VALUE IF NOT EXISTS 'senior_care';--> statement-breakpoint
ALTER TYPE "service_type" ADD VALUE IF NOT EXISTS 'veterinary';--> statement-breakpoint
ALTER TYPE "service_type" ADD VALUE IF NOT EXISTS 'fitness';

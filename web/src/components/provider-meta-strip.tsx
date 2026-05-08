'use client';

import { Calendar, MapPin, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  baseCity: string | null | undefined;
  experienceSinceYear: number | null | undefined;
  registeredAt: string;
  rating: number | null | undefined;
  reviewCount: number;
}

/** Format an ISO date as a short locale-aware "Mon YYYY". */
function formatMonthYear(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}

/**
 * Shared metadata strip used on the provider card and the detail page header.
 * Renders only the chips whose underlying field is populated, so a sparse
 * profile shows a concise row instead of empty placeholders.
 */
export function ProviderMetaStrip({
  baseCity,
  experienceSinceYear,
  registeredAt,
  rating,
  reviewCount,
}: Props): JSX.Element {
  const { t, i18n } = useTranslation();
  const memberSince = formatMonthYear(registeredAt, i18n.language);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
      {baseCity ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {baseCity}
        </span>
      ) : null}
      {experienceSinceYear ? (
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {t('providers.experienceSince', { year: experienceSinceYear })}
        </span>
      ) : null}
      {memberSince ? (
        <span className="inline-flex items-center gap-1">
          {t('providers.memberSince', { date: memberSince })}
        </span>
      ) : null}
      {rating != null && reviewCount > 0 ? (
        <span className="inline-flex items-center gap-1 text-amber-500">
          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
          <span>
            {rating.toFixed(1)}{' '}
            <span className="text-slate-500">
              ({t('providers.reviewCount', { count: reviewCount })})
            </span>
          </span>
        </span>
      ) : (
        <span className="text-slate-400">{t('providers.noReviewsYet')}</span>
      )}
    </div>
  );
}

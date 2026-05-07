'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, TextareaField } from '@/components/ui/field';
import { api } from '@/lib/api';
import { getBrowserLocation, SEED_LOCATION } from '@/lib/geolocation';

import type { UpsertServiceProviderProfileDto } from '@petwalker/shared/dto';
import type { ServiceProviderProfile } from '@petwalker/shared/types';

export function ServiceProfileSection(): JSX.Element {
  const qc = useQueryClient();

  const q = useQuery<ServiceProviderProfile | null>({
    queryKey: ['service-profile'],
    queryFn: () => api.users.getServiceProfile(),
  });

  const [bio, setBio] = useState('');
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setBio(q.data.bio ?? '');
    setRadiusKm(q.data.serviceRadiusKm ?? 10);
    setLat(q.data.baseLat != null ? String(q.data.baseLat) : '');
    setLng(q.data.baseLng != null ? String(q.data.baseLng) : '');
  }, [q.data]);

  const m = useMutation({
    mutationFn: (body: UpsertServiceProviderProfileDto) =>
      api.users.upsertServiceProfile(body),
    onSuccess: (next) => {
      qc.setQueryData(['service-profile'], next);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  async function useMyLocation(): Promise<void> {
    const c = (await getBrowserLocation()) ?? SEED_LOCATION;
    setLat(c.lat.toFixed(6));
    setLng(c.lng.toFixed(6));
  }

  if (q.isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const latNum = lat.trim() === '' ? null : Number(lat);
        const lngNum = lng.trim() === '' ? null : Number(lng);
        if ((latNum != null && Number.isNaN(latNum)) || (lngNum != null && Number.isNaN(lngNum))) {
          setError('Latitude / longitude must be numeric.');
          return;
        }
        m.mutate({
          bio: bio.trim() || null,
          serviceRadiusKm: radiusKm,
          baseLat: latNum,
          baseLng: lngNum,
        });
      }}
      className="space-y-4"
    >
      <TextareaField
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        hint="Owners see this on your profile page."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Service radius (km)"
          type="number"
          min={1}
          max={100}
          required
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
        />
        <Field
          label="Base latitude"
          type="number"
          step="0.000001"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <Field
          label="Base longitude"
          type="number"
          step="0.000001"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={() => void useMyLocation()}>
          Use my location
        </Button>
        <span className="text-xs text-slate-500">
          You can leave lat/lng empty until you’re ready to be discoverable.
        </span>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {m.isSuccess ? <p className="text-sm text-emerald-600">Saved.</p> : null}

      <Button type="submit" disabled={m.isPending}>
        {m.isPending ? 'Saving…' : 'Save provider profile'}
      </Button>
    </form>
  );
}

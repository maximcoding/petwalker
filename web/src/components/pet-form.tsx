'use client';

import { type FormEvent, useState } from 'react';

import { PetPhotoUploader } from './pet-photo-uploader';
import { Button } from './ui/button';
import { Field, TextareaField } from './ui/field';

import type { CreatePetDto } from '@petwalker/shared/dto';

export interface PetFormValues extends CreatePetDto {}

interface Props {
  initial?: Partial<PetFormValues>;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: PetFormValues) => void | Promise<void>;
  onCancel?: () => void;
}

const EMPTY: PetFormValues = {
  name: '',
  species: 'dog',
  breed: null,
  weightKg: null,
  ageYears: null,
  notes: null,
  photoUrl: null,
};

export function PetForm({
  initial,
  submitLabel = 'Save',
  busy,
  error,
  onSubmit,
  onCancel,
}: Props): JSX.Element {
  const [v, setV] = useState<PetFormValues>({ ...EMPTY, ...initial });

  function patch<K extends keyof PetFormValues>(k: K, val: PetFormValues[K]): void {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await onSubmit(v);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Name"
        required
        value={v.name}
        onChange={(e) => patch('name', e.target.value)}
      />
      <Field
        label="Species"
        value={v.species}
        onChange={(e) => patch('species', e.target.value)}
        hint="e.g. dog, cat"
      />
      <Field
        label="Breed"
        value={v.breed ?? ''}
        onChange={(e) => patch('breed', e.target.value || null)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Weight (kg)"
          type="number"
          step="0.1"
          min="0"
          value={v.weightKg ?? ''}
          onChange={(e) => patch('weightKg', e.target.value ? Number(e.target.value) : null)}
        />
        <Field
          label="Age (years)"
          type="number"
          step="0.1"
          min="0"
          value={v.ageYears ?? ''}
          onChange={(e) => patch('ageYears', e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <TextareaField
        label="Notes"
        value={v.notes ?? ''}
        onChange={(e) => patch('notes', e.target.value || null)}
        hint="Allergies, behaviour quirks, walking preferences…"
      />
      <PetPhotoUploader value={v.photoUrl ?? null} onChange={(url) => patch('photoUrl', url)} />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

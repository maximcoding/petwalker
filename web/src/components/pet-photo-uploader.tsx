'use client';

import type { AllowedImageMime } from '@petwalker/shared/dto';
import Image from 'next/image';
import { useState, type ChangeEvent } from 'react';

import { api } from '@/lib/api';

const ALLOWED: AllowedImageMime[] = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  value: string | null;
  onChange: (publicUrl: string | null) => void;
}

/**
 * Three-step S3 upload:
 *   1. POST /pets/photo-upload-url → get presigned PUT + publicUrl
 *   2. PUT bytes directly to S3 (MinIO in dev)
 *   3. Caller stores publicUrl in pets.photo_url via POST/PATCH /pets
 */
export function PetPhotoUploader({ value, onChange }: Props): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED.includes(file.type as AllowedImageMime)) {
      setErr(`Unsupported type ${file.type}. Allowed: ${ALLOWED.join(', ')}`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr(`File too large (${Math.round(file.size / 1024)} KB). Max 10 MB.`);
      return;
    }

    setBusy(true);
    try {
      const { uploadUrl, publicUrl, requiredHeaders } = await api.pets.requestPhotoUploadUrl({
        kind: 'pet-photo',
        mimeType: file.type as AllowedImageMime,
        sizeBytes: file.size,
      });
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: requiredHeaders,
      });
      if (!res.ok) throw new Error(`S3 PUT ${res.status}`);
      onChange(publicUrl);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">Photo</span>
      {value ? (
        <div className="flex items-start gap-3">
          <Image
            src={value}
            alt="Pet"
            width={120}
            height={120}
            className="h-30 w-30 rounded-lg object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : null}
      <input
        type="file"
        accept={ALLOWED.join(',')}
        onChange={onFile}
        disabled={busy}
        className="block w-full text-sm"
      />
      {busy ? <p className="text-xs text-slate-500">Uploading…</p> : null}
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </div>
  );
}

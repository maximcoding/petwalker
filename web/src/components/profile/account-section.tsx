'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { api } from '@/lib/api';

import type { UpdateUserDto } from '@petwalker/shared/dto';
import type { User } from '@petwalker/shared/types';

interface Props {
  me: User;
}

export function AccountSection({ me }: Props): JSX.Element {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(me.fullName ?? '');
  const [phone, setPhone] = useState(me.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? '');
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: (body: UpdateUserDto) => api.users.updateMe(body),
    onSuccess: (next) => {
      qc.setQueryData(['me'], next);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate({
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        });
      }}
      className="space-y-4"
    >
      <Field
        label="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Field
        label="Phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+15551234567"
      />
      <Field
        label="Avatar URL"
        type="url"
        value={avatarUrl}
        onChange={(e) => setAvatarUrl(e.target.value)}
        hint="Public URL to your profile photo (S3 upload UI coming later)."
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {m.isSuccess ? (
        <p className="text-sm text-emerald-600">Saved.</p>
      ) : null}
      <Button type="submit" disabled={m.isPending}>
        {m.isPending ? 'Saving…' : 'Save account'}
      </Button>
    </form>
  );
}

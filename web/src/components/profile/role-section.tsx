'use client';

import { UserRole } from '@petwalker/shared/enums';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

import type { User } from '@petwalker/shared/types';

interface Props {
  me: User;
}

const OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: UserRole.Owner, label: 'Owner', hint: 'I have pets and need services.' },
  { value: UserRole.Provider, label: 'Provider', hint: 'I provide services to other pet owners.' },
  { value: UserRole.Both, label: 'Both', hint: 'I do both.' },
];

export function RoleSection({ me }: Props): JSX.Element {
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: (role: UserRole) => api.users.updateMe({ role }),
    onSuccess: (next) => {
      qc.setQueryData(['me'], next);
      // Provider profile / offerings / availability sections depend on role.
      void qc.invalidateQueries({ queryKey: ['service-profile'] });
      void qc.invalidateQueries({ queryKey: ['offerings'] });
      void qc.invalidateQueries({ queryKey: ['availability'] });
    },
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {OPTIONS.map((opt) => {
        const active = me.role === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (!active) m.mutate(opt.value);
            }}
            disabled={m.isPending}
            className={[
              'rounded-2xl border p-4 text-left transition',
              active
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950'
                : 'border-slate-200 hover:border-slate-400 dark:border-slate-800',
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{opt.label}</span>
              {active ? (
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
                  current
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">{opt.hint}</p>
          </button>
        );
      })}
      <div className="sm:col-span-3">
        {m.error ? (
          <p className="text-sm text-red-600">{(m.error as Error).message}</p>
        ) : null}
        {m.isPending ? (
          <p className="text-sm text-slate-500">Switching role…</p>
        ) : null}
      </div>
    </div>
  );
}

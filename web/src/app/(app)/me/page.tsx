'use client';

import { useQuery } from '@tanstack/react-query';

import type { User } from '@petwalker/shared/types';

import { ScrollPage } from '@/components/scroll-page';
import { api } from '@/lib/api';

export default function MePage(): JSX.Element {
  const q = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  });

  return (
    <ScrollPage>
      {q.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : q.error ? (
        <p className="text-sm text-red-600">Error: {(q.error as Error).message}</p>
      ) : !q.data ? (
        <p className="text-sm text-slate-500">Not signed in.</p>
      ) : (
        <section>
          <h1 className="text-2xl font-semibold">Welcome, {q.data.fullName ?? q.data.email}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Role: <span className="font-mono">{q.data.role}</span>
          </p>
          <pre className="mt-6 overflow-auto rounded-lg bg-slate-50 p-4 text-xs dark:bg-slate-900">
            {JSON.stringify(q.data, null, 2)}
          </pre>
        </section>
      )}
    </ScrollPage>
  );
}

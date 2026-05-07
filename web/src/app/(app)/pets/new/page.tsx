'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PetForm, type PetFormValues } from '@/components/pet-form';
import { ScrollPage } from '@/components/scroll-page';
import { api } from '@/lib/api';

export default function NewPetPage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (values: PetFormValues) => api.pets.create(values),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['pets'] });
      router.push('/pets');
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <ScrollPage>
      <section className="mx-auto max-w-xl">
        <div className="mb-4">
          <Link href="/pets" className="text-sm text-slate-500 hover:underline">
            ← Back to pets
          </Link>
        </div>
        <h1 className="mb-6 text-2xl font-semibold">Add a pet</h1>
        <PetForm
          submitLabel="Create"
          busy={create.isPending}
          error={err}
          onSubmit={(values) => create.mutate(values)}
          onCancel={() => router.push('/pets')}
        />
      </section>
    </ScrollPage>
  );
}

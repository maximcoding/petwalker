'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PetForm, type PetFormValues } from '@/components/pet-form';
import { ScrollPage } from '@/components/scroll-page';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { PageLoading, Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { prettifyError } from '@/lib/prettify-error';

import type { Pet } from '@petwalker/shared/types';

export default function PetDetailPage(): JSX.Element {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useTranslation();
  const confirm = useConfirm();

  const q = useQuery<Pet>({
    queryKey: ['pets', id],
    queryFn: () => api.pets.get(id),
    enabled: Boolean(id),
  });

  const update = useMutation({
    mutationFn: (values: PetFormValues) => api.pets.update(id, values),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['pets'] });
      await qc.invalidateQueries({ queryKey: ['pets', id] });
      toast.success(t('toasts.saved'));
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  const remove = useMutation({
    mutationFn: () => api.pets.delete(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['pets'] });
      toast.success(t('toasts.deleted'));
      router.push('/pets');
    },
    onError: (e: Error) => toast.error(prettifyError(t, e)),
  });

  if (q.isLoading) {
    return (
      <ScrollPage>
        <PageLoading />
      </ScrollPage>
    );
  }
  if (q.error) {
    return (
      <ScrollPage>
        <ErrorState error={q.error as Error} onRetry={() => q.refetch()} />
      </ScrollPage>
    );
  }
  if (!q.data) {
    return (
      <ScrollPage>
        <p className="text-sm text-slate-500">{t('errors.notFound')}</p>
      </ScrollPage>
    );
  }

  const initial: Partial<PetFormValues> = {
    name: q.data.name,
    species: q.data.species,
    breed: q.data.breed,
    weightKg: q.data.weightKg,
    ageYears: q.data.ageYears,
    notes: q.data.notes,
    photoUrl: q.data.photoUrl,
  };

  async function onDelete(): Promise<void> {
    const ok = await confirm({
      title: t('confirms.deletePet', { name: q.data!.name }),
      body: t('confirms.deletePetBody'),
      destructive: true,
      confirmLabel: t('common.delete'),
    });
    if (ok) remove.mutate();
  }

  return (
    <ScrollPage>
      <section className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/pets" className="text-sm text-slate-500 hover:underline">
            ← {t('common.back')}
          </Link>
          <Button variant="danger" disabled={remove.isPending} onClick={onDelete}>
            {remove.isPending ? <Spinner size="sm" /> : t('common.delete')}
          </Button>
        </div>
        <h1 className="mb-6 text-2xl font-semibold">{q.data.name}</h1>
        <PetForm
          initial={initial}
          submitLabel={t('common.save')}
          busy={update.isPending}
          error={null}
          onSubmit={(values) => update.mutate(values)}
        />
      </section>
    </ScrollPage>
  );
}

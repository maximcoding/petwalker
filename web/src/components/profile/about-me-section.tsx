'use client';

import type { User } from '@petwalker/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { TextareaField } from '@/components/ui/field';
import { api } from '@/lib/api';
import { prettifyError } from '@/lib/prettify-error';


interface Props {
  me: User;
}

const MAX = 600;

/**
 * "About me" surfaces the user's bio. Read-only by default with an Edit
 * affordance — committing an inline textarea on every keystroke makes the
 * card feel like a half-finished form. Switching to edit mode also lets
 * us show the character counter without cluttering the read view.
 *
 * Persists via `api.users.updateMe({ aboutMe })`. Empty string is sent as
 * `null` so the column reverts to "no bio" rather than storing whitespace.
 */
export function AboutMeSection({ me }: Props): JSX.Element {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(me.aboutMe ?? '');

  const save = useMutation({
    mutationFn: (next: string) =>
      api.users.updateMe({ aboutMe: next.trim() === '' ? null : next.trim() }),
    onSuccess: (updated) => {
      qc.setQueryData(['me'], updated);
      void qc.invalidateQueries({ queryKey: ['me'] });
      setEditing(false);
      toast.success(t('common.saved'));
    },
    onError: (e: Error) => {
      toast.error(prettifyError(t, e));
    },
  });

  function handleCancel(): void {
    setDraft(me.aboutMe ?? '');
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        {me.aboutMe ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {me.aboutMe}
          </p>
        ) : (
          <p className="text-sm text-slate-400">{t('aboutMe.empty')}</p>
        )}
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {me.aboutMe ? t('common.edit') : t('aboutMe.add')}
        </Button>
      </div>
    );
  }

  const remaining = MAX - draft.length;
  const overLimit = remaining < 0;

  return (
    <div className="space-y-3">
      <TextareaField
        label={t('aboutMe.label')}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        maxLength={MAX + 50 /* allow paste-then-trim feedback */}
        placeholder={t('aboutMe.placeholder')}
      />
      <div className="flex items-center justify-between">
        <p
          className={`text-xs ${
            overLimit ? 'text-red-600' : 'text-slate-500'
          }`}
          aria-live="polite"
        >
          {t('aboutMe.charCount', { remaining })}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleCancel} disabled={save.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => save.mutate(draft)}
            disabled={save.isPending || overLimit}
          >
            {save.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Mode = 'social' | 'email' | 'magic' | 'phone';

import { AuthCard } from '@/components/ui/auth-card';
import { Divider } from '@/components/ui/divider';
import { Input } from '@/components/ui/input';
import { SocialButton } from '@/components/ui/social-button';
import { signIn } from '@/lib/auth';

/**
 * /sign-in — social-first auth entry.
 *
 * One sign-in surface for everyone. The earlier owner/walker pivot
 * was removed because the auth flow is identical for both audiences
 * (per Maxim 2026-05-12): the marketplace-side distinction lives in
 * post-auth onboarding (M2a #16), not on the auth screen.
 *
 * Default view shows three vertically-stacked social buttons as the
 * primary path. A small text link beneath them switches the same
 * card over to the email + password form — feels like a new screen
 * but happens in place (no route change) for a seamless transition.
 *
 * No Magic-link, no Phone-OTP in this PR. Email is hidden behind a
 * small link to keep the default surface social-first.
 */
export default function SignInPage(): JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  const [view, setView] = useState<'social' | 'email'>('social');
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Resend-cooldown helper. Counts down `resendIn` once per second.
  function startResendCooldown(): void {
    setResendIn(60);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Clean up any pending interval on unmount.
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    },
    [],
  );

  async function submitEmail(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.push('/home');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  function submitMagic(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // Real magic-link request will land in M-Backend-handshake. UI only here.
    setMagicSent(true);
    startResendCooldown();
  }

  function submitPhone(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setOtpSent(true);
    startResendCooldown();
  }

  function verifyOtp(submitted: string): void {
    // OTP verification stub — wire to Cognito SMS flow in M-Backend-handshake.
    if (submitted === '000000') {
      setErr(t('auth.otp.wrongCode', { defaultValue: "Code didn't work — try again." }));
      return;
    }
    router.push('/providers');
  }

  const heroSubtitle =
    mode === 'email'
      ? t('auth.modes.emailHint', { defaultValue: 'Use your email and password.' })
      : mode === 'magic'
        ? t('auth.modes.magicLinkHint', {
            defaultValue: "We'll email a magic link. Tap it to sign in — no password needed.",
          })
        : t('auth.modes.phoneHint', { defaultValue: "We'll text you a 6-digit code." });

  return (
    <AuthCard
      onBack={view === 'email' ? () => { setErr(null); setView('social'); } : undefined}
      backLabel={t('auth.backToOptions', { defaultValue: 'Back to sign-in options' })}
      headline={t('auth.welcomeTitle', { defaultValue: 'Welcome' })}
      subcopy={
        view === 'social'
          ? t('auth.welcomeSubtitle', {
              defaultValue: 'Sign in or create your account.',
            })
          : t('auth.modes.emailHint', {
              defaultValue: 'Use your email and password.',
            })
      }
      footer={
        <p className="text-center text-xs leading-relaxed text-ink-tertiary">
          {t('auth.agreementLead', {
            defaultValue: "By continuing, you agree to PetWalker's",
          })}{' '}
          <Link
            href="/terms"
            className="font-medium text-ink-link underline-offset-2 hover:underline"
          >
            {t('auth.termsOfService', { defaultValue: 'Terms of Service' })}
          </Link>{' '}
          {t('auth.agreementMid', {
            defaultValue: 'and to occasionally receive emails from us. Please read our',
          })}{' '}
          <Link
            href="/privacy"
            className="font-medium text-ink-link underline-offset-2 hover:underline"
          >
            {t('auth.privacyPolicy', { defaultValue: 'Privacy Policy' })}
          </Link>{' '}
          {t('auth.agreementTail', {
            defaultValue: 'to learn how we use your personal data.',
          })}
        </p>
      }
    >
      {view === 'social' && (
        <div className="min-h-[280px] space-y-6">
          {/* Three full-width social buttons — primary path. */}
          <div className="space-y-2">
            <SocialButton provider="google">
              {t('auth.googleCta', { defaultValue: 'Continue with Google' })}
            </SocialButton>
            <SocialButton provider="apple">
              {t('auth.appleCta', { defaultValue: 'Continue with Apple' })}
            </SocialButton>
            <SocialButton provider="facebook">
              {t('auth.facebookCta', { defaultValue: 'Continue with Facebook' })}
            </SocialButton>
          </div>

          <Divider>{t('auth.or', { defaultValue: 'or' })}</Divider>

          {/* Small secondary link — swaps the card over to the email form. */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setErr(null);
                setView('email');
              }}
              className="text-sm font-medium text-ink-link transition-colors hover:text-ink-link-hover"
            >
              {t('auth.continueWithEmailLink', {
                defaultValue: 'Continue with your email or username →',
              })}
            </button>
          </div>
        </div>
      )}

      {view === 'email' && (
        <div className="min-h-[280px] space-y-5">
          <form onSubmit={submitEmail} className="space-y-4">
            <Input
              label={t('auth.emailOrUsernameLabel', {
                defaultValue: 'Email or username',
              })}
              type="text"
              autoComplete="username"
              placeholder="you@petwalker.app or @yourname"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Input
              label={t('auth.passwordLabel', { defaultValue: 'Password' })}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-ink-link hover:underline"
              >
                {t('auth.forgotPassword', { defaultValue: 'Forgot password?' })}
              </Link>
            </div>
            {err && (
              <p
                role="alert"
                className="rounded-lg border border-coral-200 bg-coral-100 px-3 py-2 text-sm font-medium text-coral-700"
              >
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-base font-semibold text-ink-inverse transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {busy
                ? t('auth.signingIn', { defaultValue: 'Signing in…' })
                : t('auth.continue', { defaultValue: 'Continue' })}
              {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>
        </div>
      )}
    </AuthCard>
  );
}

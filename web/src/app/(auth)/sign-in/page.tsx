'use client';

import { ArrowRight, Link as LinkIcon, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthCard } from '@/components/ui/auth-card';
import { Divider } from '@/components/ui/divider';
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { SocialButton } from '@/components/ui/social-button';
import { Tabs } from '@/components/ui/tabs';
import { signIn } from '@/lib/auth';

type Mode = 'email' | 'magic' | 'phone';

/**
 * /sign-in — single unified entry point for new and returning users.
 *
 * Three mode tabs (Email, Magic link, Phone OTP) over one persistent
 * email-or-phone identity. Social buttons live below the divider.
 * /sign-up is collapsed into this same screen — see (auth)/sign-up.
 */
export default function SignInPage(): JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
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

  // Countdown for "Resend in Ns"
  useEffect(() => {
    if (resendIn <= 0) return;
    timerRef.current = window.setInterval(() => {
      setResendIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [resendIn]);

  function startResendCooldown(): void {
    setResendIn(30);
  }

  async function submitEmail(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signIn(email, password);
      router.push('/providers');
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
      headline={t('auth.welcomeTitle', { defaultValue: 'Welcome' })}
      subcopy={heroSubtitle}
      footer={
        <p className="text-center text-xs text-ink-tertiary">
          {t('auth.agreement', { defaultValue: 'By continuing you agree to our' })}{' '}
          <Link href="/terms" className="font-medium text-ink-link hover:underline">
            {t('auth.terms', { defaultValue: 'Terms' })}
          </Link>{' '}
          {t('auth.and', { defaultValue: 'and' })}{' '}
          <Link href="/privacy" className="font-medium text-ink-link hover:underline">
            {t('auth.privacy', { defaultValue: 'Privacy Policy' })}
          </Link>
          .
        </p>
      }
    >
      <Tabs
        ariaLabel={t('auth.modes.email', { defaultValue: 'Sign-in method' })}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setErr(null);
          setMagicSent(false);
          setOtpSent(false);
          setCode('');
        }}
        items={[
          {
            value: 'email',
            label: t('auth.modes.email', { defaultValue: 'Email' }),
            icon: <Mail className="h-4 w-4" aria-hidden />,
          },
          {
            value: 'magic',
            label: t('auth.modes.magicLink', { defaultValue: 'Magic link' }),
            icon: <LinkIcon className="h-4 w-4" aria-hidden />,
          },
          {
            value: 'phone',
            label: t('auth.modes.phone', { defaultValue: 'Phone' }),
            icon: <Smartphone className="h-4 w-4" aria-hidden />,
          },
        ]}
      />

      <div className="mt-6 space-y-4">
        {mode === 'email' && (
          <form onSubmit={submitEmail} className="space-y-4">
            <Input
              label={t('auth.emailLabel', { defaultValue: 'Email' })}
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder', { defaultValue: 'you@petwalker.app' })}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label={t('auth.passwordLabel', { defaultValue: 'Password' })}
              type="password"
              autoComplete="current-password"
              placeholder={t('auth.passwordPlaceholder', { defaultValue: '••••••••' })}
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
              {busy ? t('auth.signingIn', { defaultValue: 'Signing in…' }) : t('auth.continue', { defaultValue: 'Continue' })}
              {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>
        )}

        {mode === 'magic' && !magicSent && (
          <form onSubmit={submitMagic} className="space-y-4">
            <Input
              label={t('auth.emailLabel', { defaultValue: 'Email' })}
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder', { defaultValue: 'you@petwalker.app' })}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-base font-semibold text-ink-inverse transition-colors hover:bg-brand-700"
            >
              {t('auth.magic.sendCta', { defaultValue: 'Send me a link' })}
            </button>
          </form>
        )}

        {mode === 'magic' && magicSent && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-meadow text-ink-inverse">
              <Mail className="h-7 w-7" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold text-ink-primary">
              {t('auth.magic.sentHeadline', { defaultValue: 'Check your email' })}
            </h2>
            <p className="text-sm text-ink-secondary">
              {t('auth.magic.sentSubcopy', {
                defaultValue: 'We sent a sign-in link to {{email}}. It expires in 15 minutes.',
                email,
              })}
            </p>
            <button
              type="button"
              disabled={resendIn > 0}
              onClick={() => {
                setMagicSent(false);
                startResendCooldown();
              }}
              className="text-sm font-medium text-ink-link hover:underline disabled:opacity-60"
            >
              {resendIn > 0
                ? t('auth.otp.resendIn', { defaultValue: 'Resend in {{seconds}}s', seconds: resendIn })
                : t('auth.magic.resendCta', { defaultValue: 'Resend link' })}
            </button>
          </div>
        )}

        {mode === 'phone' && !otpSent && (
          <form onSubmit={submitPhone} className="space-y-4">
            <Input
              label={t('auth.phoneLabel', { defaultValue: 'Phone' })}
              type="tel"
              autoComplete="tel"
              placeholder={t('auth.phonePlaceholder', { defaultValue: '+1 (415) 555-0172' })}
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              prefix={<Smartphone className="h-4 w-4" aria-hidden />}
            />
            <button
              type="submit"
              className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-base font-semibold text-ink-inverse transition-colors hover:bg-brand-700"
            >
              {t('auth.continue', { defaultValue: 'Continue' })}
            </button>
          </form>
        )}

        {mode === 'phone' && otpSent && (
          <div className="space-y-4">
            <p className="text-center text-sm text-ink-secondary">
              {t('auth.otp.sentTo', { defaultValue: 'We sent a code to {{phone}}.', phone })}
            </p>
            <OtpInput
              ariaLabel={t('auth.otp.codeLabel', { defaultValue: '6-digit code' })}
              length={6}
              value={code}
              onChange={setCode}
              onComplete={verifyOtp}
              error={err}
              autoFocus
            />
            <div className="text-center">
              <button
                type="button"
                disabled={resendIn > 0}
                onClick={() => {
                  setCode('');
                  setErr(null);
                  startResendCooldown();
                }}
                className="text-sm font-medium text-ink-link hover:underline disabled:opacity-60"
              >
                {resendIn > 0
                  ? t('auth.otp.resendIn', { defaultValue: 'Resend in {{seconds}}s', seconds: resendIn })
                  : t('auth.otp.resendCta', { defaultValue: 'Resend code' })}
              </button>
            </div>
          </div>
        )}

        <Divider>{t('auth.continueWith', { defaultValue: 'or continue with' })}</Divider>

        <div className="grid grid-cols-3 gap-2">
          <SocialButton provider="google" compact aria-label={t('auth.googleCta', { defaultValue: 'Continue with Google' })} />
          <SocialButton provider="apple" compact aria-label={t('auth.appleCta', { defaultValue: 'Continue with Apple' })} />
          <SocialButton provider="facebook" compact aria-label={t('auth.facebookCta', { defaultValue: 'Continue with Facebook' })} />
        </div>
      </div>
    </AuthCard>
  );
}

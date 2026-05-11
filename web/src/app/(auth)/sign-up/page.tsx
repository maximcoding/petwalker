import { redirect } from 'next/navigation';

/**
 * /sign-up — per the brief there is no separate sign-up screen.
 * Same flow handles new and returning users. Redirect to /sign-in.
 *
 * Kept as its own route so deep-links into /sign-up don't break.
 */
export default function SignUpPage(): never {
  redirect('/sign-in');
}

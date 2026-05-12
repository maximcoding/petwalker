import { redirect } from 'next/navigation';

export default function SignUpPage(): never {
  redirect('/sign-in');
}

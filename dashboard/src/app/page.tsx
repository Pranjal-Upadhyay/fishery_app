import { redirect } from 'next/navigation';

/** Root just routes you into the dashboard; auth gate handles the rest. */
export default function Page() {
  redirect('/dashboard');
}

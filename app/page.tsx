import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige automáticamente al login al entrar a la raíz
  redirect('/login');
}
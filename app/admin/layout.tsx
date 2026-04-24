import { redirect } from 'next/navigation';
import { isAdminUser } from '@/lib/admin';

export const metadata = {
  title: 'لوحة الأدمن · ارتقاء',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await isAdminUser();
  if (!allowed) {
    redirect('/');
  }
  return <>{children}</>;
}

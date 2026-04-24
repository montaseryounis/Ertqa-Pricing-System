import { SignUp } from '@clerk/nextjs';

export const metadata = {
  title: 'إنشاء حساب · ارتقاء',
};

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <SignUp />
    </main>
  );
}

import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'تسجيل الدخول · ارتقاء',
};

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="ارتقاء"
            className="brand-logo"
            width={24}
            height={30}
          />
          <span className="brand-sub">ERTQA</span>
        </div>
        <h1 className="login-title">تسجيل دخول فريق المبيعات</h1>
        <p className="login-sub">أداة داخلية — للاستخدام من قبل فريق ارتقاء فقط</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

import Link from 'next/link';
import ChatKitPanel from '@/components/ChatKitPanel';
import ThemeToggle from '@/components/ThemeToggle';
import InteractiveSurface from '@/components/InteractiveSurface';
import { UserButton } from '@clerk/nextjs';
import { isAdminUser } from '@/lib/admin';

export default async function HomePage() {
  const isAdmin = await isAdminUser();

  return (
    <main className="page">
      <div className="topbar">
        <div className="topbar-start">
          <UserButton afterSignOutUrl="/sign-in" />
          {isAdmin && (
            <Link href="/admin" className="admin-pill">
              لوحة الأدمن
            </Link>
          )}
        </div>
        <ThemeToggle />
      </div>

      <header className="hero">
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
        <h1 className="hero-title">وكيل التسعير الذكي</h1>
        <p className="hero-sub">
          أداة داخلية لفريق المبيعات — تسعير الهدايا والجوائز المخصصة بسرعة ودقة.
        </p>
      </header>

      <InteractiveSurface
        className="chat-wrapper"
        tilt={1.5}
        ariaLabel="ChatKit"
      >
        <ChatKitPanel />
      </InteractiveSurface>

      <footer className="footer">
        <span>© {new Date().getFullYear()} ارتقاء · ERTQA</span>
        <a href="https://www.iertqa.com" target="_blank" rel="noreferrer">
          iertqa.com
        </a>
      </footer>
    </main>
  );
}

import ChatKitPanel from '@/components/ChatKitPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { UserButton } from '@clerk/nextjs';

export default function HomePage() {
  return (
    <main className="page">
      <div className="topbar">
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: 'w-10 h-10',
            },
          }}
        />
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

      <section className="chat-wrapper" aria-label="ChatKit">
        <ChatKitPanel />
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} ارتقاء · ERTQA</span>
        <a href="https://www.iertqa.com" target="_blank" rel="noreferrer">
          iertqa.com
        </a>
      </footer>
    </main>
  );
}

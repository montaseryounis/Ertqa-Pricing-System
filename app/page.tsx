import ChatKitPanel from '@/components/ChatKitPanel';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <main className="page">
      <div className="topbar">
        <ThemeToggle />
      </div>

      <header className="hero">
        <div className="brand">
          <span className="brand-name">ارتقاء</span>
          <span className="brand-sep">·</span>
          <span className="brand-sub">ERTQA</span>
        </div>
        <h1 className="hero-title">وكيل التسعير الذكي</h1>
        <p className="hero-sub">
          احصل على عرض سعر فوري لهداياك وجوائزك المخصصة — تصميم راقٍ وتصنيع حرفي
          بأعلى جودة.
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

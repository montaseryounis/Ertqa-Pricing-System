import LoginForm from './LoginForm';

export const metadata = {
  title: 'تسجيل الدخول · ارتقاء',
};

const FALLBACK_NAMES = [
  'موظف 1',
  'موظف 2',
  'موظف 3',
  'موظف 4',
  'موظف 5',
  'موظف 6',
  'موظف 7',
  'موظف 8',
  'موظف 9',
  'موظف 10',
];

function loadTeamNames(): string[] {
  const raw = process.env.SALES_TEAM_NAMES;
  if (!raw) return FALLBACK_NAMES;
  const parsed = raw
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : FALLBACK_NAMES;
}

export default function LoginPage() {
  const teamNames = loadTeamNames();
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand">
          <span className="brand-name">ارتقاء</span>
          <span className="brand-sep">·</span>
          <span className="brand-sub">ERTQA</span>
        </div>
        <h1 className="login-title">تسجيل دخول فريق المبيعات</h1>
        <p className="login-sub">أداة داخلية — للاستخدام من قبل فريق ارتقاء فقط</p>
        <LoginForm teamNames={teamNames} />
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import StatModal from './StatModal';
import AnimatedNumber from './AnimatedNumber';
import InteractiveSurface from '@/components/InteractiveSurface';

export type DailyBucket = { dateLabel: string; count: number };

export type EmployeeRow = {
  id: string;
  fullName: string | null;
  email: string;
  imageUrl: string | null;
  role: string;
  count: number;
  lastActivityLabel: string;
};

export type ConversationLite = {
  threadId: string | null;
  dateLabel: string;
  employeeName: string;
  customerName: string;
  quoteRef: string;
};

type Props = {
  totalCount: number;
  employeeCount: number;
  weekCount: number;
  todayCount: number;
  dailyCounts30: DailyBucket[];
  dailyCounts7: DailyBucket[];
  employees: EmployeeRow[];
  todayList: ConversationLite[];
  weekList: ConversationLite[];
};

type ModalKey = 'total' | 'employees' | 'week' | 'today';

export default function StatCards(props: Props) {
  const [open, setOpen] = useState<ModalKey | null>(null);
  const close = () => setOpen(null);

  return (
    <>
      <section className="admin-stats" aria-label="إحصائيات">
        <StatButton onClick={() => setOpen('total')}>
          <div className="stat-value">
            <AnimatedNumber value={props.totalCount} />
          </div>
          <div className="stat-label">إجمالي الجلسات</div>
        </StatButton>
        <StatButton onClick={() => setOpen('employees')}>
          <div className="stat-value">
            <AnimatedNumber value={props.employeeCount} />
          </div>
          <div className="stat-label">الموظفون</div>
        </StatButton>
        <StatButton onClick={() => setOpen('week')}>
          <div className="stat-value">
            <AnimatedNumber value={props.weekCount} />
          </div>
          <div className="stat-label">آخر 7 أيام</div>
        </StatButton>
        <StatButton onClick={() => setOpen('today')}>
          <div className="stat-value">
            <AnimatedNumber value={props.todayCount} />
          </div>
          <div className="stat-label">اليوم</div>
        </StatButton>
      </section>

      <StatModal
        open={open === 'total'}
        onClose={close}
        title="إجمالي الجلسات"
      >
        <p className="modal-summary">
          إجمالي <strong>{props.totalCount}</strong> جلسة عبر كل الوقت.
        </p>
        <BarChart data={props.dailyCounts30} caption="آخر 30 يوماً" />
      </StatModal>

      <StatModal
        open={open === 'employees'}
        onClose={close}
        title="الموظفون"
      >
        <EmployeesList employees={props.employees} />
      </StatModal>

      <StatModal
        open={open === 'week'}
        onClose={close}
        title="آخر 7 أيام"
      >
        <p className="modal-summary">
          <strong>{props.weekCount}</strong> جلسة خلال آخر أسبوع.
        </p>
        <BarChart data={props.dailyCounts7} caption="الجلسات اليومية" />
        <ConversationsList list={props.weekList} />
      </StatModal>

      <StatModal
        open={open === 'today'}
        onClose={close}
        title="محادثات اليوم"
      >
        <p className="modal-summary">
          <strong>{props.todayCount}</strong> جلسة بدأت اليوم.
        </p>
        <ConversationsList
          list={props.todayList}
          emptyMessage="لا توجد محادثات اليوم بعد."
        />
      </StatModal>
    </>
  );
}

function StatButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="stat-button-wrap">
      <InteractiveSurface className="stat stat-clickable" tilt={5}>
        {children}
      </InteractiveSurface>
    </button>
  );
}

function BarChart({
  data,
  caption,
}: {
  data: DailyBucket[];
  caption: string;
}) {
  if (data.length === 0) {
    return <p className="modal-empty">لا توجد بيانات.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const stride = data.length > 14 ? Math.ceil(data.length / 7) : 1;
  return (
    <div className="bar-chart">
      <div className="bar-chart-caption">{caption}</div>
      <div className="bars">
        {data.map((d, i) => {
          const h = (d.count / max) * 100;
          return (
            <div
              key={i}
              className={`bar-col ${d.count === 0 ? 'bar-col-empty' : ''}`}
              title={`${d.dateLabel}: ${d.count}`}
            >
              <div
                className="bar-fill"
                style={{ height: `${Math.max(h, 4)}%` }}
              />
              {d.count > 0 && <span className="bar-count">{d.count}</span>}
            </div>
          );
        })}
      </div>
      <div className="bar-labels">
        {data.map((d, i) => {
          const show = i % stride === 0 || i === data.length - 1;
          return (
            <span key={i} className="bar-label">
              {show ? d.dateLabel : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function EmployeesList({ employees }: { employees: EmployeeRow[] }) {
  if (employees.length === 0) {
    return <p className="modal-empty">لا يوجد موظفون مسجلون.</p>;
  }
  return (
    <ul className="modal-list">
      {employees.map((e) => (
        <li key={e.id} className="modal-list-item">
          <div className="modal-list-avatar">
            {e.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={e.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>
                {(e.fullName ?? e.email).slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="modal-list-body">
            <div className="modal-list-row">
              <span className="modal-list-name">
                {e.fullName ?? e.email}
              </span>
              <span className={`role-badge role-${e.role}`}>
                {e.role === 'admin' ? 'أدمن' : 'مبيعات'}
              </span>
            </div>
            <div className="modal-list-meta">
              {e.count} محادثة · {e.lastActivityLabel}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ConversationsList({
  list,
  emptyMessage = 'لا توجد محادثات في هذه الفترة.',
}: {
  list: ConversationLite[];
  emptyMessage?: string;
}) {
  if (list.length === 0) {
    return <p className="modal-empty">{emptyMessage}</p>;
  }
  return (
    <ul className="modal-conv-list">
      {list.map((c, i) => (
        <li key={i} className="modal-conv-item">
          <div className="modal-conv-row">
            <span className="modal-conv-date">{c.dateLabel}</span>
            {c.threadId && (
              <Link
                href={`/admin/thread/${c.threadId}`}
                className="modal-conv-link"
              >
                عرض المحادثة ←
              </Link>
            )}
          </div>
          <div className="modal-conv-meta">
            <span>
              <strong>الموظف:</strong> {c.employeeName}
            </span>
            <span>
              <strong>العميل:</strong> {c.customerName}
            </span>
            {c.quoteRef !== '—' && c.quoteRef && (
              <span className="modal-conv-ref">{c.quoteRef}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type ConversationRow = {
  threadId: string;
  dateLabel: string;
  employeeName: string;
  customerName: string;
  quoteRef: string;
  title: string;
  statusLabel: string;
  statusType: 'active' | 'locked' | 'closed';
};

type Props = {
  rows: ConversationRow[];
  heading: string;
  emptyMessage: string;
  errorMessage?: string | null;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export default function ConversationsTable({
  rows,
  heading,
  emptyMessage,
  errorMessage,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        normalize(r.title).includes(q) ||
        normalize(r.customerName).includes(q) ||
        normalize(r.employeeName).includes(q) ||
        normalize(r.quoteRef).includes(q)
      );
    });
  }, [rows, query]);

  const isEmpty = rows.length === 0;
  const noMatches = !isEmpty && filtered.length === 0;

  return (
    <section className="admin-table-wrap">
      <div className="admin-table-header">
        <h2>{heading}</h2>
        <span className="admin-subtle">
          {errorMessage
            ? errorMessage
            : query
            ? `تعرض ${filtered.length} من ${rows.length} محادثة`
            : `تعرض ${rows.length} محادثة (الحد الأقصى 100)`}
        </span>
      </div>

      {!isEmpty && !errorMessage && (
        <div className="search-bar">
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالعنوان، العميل، الموظف، أو رقم العرض..."
            className="search-input"
            aria-label="بحث في المحادثات"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="search-clear"
              aria-label="مسح البحث"
              title="مسح"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {isEmpty && !errorMessage ? (
        <div className="admin-empty">{emptyMessage}</div>
      ) : noMatches ? (
        <div className="admin-empty">
          لا توجد نتائج لـ «{query}». جرّب عبارة أخرى.
        </div>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الموظف</th>
                <th>العميل</th>
                <th>رقم العرض</th>
                <th>العنوان</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.threadId}>
                  <td>{r.dateLabel}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.customerName}</td>
                  <td className="quote-ref-cell">{r.quoteRef}</td>
                  <td>{r.title}</td>
                  <td>
                    <span className={`role-badge role-${r.statusType}`}>
                      {r.statusLabel}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/thread/${r.threadId}`}
                      className="admin-view-btn"
                    >
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

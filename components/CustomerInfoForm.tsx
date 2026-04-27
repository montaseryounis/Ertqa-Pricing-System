'use client';

import { useState } from 'react';

function generateQuoteRef(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ERTQA-${yy}${mm}${dd}-${random}`;
}

type Props = {
  onStart: (info: { customerName: string; quoteRef: string }) => void;
};

export default function CustomerInfoForm({ onStart }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [quoteRef, setQuoteRef] = useState(generateQuoteRef());
  const [submitting, setSubmitting] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = customerName.trim();
    if (!trimmed) return;
    setSubmitting(true);
    onStart({ customerName: trimmed, quoteRef: quoteRef.trim() });
  };

  return (
    <form onSubmit={submit} className="customer-form" aria-label="بيانات العميل">
      <div className="customer-form-header">
        <h2>ابدأ تسعير جديد</h2>
        <p>أدخل بيانات العميل لربط المحادثة بعرض السعر</p>
      </div>

      <label className="field">
        <span>اسم العميل أو الشركة</span>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="مثال: شركة أرامكو السعودية"
          autoFocus
          required
        />
      </label>

      <label className="field">
        <span>رقم عرض السعر</span>
        <div className="ref-row">
          <input
            type="text"
            value={quoteRef}
            onChange={(e) => setQuoteRef(e.target.value)}
            dir="ltr"
            className="ref-input"
          />
          <button
            type="button"
            onClick={() => setQuoteRef(generateQuoteRef())}
            className="ref-regen"
            title="توليد رقم جديد"
            aria-label="توليد رقم جديد"
          >
            ↻
          </button>
        </div>
        <span className="field-hint">يُولَّد تلقائياً — يمكنك تعديله</span>
      </label>

      <button
        type="submit"
        disabled={submitting || !customerName.trim()}
        className="customer-form-submit"
      >
        {submitting ? 'جارٍ البدء...' : 'ابدأ المحادثة ←'}
      </button>
    </form>
  );
}

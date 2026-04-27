'use client';

import { useEffect, useState } from 'react';
import CustomerInfoForm from './CustomerInfoForm';
import ChatKitPanel from './ChatKitPanel';
import InteractiveSurface from './InteractiveSurface';

const STORAGE_KEY = 'ertqa_current_quote';

type QuoteInfo = {
  customerName: string;
  quoteRef: string;
  startedAt: number;
};

export default function ChatExperience() {
  const [info, setInfo] = useState<QuoteInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as QuoteInfo;
        if (parsed?.customerName && parsed?.quoteRef) {
          setInfo(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleStart = (next: { customerName: string; quoteRef: string }) => {
    const full: QuoteInfo = { ...next, startedAt: Date.now() };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch {
      // ignore quota errors
    }
    setInfo(full);
  };

  const handleNewChat = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setInfo(null);
  };

  if (!hydrated) {
    // Reserve the space so the layout doesn't jump on hydration.
    return <div className="chat-wrapper chat-wrapper-loading" aria-busy="true" />;
  }

  if (!info) {
    return (
      <InteractiveSurface
        className="chat-wrapper chat-wrapper-form"
        tilt={1.5}
        ariaLabel="بداية تسعير"
      >
        <CustomerInfoForm onStart={handleStart} />
      </InteractiveSurface>
    );
  }

  return (
    <>
      <div className="quote-meta" aria-label="بيانات العرض الحالي">
        <div className="quote-meta-item">
          <span className="quote-meta-label">العميل</span>
          <span className="quote-meta-value">{info.customerName}</span>
        </div>
        <div className="quote-meta-item">
          <span className="quote-meta-label">رقم العرض</span>
          <span className="quote-meta-value quote-meta-ref">{info.quoteRef}</span>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="new-chat-btn"
          title="ابدأ تسعيراً جديداً"
        >
          + تسعير جديد
        </button>
      </div>
      <InteractiveSurface
        className="chat-wrapper"
        tilt={1.5}
        ariaLabel="ChatKit"
      >
        <ChatKitPanel
          customerName={info.customerName}
          quoteRef={info.quoteRef}
        />
      </InteractiveSurface>
    </>
  );
}

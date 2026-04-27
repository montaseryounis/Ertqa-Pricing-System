'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';

type Theme = 'light' | 'dark';

const DEVICE_ID_KEY = 'ertqa_chatkit_device_id';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device_${crypto.randomUUID()}`;
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

type Props = {
  customerName?: string;
  quoteRef?: string;
};

export default function ChatKitPanel({ customerName, quoteRef }: Props) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const current =
      (document.documentElement.dataset.theme as Theme) || 'light';
    setTheme(current);
    const onChange = (event: Event) => {
      setTheme((event as CustomEvent<Theme>).detail);
    };
    window.addEventListener('ertqa:theme-change', onChange);
    return () => window.removeEventListener('ertqa:theme-change', onChange);
  }, []);

  const getClientSecret = useCallback(async () => {
    const response = await fetch('/api/chatkit/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getOrCreateDeviceId(),
        customerName,
        quoteRef,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`ChatKit session failed: ${message}`);
    }

    const data = (await response.json()) as { client_secret: string };
    return data.client_secret;
  }, [customerName, quoteRef]);

  const greeting = customerName
    ? `مرحباً — تسعير لـ${customerName}. كيف يمكنني مساعدتك؟`
    : 'مرحباً بك في وكيل ارتقاء الذكي — كيف يمكنني مساعدتك';

  const { control } = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: theme,
      color: {
        accent: { primary: '#B38A3F', level: 1 },
      },
      radius: 'round',
    },
    startScreen: {
      greeting,
      prompts: [],
    },
    composer: {
      placeholder: 'اكتب طلبك هنا أو ارفع صورة...',
      attachments: {
        enabled: true,
        maxCount: 5,
        maxSize: 10 * 1024 * 1024,
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic'],
          'application/pdf': ['.pdf'],
        },
      },
    },
  });

  return <ChatKit control={control} className="chatkit" />;
}

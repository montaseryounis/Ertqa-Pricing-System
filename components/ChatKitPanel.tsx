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

export default function ChatKitPanel() {
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
      body: JSON.stringify({ deviceId: getOrCreateDeviceId() }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`ChatKit session failed: ${message}`);
    }

    const data = (await response.json()) as { client_secret: string };
    return data.client_secret;
  }, []);

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
      greeting:
        'مرحباً بك في ارتقاء — كيف يمكنني مساعدتك في تسعير هديتك أو جائزتك المخصصة؟',
      prompts: [],
    },
    composer: {
      placeholder: 'اكتب طلبك هنا...',
    },
  });

  return <ChatKit control={control} className="chatkit" />;
}

import type { Metadata } from 'next';
import Script from 'next/script';
import { ClerkProvider } from '@clerk/nextjs';
import { arSA } from '@clerk/localizations';
import { Analytics } from '@vercel/analytics/react';
import AuroraBackground from '@/components/AuroraBackground';
import './globals.css';
import './effects.css';
import './typewriter.css';
import './modal.css';
import './aurora.css';

export const metadata: Metadata = {
  title: 'ارتقاء · وكيل التسعير الذكي',
  description:
    'أداة داخلية لفريق مبيعات ارتقاء — تسعير الهدايا والجوائز المخصصة بدقة وسرعة.',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#1B211A' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('ertqa_theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      localization={arSA}
      appearance={{
        variables: {
          colorPrimary: '#B38A3F',
          fontFamily: 'Tajawal, sans-serif',
          borderRadius: '12px',
        },
      }}
    >
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin=""
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap"
            rel="stylesheet"
          />
          <Script
            src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
            strategy="beforeInteractive"
          />
        </head>
        <body>
          <AuroraBackground />
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}

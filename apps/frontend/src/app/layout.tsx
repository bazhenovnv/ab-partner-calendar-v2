import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Montserrat } from 'next/font/google';
import './globals.css';
import './stage60-visual.css';
import './stage61-visual.css';
import './stage62-scale-quotes-footer.css';
import './stage63-final-alignment.css';
import './stage64-figma-lock.css';
import './stage65-centering-carousel-footer.css';
import './stage66-approved-quote-frame.css';
import './stage67-final-spacing-footer.css';
import CookieBannerGate from '@/components/CookieBannerGate';
import { MetrikaPageview } from '@/components/MetrikaPageview';

const montserrat = Montserrat({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ab-event.pro';
const METRIKA_ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ?? '110270689';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'АБ Афиша Бухгалтера — Главные мероприятия для бухгалтеров',
    template: '%s | АБ Афиша Бухгалтера',
  },
  description:
    'Онлайн и офлайн события для профессионального роста, обмена опытом и актуальной практики бухгалтеров по всей России.',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE_URL,
    siteName: 'АБ Афиша Бухгалтера',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'АБ Афиша Бухгалтера — Главные мероприятия для бухгалтеров',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'АБ Афиша Бухгалтера',
    description:
      'Онлайн и офлайн события для профессионального роста бухгалтеров по всей России.',
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={montserrat.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
  k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
ym(${METRIKA_ID},'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',accurateTrackBounce:true,trackLinks:true});
`,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-to-content">
          Перейти к содержимому
        </a>
        <noscript>
          <div>
            <img
              src={`https://mc.yandex.ru/watch/${METRIKA_ID}`}
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
        {children}
        <Suspense fallback={null}>
          <MetrikaPageview />
        </Suspense>
        <CookieBannerGate />
      </body>
    </html>
  );
}

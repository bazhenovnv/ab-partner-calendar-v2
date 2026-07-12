'use client';

import { useState, useEffect } from 'react';

export type PublicQuote = {
  id: string;
  text: string;
  author: string;
};

interface Props {
  quotes: PublicQuote[];
}

function QuotesDecorLeft() {
  return (
    <svg
      className="quotes-decor quotes-decor--left"
      viewBox="0 0 180 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Large open book */}
      <rect x="20" y="80" width="70" height="90" rx="4" fill="#E8F7F2" stroke="#7CD8B3" strokeWidth="1.5"/>
      <rect x="90" y="80" width="70" height="90" rx="4" fill="#F0FBFF" stroke="#7CD8B3" strokeWidth="1.5"/>
      {/* Book spine */}
      <rect x="86" y="78" width="8" height="94" rx="2" fill="#7CD8B3" opacity="0.6"/>
      {/* Lines on left page */}
      <line x1="30" y1="100" x2="82" y2="100" stroke="#7CD8B3" strokeWidth="1.2" strokeOpacity="0.5"/>
      <line x1="30" y1="112" x2="82" y2="112" stroke="#7CD8B3" strokeWidth="1.2" strokeOpacity="0.5"/>
      <line x1="30" y1="124" x2="82" y2="124" stroke="#7CD8B3" strokeWidth="1.2" strokeOpacity="0.5"/>
      <line x1="30" y1="136" x2="82" y2="136" stroke="#7CD8B3" strokeWidth="1.2" strokeOpacity="0.5"/>
      <line x1="30" y1="148" x2="65" y2="148" stroke="#7CD8B3" strokeWidth="1.2" strokeOpacity="0.5"/>
      {/* Lines on right page */}
      <line x1="98" y1="100" x2="150" y2="100" stroke="#0D2344" strokeWidth="1.2" strokeOpacity="0.12"/>
      <line x1="98" y1="112" x2="150" y2="112" stroke="#0D2344" strokeWidth="1.2" strokeOpacity="0.12"/>
      <line x1="98" y1="124" x2="150" y2="124" stroke="#0D2344" strokeWidth="1.2" strokeOpacity="0.12"/>
      <line x1="98" y1="136" x2="140" y2="136" stroke="#0D2344" strokeWidth="1.2" strokeOpacity="0.12"/>
      {/* Pen */}
      <rect x="130" y="150" width="8" height="50" rx="2" transform="rotate(-25 130 150)" fill="#0D2344" opacity="0.7"/>
      <polygon points="126,194 134,194 130,204" fill="#7CD8B3"/>
      {/* Small decorative circles */}
      <circle cx="30" cy="55" r="10" fill="#7CD8B3" opacity="0.18"/>
      <circle cx="155" cy="50" r="6" fill="#0D2344" opacity="0.08"/>
      <circle cx="15" cy="185" r="7" fill="#7CD8B3" opacity="0.22"/>
      <circle cx="165" cy="195" r="4" fill="#0D2344" opacity="0.08"/>
      {/* Stars/sparkles */}
      <path d="M145 55 L147 50 L149 55 L154 57 L149 59 L147 64 L145 59 L140 57 Z" fill="#7CD8B3" opacity="0.5"/>
      <path d="M25 210 L26.5 206 L28 210 L32 211.5 L28 213 L26.5 217 L25 213 L21 211.5 Z" fill="#7CD8B3" opacity="0.4"/>
      {/* Bookmark */}
      <path d="M148 80 L156 80 L156 100 L152 96 L148 100 Z" fill="#0D2344" opacity="0.15"/>
    </svg>
  );
}

function QuotesDecorRight() {
  return (
    <svg
      className="quotes-decor quotes-decor--right"
      viewBox="0 0 180 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Stack of books */}
      <rect x="30" y="150" width="100" height="18" rx="3" fill="#0D2344" opacity="0.75"/>
      <rect x="22" y="132" width="110" height="18" rx="3" fill="#7CD8B3" opacity="0.8"/>
      <rect x="35" y="114" width="90" height="18" rx="3" fill="#0D2344" opacity="0.55"/>
      <rect x="28" y="96" width="105" height="18" rx="3" fill="#E8F7F2" stroke="#7CD8B3" strokeWidth="1"/>
      {/* Book spines labels */}
      <rect x="30" y="152" width="30" height="14" rx="1" fill="#7CD8B3" opacity="0.3"/>
      <rect x="22" y="134" width="25" height="14" rx="1" fill="white" opacity="0.25"/>
      {/* Graduation cap */}
      <rect x="60" y="62" width="46" height="6" rx="1" fill="#0D2344" opacity="0.6"/>
      <polygon points="83,42 105,62 83,72 61,62" fill="#0D2344" opacity="0.55"/>
      <line x1="105" y1="62" x2="105" y2="80" stroke="#0D2344" strokeWidth="2" strokeOpacity="0.45"/>
      <circle cx="105" cy="82" r="3" fill="#7CD8B3" opacity="0.7"/>
      {/* Small decorative elements */}
      <circle cx="20" cy="75" r="8" fill="#7CD8B3" opacity="0.15"/>
      <circle cx="158" cy="110" r="6" fill="#0D2344" opacity="0.08"/>
      <circle cx="25" cy="200" r="5" fill="#7CD8B3" opacity="0.2"/>
      <circle cx="160" cy="185" r="9" fill="#0D2344" opacity="0.06"/>
      {/* Stars/sparkles */}
      <path d="M22 115 L23.5 111 L25 115 L29 116.5 L25 118 L23.5 122 L22 118 L18 116.5 Z" fill="#7CD8B3" opacity="0.5"/>
      <path d="M148 65 L149.5 61 L151 65 L155 66.5 L151 68 L149.5 72 L148 68 L144 66.5 Z" fill="#7CD8B3" opacity="0.4"/>
      {/* Dots pattern */}
      <circle cx="148" cy="188" r="2.5" fill="#7CD8B3" opacity="0.4"/>
      <circle cx="158" cy="195" r="2" fill="#7CD8B3" opacity="0.3"/>
      <circle cx="152" cy="202" r="1.5" fill="#7CD8B3" opacity="0.25"/>
    </svg>
  );
}

export function RotatingQuotesBlock({ quotes }: Props) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (quotes.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % quotes.length);
        setVisible(true);
      }, 350);
    }, 5000);
    return () => clearInterval(timer);
  }, [quotes.length]);

  if (!quotes.length) return null;

  const q = quotes[idx];

  return (
    <section className="quotes-section" aria-labelledby="quotes-title">
      <h2 id="quotes-title" className="sr-only">Цитаты для бухгалтеров</h2>
      <div className="quotes-inner">
        <QuotesDecorLeft />
        <div className="quotes-card">
          <div className="quotes-header">
            <span className="quotes-eyebrow">Цитаты</span>
          </div>
          <div className={`quotes-body ${visible ? 'quotes-visible' : 'quotes-hidden'}`}>
            <blockquote className="quotes-blockquote">
              <span className="quotes-mark" aria-hidden="true">&ldquo;</span>
              <p className="quotes-text">{q.text}</p>
              {q.author && <footer className="quotes-author">— {q.author}</footer>}
            </blockquote>
          </div>
          {quotes.length > 1 && (
            <div className="quotes-dots" role="tablist" aria-label="Переключение цитат">
              {quotes.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === idx}
                  aria-label={`Цитата ${i + 1}`}
                  className={`quotes-dot ${i === idx ? 'quotes-dot-active' : ''}`}
                  onClick={() => {
                    setVisible(false);
                    setTimeout(() => { setIdx(i); setVisible(true); }, 350);
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <QuotesDecorRight />
      </div>
    </section>
  );
}

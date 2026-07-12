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
      </div>
    </section>
  );
}

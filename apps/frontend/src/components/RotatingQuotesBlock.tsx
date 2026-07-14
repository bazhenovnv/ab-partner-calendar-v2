'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import personLeftImg from '../../public/quote-person-left.png';
import personRightImg from '../../public/quote-person-right.png';

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
      }, 400);
    }, 10000);
    return () => clearInterval(timer);
  }, [quotes.length]);

  if (!quotes.length) return null;

  const q = quotes[idx];

  return (
    <section className="quotes-section" aria-labelledby="quotes-title">
      <h2 id="quotes-title" className="sr-only">Цитаты для бухгалтеров</h2>
      <div className="quotes-layout">
        <div className="quotes-person quotes-person-left" aria-hidden="true">
          <Image
            src={personLeftImg}
            alt=""
            width={181}
            height={217}
            className="quotes-person-img quotes-person-img--left"
            aria-hidden
          />
        </div>

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
        </div>

        <div className="quotes-person quotes-person-right" aria-hidden="true">
          <Image
            src={personRightImg}
            alt=""
            width={172}
            height={215}
            className="quotes-person-img quotes-person-img--right"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

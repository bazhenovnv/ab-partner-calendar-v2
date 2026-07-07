import Link from 'next/link';

const TG_CHANNEL = 'https://t.me/ab_afisha_buh';

export function HeroSection() {
  return (
    <section className="hero-section" aria-label="Добро пожаловать">
      <div className="hero-inner">
        <div className="hero-badge">Бухгалтерские мероприятия</div>
        <h1 className="hero-title">
          АБ Афиша <span className="hero-title-accent">Бухгалтера</span>
        </h1>
        <p className="hero-subtitle">
          Мероприятия, вебинары и важные события для бухгалтеров&nbsp;—
          в&nbsp;одном удобном календаре
        </p>
        <div className="hero-cta-row">
          <a href="#events" className="hero-btn-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="4" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 2v4M11 2v4M2 8h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Смотреть мероприятия
          </a>
          <a
            href={TG_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-btn-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.771 4.16 12.87c-.635-.197-.648-.635.136-.937l11.083-4.274c.53-.194.994.13.515.562z" />
            </svg>
            Получать напоминания
          </a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-icon">📅</span>
            <span>Онлайн и офлайн</span>
          </div>
          <div className="hero-stat-divider" aria-hidden="true" />
          <div className="hero-stat">
            <span className="hero-stat-icon">🔔</span>
            <span>Напоминания в Telegram</span>
          </div>
          <div className="hero-stat-divider" aria-hidden="true" />
          <div className="hero-stat">
            <span className="hero-stat-icon">🆓</span>
            <span>Бесплатно и платно</span>
          </div>
        </div>
      </div>

      {/* decorative shapes */}
      <div className="hero-deco hero-deco-1" aria-hidden="true" />
      <div className="hero-deco hero-deco-2" aria-hidden="true" />
    </section>
  );
}

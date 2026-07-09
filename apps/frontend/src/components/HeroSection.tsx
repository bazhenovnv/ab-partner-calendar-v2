import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="pub-hero" aria-label="Главные мероприятия для бухгалтеров">
      <div className="pub-hero-inner">
        <div className="pub-hero-content">
          <h1 className="pub-hero-title">
            Главные мероприятия для бухгалтеров
            <span className="pub-hero-geo"> по всей России</span>
          </h1>
          <p className="pub-hero-sub">
            Онлайн и офлайн события для профессионального роста,
            обмена опытом и актуальной практики
          </p>
          <a href="#events" className="pub-hero-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="2" y="3.5" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 2v3M11 2v3M2 7.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Главные события
          </a>
        </div>
        <div className="pub-hero-visual" aria-hidden="true">
          <Image
            src="/hero-composition.png"
            alt=""
            width={693}
            height={323}
            priority
            className="pub-hero-img"
          />
        </div>
      </div>
    </section>
  );
}

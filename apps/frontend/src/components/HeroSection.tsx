import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="pub-hero" aria-label="Главные мероприятия для бухгалтеров">
      <div className="pub-hero-panel">
        <div className="pub-hero-content">
          <h1 className="pub-hero-title">
            Главные мероприятия для бухгалтеров по всей России
          </h1>
          <p className="pub-hero-sub">
            Онлайн и офлайн события для профессионального роста,
            <br />
            обмена опытом и актуальной практики
          </p>
          <a href="#main-events" className="pub-hero-btn">
            Главные события →
          </a>
        </div>

        <div className="pub-hero-visual" aria-hidden="true">
          <Image
            src="/hero-books-approved.png"
            alt=""
            width={738}
            height={323}
            priority
            className="pub-hero-books"
          />
          <Image
            src="/hero-calendar-approved.png"
            alt=""
            width={252}
            height={249}
            priority
            className="pub-hero-calendar"
          />
        </div>
      </div>
    </section>
  );
}

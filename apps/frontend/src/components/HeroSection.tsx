import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="pub-hero" aria-label="Главные мероприятия для бухгалтеров">
      {/* pub-hero-panel: Figma {DB7079EA} 1495×323px, radius 28.3, border 1px Inside, shadow 0/4/4/0 25% */}
      <div className="pub-hero-panel">
        <div className="pub-hero-content">
          <h1 className="pub-hero-title">
            Главные мероприятия для бухгалтеров по всей России
          </h1>
          <p className="pub-hero-sub">
            Онлайн и офлайн события для профессионального роста,
            обмена опытом и актуальной практики
          </p>
          {/* Button: text "Важные события →" {R-21}, bg mint #7CD8B3 {R-22}, color #0D2344 {R-23}, no icon {R-24} */}
          <a href="#events" className="pub-hero-btn">
            Важные события →
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

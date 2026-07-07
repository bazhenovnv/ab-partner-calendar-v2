const steps = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="22" height="19" rx="3" stroke="#7CD8B3" strokeWidth="1.6" />
        <path d="M9 3v6M19 3v6M3 14h22" stroke="#7CD8B3" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="9" cy="19" r="1.5" fill="#7CD8B3" />
        <circle cx="14" cy="19" r="1.5" fill="#7CD8B3" />
        <circle cx="19" cy="19" r="1.5" fill="#7CD8B3" />
      </svg>
    ),
    step: '01',
    title: 'Находите мероприятия',
    text: 'Открываете календарь, выбираете тему, формат или город — сразу видите все подходящие события.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 4C9.582 4 6 7.582 6 12c0 3.314 1.96 6.18 4.8 7.592V22h6.4v-2.408C20.04 18.18 22 15.314 22 12c0-4.418-3.582-8-8-8Z" stroke="#7CD8B3" strokeWidth="1.6" />
        <path d="M11 22h6" stroke="#7CD8B3" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M14 4V2" stroke="#7CD8B3" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    step: '02',
    title: 'Подписываетесь',
    text: 'Переходите в Telegram или MAX и нажимаете «Напомнить». Бот спросит удобное время.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 4l2.472 7.604H24l-6.236 4.53 2.472 7.604L14 19.208l-6.236 4.53 2.472-7.604L4 11.604h7.528L14 4z" stroke="#7CD8B3" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
    step: '03',
    title: 'Развивайтесь',
    text: 'Получаете уведомление вовремя, участвуете в мероприятии и развиваете профессиональные навыки.',
  },
] as const;

export function HowItWorksBlock() {
  return (
    <section className="how-section" aria-labelledby="how-title">
      <div className="how-inner">
        <div className="section-header">
          <h2 id="how-title" className="section-title">Как это работает</h2>
          <p className="section-subtitle">
            Три шага от поиска мероприятия до участия в нём
          </p>
        </div>
        <div className="how-steps">
          {steps.map((s) => (
            <div key={s.step} className="how-step-card">
              <div className="how-step-num">{s.step}</div>
              <div className="how-step-icon">{s.icon}</div>
              <h3 className="how-step-title">{s.title}</h3>
              <p className="how-step-text">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

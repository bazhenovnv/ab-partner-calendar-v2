const TG_CHANNEL = 'https://t.me/ab_afisha_buh';
const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';

export function RemindersBlock() {
  return (
    <section className="reminders-section" aria-labelledby="reminders-title">
      <div className="reminders-inner">
        <div className="reminders-text">
          <h2 id="reminders-title" className="reminders-title">
            Не пропустите важное
          </h2>
          <p className="reminders-subtitle">
            Подпишитесь на канал и получайте персональные напоминания о&nbsp;мероприятиях прямо в&nbsp;мессенджере
          </p>
          <div className="reminders-cta-row">
            <a
              href={TG_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="reminders-btn reminders-btn-tg"
              aria-label="Перейти в канал Telegram"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.771 4.16 12.87c-.635-.197-.648-.635.136-.937l11.083-4.274c.53-.194.994.13.515.562z" />
              </svg>
              Telegram
            </a>
            <a
              href={MAX_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="reminders-btn reminders-btn-max"
              aria-label="Перейти в канал MAX"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.5 12h9M13.5 8.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              MAX
            </a>
          </div>
        </div>
        <div className="reminders-visual" aria-hidden="true">
          <div className="reminders-card-mock">
            <div className="rmock-header">
              <span className="rmock-dot rmock-dot-1" />
              <span className="rmock-dot rmock-dot-2" />
              <span className="rmock-dot rmock-dot-3" />
            </div>
            <div className="rmock-row rmock-title-row" />
            <div className="rmock-row rmock-subtitle-row" />
            <div className="rmock-divider" />
            <div className="rmock-row rmock-date-row" />
            <div className="rmock-bell">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C9.243 2 7 4.243 7 7v4.586l-1.707 1.707A1 1 0 0 0 6 15h12a1 1 0 0 0 .707-1.707L17 11.586V7c0-2.757-2.243-5-5-5ZM10 17a2 2 0 0 0 4 0" stroke="#7CD8B3" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

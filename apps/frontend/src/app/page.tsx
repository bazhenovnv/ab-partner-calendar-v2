export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        background: '#0D2344',
        color: '#7CD8B3',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>АБ Афиша Бухгалтера</h1>
        <p style={{ color: '#fff', opacity: 0.7 }}>Этап 0 — инфраструктура готова</p>
        <p style={{ color: '#fff', opacity: 0.5, marginTop: '1rem', fontSize: '0.875rem' }}>
          ab-event.pro — разработка ведётся
        </p>
      </div>
    </main>
  );
}

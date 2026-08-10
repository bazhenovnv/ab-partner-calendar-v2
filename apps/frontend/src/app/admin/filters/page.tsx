import Link from 'next/link';

export default function AdminFiltersPage() {
  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">Фильтры</h1><p className="adm-muted">Управление справочниками, которые используются в публичном фильтре мероприятий.</p></div></div>
      <div className="adm-grid-2">
        <Link className="adm-card" href="/admin/directions"><h2>Направления</h2><p className="adm-muted">Названия, slug, порядок и активность направлений.</p></Link>
        <Link className="adm-card" href="/admin/cities"><h2>Города и регионы</h2><p className="adm-muted">Справочник городов и регионов для нормализации импортированных событий.</p></Link>
      </div>
    </div>
  );
}

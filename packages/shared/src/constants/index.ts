export const SITE_URL = 'https://ab-event.pro';
export const STAGING_URL = 'https://test.ab-event.pro';
export const CONTACT_EMAIL = 'info-event@a-b.ru';
export const YANDEX_METRIKA_ID = 110270689;

export const TELEGRAM_CHANNEL = 'https://t.me/ab_afisha_buh';
export const MAX_CHANNEL = 'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0';
export const PARTNER_URL = 'https://ab-buhpartner.ru/';

export const TELEGRAM_BOT = '@PartnersTogether_bot';
export const MAX_BOT_URL = 'https://max.ru/id2308283362_bot';


export const DEFAULT_DIRECTIONS = [
  { slug: '1c', name: '1C' },
  { slug: '54fz', name: '54-ФЗ' },
  { slug: 'egais', name: 'ЕГАИС' },
  { slug: 'marking', name: 'Маркировка' },
  { slug: 'taxes', name: 'Налоги' },
  { slug: 'sno', name: 'СНО' },
  { slug: 'ofd', name: 'ОФД' },
  { slug: 'nds', name: 'НДС' },
  { slug: 'kassy', name: 'Кассы' },

  { slug: 'accounting', name: 'Бухгалтерский учёт' },
  { slug: 'reporting', name: 'Отчётность' },
  { slug: 'personnel', name: 'Кадры' },
  { slug: 'labor-law', name: 'Трудовое право' },
  { slug: 'payroll', name: 'Зарплата и взносы' },
  { slug: 'edo', name: 'ЭДО' },
  { slug: 'logistics', name: 'Логистика' },
  { slug: 'foreign-trade', name: 'ВЭД' },
  { slug: 'marketplaces', name: 'Маркетплейсы' },
  { slug: 'procurement', name: 'Госзакупки' },
  { slug: 'production', name: 'Производство' },
  { slug: 'finance', name: 'Финансы' },
  { slug: 'business', name: 'Управление бизнесом' },
  { slug: 'automation', name: 'Автоматизация и ИИ' },
  { slug: 'legal', name: 'Юридические вопросы' },
] as const;

export const HASHTAG_TO_DIRECTIONS: Record<string, string[]> = {
  // Служебные хэштеги
  '#Хит': [],

  // Системы налогообложения
  '#УСН': ['sno', 'taxes'],
  '#АУСН': ['sno', 'taxes'],
  '#ПСН': ['sno', 'taxes'],
  '#ОСНО': ['sno', 'taxes'],
  '#НПД': ['sno', 'taxes'],
  '#ЕСХН': ['sno', 'taxes'],

  // Налоги и налоговый контроль
  '#Налоги': ['taxes'],
  '#НалоговыйКонтроль': ['taxes'],
  '#НалоговыеРиски': ['taxes'],
  '#ДроблениеБизнеса': ['taxes', 'legal'],
  '#ИмущественныеНалоги': ['taxes'],
  '#НалогНаПрибыль': ['taxes'],
  '#Декларация': ['taxes', 'reporting'],
  '#ФНС': ['taxes'],
  '#НДФЛ': ['taxes', 'payroll'],
  '#6НДФЛ': ['taxes', 'payroll', 'reporting'],

  // НДС
  '#НДС': ['nds', 'taxes'],

  // Бухгалтерский учёт
  '#Бухгалтерия': ['accounting'],
  '#Бухучет': ['accounting'],
  '#БухУчёт': ['accounting'],
  '#Инвентаризация': ['accounting'],
  '#ФСБУ': ['accounting'],
  '#ФСБУ28': ['accounting'],
  '#ОсновныеСредства': ['accounting'],
  '#НМА': ['accounting'],
  '#Запасы': ['accounting'],
  '#Документооборот': ['accounting', 'edo'],
  '#КассовыеОперации': ['accounting', 'kassy'],
  '#ПодотчетныеСуммы': ['accounting'],
  '#Дивиденды': ['accounting', 'finance'],

  // Отчётность
  '#Отчетность': ['reporting'],
  '#Отчётность': ['reporting'],
  '#РСВ': ['payroll', 'reporting'],
  '#ЕФС1': ['personnel', 'payroll', 'reporting'],
  '#СФР': ['personnel', 'payroll', 'reporting'],

  // Кадры и трудовое законодательство
  '#Кадры': ['personnel'],
  '#HR': ['personnel'],
  '#КадровыйУчет': ['personnel'],
  '#КадровыйУчёт': ['personnel'],
  '#ТрудовоеЗаконодательство': ['labor-law', 'personnel'],
  '#Работодатель': ['labor-law', 'personnel'],
  '#СверхурочнаяРабота': ['labor-law', 'personnel', 'payroll'],
  '#Командировки': ['personnel', 'accounting'],
  '#ОхранаТруда': ['labor-law', 'personnel'],

  // Зарплата и страховые взносы
  '#Зарплата': ['payroll'],
  '#СтраховыеВзносы': ['payroll', 'taxes'],

  // Онлайн-кассы
  '#Кассы': ['kassy'],
  '#ККТ': ['kassy'],
  '#54ФЗ': ['54fz', 'kassy'],
  '#ОФД': ['ofd', 'kassy'],

  // 1С
  '#1С': ['1c'],
  '#АвтоматизацияУчета': ['1c', 'automation'],
  '#АвтоматизацияУчёта': ['1c', 'automation'],

  // Маркировка и ЕГАИС
  '#Маркировка': ['marking'],
  '#ЕГАИС': ['egais'],

  // Электронный документооборот
  '#ЭДО': ['edo'],
  '#ГИСЭПД': ['edo', 'logistics'],
  '#ЭТРН': ['edo', 'logistics'],

  // Логистика и грузоперевозки
  '#Грузоперевозки': ['logistics'],
  '#Логистика': ['logistics'],
  '#Экспедирование': ['logistics'],
  '#Транспорт': ['logistics'],

  // Внешнеэкономическая деятельность
  '#ВЭД': ['foreign-trade'],
  '#Импорт': ['foreign-trade'],
  '#Экспорт': ['foreign-trade'],
  '#ВалютныйКонтроль': ['foreign-trade', 'finance'],

  // Маркетплейсы
  '#Маркетплейсы': ['marketplaces'],
  '#Wildberries': ['marketplaces'],
  '#Ozon': ['marketplaces'],
  '#ЯндексМаркет': ['marketplaces'],

  // Государственные закупки
  '#Госзакупки': ['procurement'],
  '#Закупки': ['procurement'],
  '#Тендеры': ['procurement'],
  '#44ФЗ': ['procurement'],
  '#223ФЗ': ['procurement'],
  '#275ФЗ': ['procurement'],

  // Производство
  '#Производство': ['production'],
  '#Себестоимость': ['production', 'accounting'],
  '#ПроизводственныйУчет': ['production', 'accounting'],
  '#ПроизводственныйУчёт': ['production', 'accounting'],

  // Финансы
  '#Финансы': ['finance'],
  '#ФинансовыйУчет': ['finance', 'accounting'],
  '#ФинансовыйУчёт': ['finance', 'accounting'],

  // Управление бизнесом
  '#Бизнес': ['business'],
  '#Предпринимательство': ['business'],
  '#Управление': ['business'],
  '#Лидерство': ['business'],
  '#РазвитиеБизнеса': ['business'],
  '#СобственникБизнеса': ['business'],
  '#РаботаСКомандой': ['business', 'personnel'],

  // Автоматизация, цифровизация и ИИ
  '#ИИ': ['automation'],
  '#ИскусственныйИнтеллект': ['automation'],
  '#Автоматизация': ['automation'],
  '#Цифровизация': ['automation'],

  // Юридическая практика
  '#Юрист': ['legal'],
  '#Право': ['legal'],
  '#СудебнаяПрактика': ['legal'],

  // Универсальный бухгалтерский контент
  '#ПолезноДляБухгалтера': ['accounting'],
};

export const FOOTER_PROJECTS = [
  { title: 'АБ Партнер', url: 'https://ab-buhpartner.ru/' },
  { title: 'АБ Онлайн-касса', url: 'https://ab-onlinekassa.ru/' },
  { title: 'АБ Ресторан', url: 'https://krasnodar.ab-restoran.ru/' },
  { title: 'АБ Сервис', url: 'https://service-ab.ru/' },
  { title: 'АБ Креатив', url: 'https://ab-creative.ru/' },
] as const;


export const LEGAL_OPERATOR = {
  name: 'ООО «АБ ГРУПП»',
  ogrn: '1212300074766',
  inn: '2308283450',
  address: '350049, Краснодарский край, г. о. город Краснодар, г. Краснодар, ул. Красных Партизан, д. 164, помещение 5',
} as const;

export const DESIGN_TOKENS = {
  primaryDarkBlue: '#0D2344',
  mint: '#7CD8B3',
  selectedDay: '#367D67',
  greenMarker: '#015A3F',
  completedMarker: '#ACACAC',
  dateHover: '#E4E4E4',
  dropdownBorder: '#E8E3DC',
  liveStatus: '#FFDB99',
  completedStatus: '#A3A3A3',
  baseShadow: '0 4px 4px rgba(0,0,0,0.25)',
} as const;

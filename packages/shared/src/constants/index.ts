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
] as const;

export const HASHTAG_TO_DIRECTIONS: Record<string, string[]> = {
  '#Хит': [],
  '#УСН': ['sno', 'taxes'],
  '#АУСН': ['sno', 'taxes'],
  '#ПСН': ['sno', 'taxes'],
  '#ОСНО': ['sno', 'taxes'],
  '#НПД': ['sno', 'taxes'],
  '#ЕСХН': ['sno', 'taxes'],
  '#Налоги': ['taxes'],
  '#НДС': ['nds'],
  '#1С': ['1c'],
  '#54ФЗ': ['54fz'],
  '#Маркировка': ['marking'],
  '#ЕГАИС': ['egais'],
  '#ОФД': ['ofd'],
  '#Кассы': ['kassy'],
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

import type { PricingTier } from "@/src/lib/domain/types";

export const siteConfig = {
  name: "Padel & Squash KZ",
  city: "Алматы",
  country: "Казахстан",
  currency: "KZT",
  timezone: "Asia/Almaty",
  phone: "+7 (727) 355-77-00 (демо)",
  email: "info@padelsquash.kz",
  address: "г. Алматы, ул. Абая, 120",
  neighborhood: "район станции метро «Алатау»",
  shortDescription: "Клуб падела и сквоша в Алматы с онлайн-бронированием кортов и тренировок.",
  socialLinks: [
    { label: "Instagram", href: "https://instagram.com/padelsquashkz" },
    { label: "WhatsApp", href: "https://wa.me/77000000000" },
    { label: "Telegram", href: "https://t.me/padelsquashkz" },
  ],
  legalLinks: [
    { label: "Политика конфиденциальности", href: "/legal/privacy" },
    { label: "Условия использования", href: "/legal/terms" },
  ],
} as const;

export const navItems = [
  { href: "/", label: "Главная" },
  { href: "/coaches", label: "Тренеры" },
  { href: "/contact", label: "Контакты" },
] as const;

const sharedCourtSpecs = {
  padel: {
    description:
      "Все падел-корты одинаковые по покрытию и освещению. Выбирайте удобный слот, а не «лучший» корт.",
    features: ["Панорамное остекление", "LED-освещение", "Профессиональное покрытие", "Высокие потолки"],
  },
  squash: {
    description:
      "Сквош-корты одинаковые по конфигурации и подходят для регулярных тренировок и спаррингов.",
    features: ["Стеклянная задняя стена", "Клубный таймер", "Кондиционирование", "Разметка WSF"],
  },
} as const;

export const courtItems = [
  { id: "padel-1", name: "Падел 1", sport: "Падел" as const, sportKey: "padel" as const },
  { id: "padel-2", name: "Падел 2", sport: "Падел" as const, sportKey: "padel" as const },
  { id: "padel-3", name: "Падел 3", sport: "Падел" as const, sportKey: "padel" as const },
  { id: "squash-1", name: "Сквош 1", sport: "Сквош" as const, sportKey: "squash" as const },
  { id: "squash-2", name: "Сквош 2", sport: "Сквош" as const, sportKey: "squash" as const },
].map(({ sportKey, ...court }) => ({
  ...court,
  capacity: sportKey === "padel" ? "Макс. 4 игрока" : "1-2 игрока",
  sportQuery: sportKey,
  description: sharedCourtSpecs[sportKey].description,
  features: [...sharedCourtSpecs[sportKey].features],
}));

export const coachItems = [
  {
    id: "coach-ilya",
    name: "Илья Смирнов",
    sport: "Падел",
    sportKey: "padel" as const,
    experience: "8 лет",
    bio: "Ставит базовую технику, помогает с игровой позицией и переходом в уверенную парную игру.",
    format: "Индивидуально / мини-группа / парные разборы",
  },
  {
    id: "coach-ruslan",
    name: "Руслан Алимов",
    sport: "Падел",
    sportKey: "padel" as const,
    experience: "10 лет",
    bio: "Работает с продвинутыми игроками: тактика пары, вариативная подача, игровые комбинации у сетки.",
    format: "Индивидуально / сплит-тренировка / матч-практика",
  },
  {
    id: "coach-anna",
    name: "Анна Коваль",
    sport: "Сквош",
    sportKey: "squash" as const,
    experience: "6 лет",
    bio: "Техника перемещений, выносливость и контроль темпа розыгрыша для начинающих и продолжающих.",
    format: "Индивидуально / спарринг / базовый курс",
  },
  {
    id: "coach-daniyar",
    name: "Данияр Сеитов",
    sport: "Сквош",
    sportKey: "squash" as const,
    experience: "9 лет",
    bio: "Подготовка к любительским турнирам: тактика, темп, чтение игры и точность ударов под нагрузкой.",
    format: "Индивидуально / турнирная подготовка",
  },
];

export const serviceItems = [
  {
    id: "padel-rental",
    name: "Аренда корта (падел)",
    durations: "60 минут",
    note: "Для самостоятельной игры. При необходимости добавьте тренировку с тренером.",
  },
  {
    id: "padel-coaching",
    name: "Тренировка с тренером (падел)",
    durations: "60 минут",
    note: "Стоимость = аренда корта + выбранный тренер.",
  },
  {
    id: "squash-rental",
    name: "Аренда корта (сквош)",
    durations: "60 минут",
    note: "Подходит для одиночной игры и спарринга.",
  },
  {
    id: "squash-coaching",
    name: "Тренировка с тренером (сквош)",
    durations: "60 минут",
    note: "Стоимость = аренда корта + выбранный тренер.",
  },
];

export const pricingTierRows = [
  {
    tier: "morning" as PricingTier,
    label: "Утро",
    schedule: "Пн-Пт 07:00-12:00",
  },
  {
    tier: "day" as PricingTier,
    label: "День",
    schedule: "Пн-Пт 12:00-17:00",
  },
  {
    tier: "evening_weekend" as PricingTier,
    label: "Вечер / выходные",
    schedule: "Пн-Пт 17:00-23:00, Сб-Вс весь день",
  },
];

export const pricingNotes = [
  "Все бронирования оформляются на 60 минут.",
  "Аренда корта доступна только для зарегистрированных пользователей.",
  "Тренировка считается как сумма: корт + выбранный тренер.",
  "Бесплатная отмена доступна не позднее чем за 6 часов до начала занятия.",
];

export const featureItems = [
  {
    icon: "01",
    title: "Выбор времени за пару минут",
    text: "Свободные часы по каждому корту видны сразу на выбранную дату, без звонка администратору.",
  },
  {
    icon: "02",
    title: "Тренировки под ваш уровень",
    text: "Выберите тренера по паделу или сквошу и заранее увидите итоговую стоимость занятия.",
  },
  {
    icon: "03",
    title: "Понятные правила бронирования",
    text: "Фиксированная длительность занятия, прозрачные тарифы и отмена через личный кабинет.",
  },
];

export const homePageContent = {
  hero: {
    eyebrow: "Клуб падела и сквоша",
    title: "Играйте в падел и сквош в центре Алматы",
    description:
      "Бронируйте корты и тренировки онлайн, выбирайте удобный час и тренера, управляйте бронированиями в личном кабинете.",
  },
  primaryActionLabel: "Онлайн запись",
  pricingTitle: "Падел и сквош: цены по времени",
  pricingSubtitle:
    "Цены берутся из настроек клуба в админ-панели. Для тренировок диапазон зависит от выбранного тренера.",
  equipmentBanner:
    "Мячи и базовый инвентарь включены в стоимость занятия. При необходимости уточняйте наличие ракеток у администратора.",
  faqTitle: "FAQ",
  faqPlaceholder:
    "Раздел вопросов и ответов добавим позже (ракетки, формат игры, отмена и подготовка к первому занятию).",
  rulesTitle: "Правила бронирования",
  rulesPlaceholder:
    "Краткие правила бронирования и отмены добавим позже. Пока ориентируйтесь на условия в процессе онлайн-записи.",
  aboutClubTitle: "О клубе",
  aboutClubDescription:
    "Ниже показаны активные корты по видам спорта. Список и состояние кортов берутся из базы данных и управляются через админ-панель.",
  aboutGalleryTitle: "Галерея клуба",
  clubRulesTitle: "Правила клуба",
  clubRulesPlaceholder:
    "Контент раздела (форма, обувь, время прихода, правила поведения на корте) добавим позже.",
  socialsTitle: "Мы на связи",
  socialsSubtitle: "Выберите удобный канал для записи, вопросов по тренировкам и подтверждения деталей.",
} as const;

export const courtsPageContent = {
  hero: {
    eyebrow: "Корты",
    title: "Корты для падела и сквоша",
    description:
      "Все корты внутри одного клуба: одинаковые стандарты покрытия и света в рамках каждого вида спорта, чтобы вы выбирали время, а не «вариант корта».",
  },
  pricesLinkLabel: "Смотреть тарифы клуба",
} as const;

export const coachesPageContent = {
  hero: {
    eyebrow: "Тренеры",
    title: "Тренеры по паделу и сквошу",
    description:
      "Индивидуальные занятия, парные тренировки и матч-практика. Выберите подходящий формат и тренера при бронировании.",
  },
  bookingLabel: "Записаться",
} as const;

export const pricesPageContent = {
  hero: {
    eyebrow: "Цены",
    title: "Понятные тарифы без сложных правил",
    description:
      "Цена зависит от спорта, периода дня и выбранного тренера (для тренировок). Итоговая сумма показывается до подтверждения брони.",
  },
  tableTitle: "Тарифы (KZT)",
  rulesTitle: "Как считается стоимость",
  calculationSteps: [
    "Выберите спорт и формат занятия: аренда корта или тренировка.",
    "Система определит тарифный период по времени старта.",
    "Для тренировки добавится стоимость выбранного тренера.",
  ],
  exampleTitle: "Пример расчета",
  exampleDescription:
    "Тренировка по паделу в вечернее время: цена = корт + выбранный тренер. Итог вы увидите до подтверждения.",
  trainerRangesTitle: "Тренеры: индивидуальные ставки",
  ctaLabel: "Перейти к бронированию",
} as const;

export const contactPageContent = {
  hero: {
    eyebrow: "Контакты",
    title: "Как нас найти и связаться",
    description:
      "Свяжитесь с администратором для регулярных бронирований, корпоративных игр, детских и взрослых групп.",
  },
  bookingCardText:
    "Онлайн-бронирование доступно 24/7. Для вопросов по расписанию тренеров и групповым занятиям свяжитесь с администратором клуба.",
  mapLinkLabel: "Открыть в Google Maps",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C+%D1%83%D0%BB.+%D0%90%D0%B1%D0%B0%D1%8F%2C+120",
  hoursTitle: "Часы работы",
  socialTitle: "Мы на связи",
  directionsTitle: "Как добраться",
  directions: [
    "5 минут пешком от метро «Алатау».",
    "Есть парковка рядом со входом в клуб.",
    "Для групповых тренировок лучше приезжать за 10-15 минут до начала.",
  ],
  formTitle: "Оставить заявку",
  formDescription: "Напишите нам, и администратор свяжется с вами для уточнения деталей.",
} as const;

export const bookPageContent = {
  hero: {
    eyebrow: "Забронировать",
    title: "Онлайн-бронирование корта или тренировки",
    description:
      "Выберите спорт, формат занятия и дату, затем бронируйте свободный час по конкретному корту. Для тренировок добавьте тренера.",
  },
  notesTitle: "Правила бронирования",
  notices: [
    "Все занятия бронируются на 60 минут и начинаются только в начале часа.",
    "Для оформления бронирования требуется вход в аккаунт или регистрация.",
    "Бесплатная отмена доступна в личном кабинете не позднее чем за 6 часов до начала занятия.",
  ],
} as const;

export const bookingPreviewContent = {
  eyebrow: "Как это работает",
  title: "Бронирование за пару шагов",
  text:
    "Выберите спорт и формат занятия, затем дату и свободный час. Для тренировки можно выбрать тренера и увидеть итоговую стоимость до подтверждения.",
  sampleSlotsTitle: "Примеры часовых слотов",
  sampleSlots: [
    { time: "09:00", status: "available" },
    { time: "10:00", status: "available" },
    { time: "11:00", status: "busy" },
    { time: "12:00", status: "available" },
    { time: "13:00", status: "available" },
  ] as Array<{ time: string; status: "available" | "busy" }>,
  primaryActionLabel: "Перейти к бронированию",
} as const;

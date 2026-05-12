import type { PricingTier } from "@/src/lib/domain/types";

import { getCustomerCancellationPolicySummary } from "@/src/lib/bookings/policy";

export const siteConfig = {
	name: "Racket Community Kst",
	siteUrl: "https://padelsquash.kz",
	city: "Костанай",
	country: "Казахстан",
	currency: "KZT",
	timezone: "Asia/Almaty",
	phone: "+7 (727) 355-77-00",
	email: "info@padelsquash.kz",
	address: "г. Костанай, ул. Абая, 120",
	neighborhood: "район станции метро «Алатау»",
	shortDescription: "Падел, сквош и теннис в Костанае — корты, тренеры и онлайн-запись.",
	socialLinks: [
		{ label: "Instagram", href: "https://instagram.com/padelsquashkz" },
		{ label: "WhatsApp", href: "https://wa.me/77273557700" },
		{ label: "Telegram", href: "https://t.me/padelsquashkz" },
	],
	legalLinks: [
		{ label: "Политика конфиденциальности", href: "/legal/privacy" },
		{ label: "Условия использования", href: "/legal/terms" },
	],
} as const;

export const navItems = [
	{ href: "/book", label: "Бронирование" },
	{ href: "/events", label: "События" },
	{ href: "/prices", label: "Цены" },
	{ href: "/coaches", label: "Тренеры" },
	{ href: "/contact", label: "Контакты" },
] as const;

const cancellationPolicySummary = getCustomerCancellationPolicySummary();

const sharedCourtSpecs = {
	padel: {
		description:
			"Все корты одинаковые — покрытие и освещение везде одно. Просто берите удобное время.",
		features: ["Панорамное остекление", "LED-освещение", "Профессиональное покрытие", "Высокие потолки"],
	},
	squash: {
		description:
			"Стандартная конфигурация, всё одинаково. Подходят и для регулярных тренировок, и для спаррингов.",
		features: ["Стеклянная задняя стена", "Клубный таймер", "Кондиционирование", "Разметка WSF"],
	},
	tennis: {
		description:
			"Подходит и для одиночных занятий, и для парной игры.",
		features: ["Покрытие hard", "Профессиональная сетка", "LED-освещение", "Разметка ITF"],
	},
} as const;

export const courtItems = [
	{ id: "padel-1", name: "Падел 1", sport: "Падел" as const, sportKey: "padel" as const },
	{ id: "padel-2", name: "Падел 2", sport: "Падел" as const, sportKey: "padel" as const },
	{ id: "padel-3", name: "Падел 3", sport: "Падел" as const, sportKey: "padel" as const },
	{ id: "squash-1", name: "Сквош 1", sport: "Сквош" as const, sportKey: "squash" as const },
	{ id: "squash-2", name: "Сквош 2", sport: "Сквош" as const, sportKey: "squash" as const },
	{ id: "tennis-1", name: "Теннис 1", sport: "Теннис" as const, sportKey: "tennis" as const },
].map(({ sportKey, ...court }) => ({
	...court,
	capacity:
		sportKey === "padel" ? "Макс. 4 игрока" : sportKey === "tennis" ? "2-4 игрока" : "1-2 игрока",
	sportQuery: sportKey,
	description: sharedCourtSpecs[sportKey].description,
	features: [...sharedCourtSpecs[sportKey].features],
}));

export const pricingTierRows = [
	{
		tier: "off_peak" as PricingTier,
		label: "Обычное время",
		schedule: "Пн-Пт 08:00-17:00",
	},
	{
		tier: "peak" as PricingTier,
		label: "Пиковое время",
		schedule: "Пн-Пт 17:00-23:00, Сб-Вс и праздники — весь день",
	},
];

export const pricingNotes = [
	"Все бронирования оформляются на 60 минут.",
	"Аренда корта доступна только для зарегистрированных пользователей.",
	"Тренировка считается как сумма: корт + выбранный тренер.",
	cancellationPolicySummary,
];

export const homePageContent = {
	hero: {
		eyebrow: "Клуб ракеточных видов спорта - г. Костанай",
		title: "Теннис, падел и сквош в Костанае",
		description:
			"Первый в республике центр с теннисом, паделом и сквошем под одной крышей. Онлайн-запись, тренеры и лучшие условия для игры на любом уровне.",
	},
	primaryActionLabel: "Онлайн запись",
	pricingTitle: "Цены на наши услуги",
	pricingSubtitle:
		"Цены на аренду корта и занятия с тренером. Для тренировки итоговая сумма зависит от выбранного тренера.",
	equipmentBanner:
		"Мячи для сквоша и базовые ракетки входят в стоимость. Нужна ракетка получше или просто не знаете с чего начать — спросите на стойке.",
	faqTitle: "FAQ",
	faqSubtitle: "Короткие ответы на частые вопросы.",
	faqItems: [
		{
			question: "Нужна ли своя ракетка?",
			answer:
				"Нет. На первый раз можно взять клубную ракетку — уточните наличие в WhatsApp или на стойке.",
		},
		{
			question: "Сколько человек может играть на корте?",
			answer:
				"Падел: обычно 2-4 игрока. Сквош: 1-2 игрока. Формат выбираете сами, система бронирует стандартный час.",
		},
		{
			question: "Как отменить бронирование?",
			answer:
				`Отмена доступна в личном кабинете. ${cancellationPolicySummary} После отмены слот снова становится доступен для записи.`,
		},
		{
			question: "Что взять с собой на первую игру?",
			answer:
				"Спортивную форму, кроссовки для зала и воду. Приходите минут за 10-15 — успеете переодеться и спокойно найти корт.",
		},
		{
			question: "Можно ли записаться на тренировку без пары?",
			answer:
				"Да. Выберите тренера и время, а формат (один или в паре) уточните у администратора заранее.",
		},
		{
			question: "Как понять итоговую цену тренировки?",
			answer:
				"Цена видна до подтверждения: отдельно корт и ставка тренера, потом итог по всем выбранным слотам.",
		},
	],
	rulesTitle: "Правила бронирования",
	rulesSubtitle: "Самое важное перед подтверждением бронирования.",
	bookingRules: [
		"Все занятия бронируются на 60 минут и начинаются в начале часа.",
		"Для бронирования нужен аккаунт: это нужно для подтверждений, истории и отмены.",
		cancellationPolicySummary,
		"Если опаздываете, слот сохраняется за вами, но время окончания не сдвигается.",
		"Для регулярных игр и групповых тренировок удобнее написать администратору заранее.",
	],
	aboutClubTitle: "О клубе",
	aboutClubDescription:
		"Корты для падела и сквоша в одном месте. Выбирайте формат игры, бронируйте онлайн — никаких звонков.",
	aboutGalleryTitle: "Галерея клуба",
	clubRulesTitle: "Правила клуба",
	clubRulesSubtitle: "Простые правила, чтобы на корте всем было комфортно и безопасно.",
	clubRules: [
		"На корт — только в чистой спортивной обуви для зала.",
		"Приходите за 10-15 минут до начала, особенно на первое занятие.",
		"Разминайтесь перед игрой — даже если кажется, что некогда.",
		"Воду на корт берите в закрытой бутылке; еду и сладкие напитки оставьте за площадкой.",
		"Бережно обращайтесь с инвентарём и слушайте администратора и тренера.",
	],
	socialsTitle: "Мы на связи",
	socialsSubtitle: "Пишите по записи, тренировкам, групповым занятиям и вопросам по первому визиту.",
} as const;

export const courtsPageContent = {
	hero: {
		eyebrow: "Корты",
		title: "Корты для тенниса, падела и сквоша",
		description:
			"Все корты в одном клубе — покрытие и освещение одинаковые в каждом виде спорта. Просто выбирайте удобное время.",
	},
	pricesLinkLabel: "Смотреть тарифы клуба",
} as const;

export const coachesPageContent = {
	hero: {
		eyebrow: "Тренеры",
		title: "Наши тренеры",
		description:
			"Первое занятие или постоянные тренировки — выбирайте тренера прямо в форме бронирования по нужному времени и уровню.",
	},
	bookingLabel: "Записаться",
} as const;

export const pricesPageContent = {
	hero: {
		eyebrow: "Цены",
		title: "Понятные тарифы без сложных правил",
		description:
			"Стоимость зависит от спорта, времени суток и тренера, если берёте тренировку. Финальная цена видна до подтверждения.",
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
			"Напишите по любому вопросу — запись, тренировки, групповые занятия или просто первый визит.",
	},
	bookingCardText:
		"Онлайн-запись работает 24/7. Если нужен совет по выбору тренера, времени или формата занятия, напишите администратору.",
	mapLinkLabel: "Открыть в Google Maps",
	mapUrl:
		"https://www.google.com/maps/search/?api=1&query=%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C+%D1%83%D0%BB.+%D0%90%D0%B1%D0%B0%D1%8F%2C+120",
	hoursTitle: "Часы работы",
	socialTitle: "Мы на связи",
	directionsTitle: "Как добраться",
	directionsDescription:
		"Клуб в районе метро «Алатау». Несколько ориентиров, чтобы быстрее найти вход.",
	directions: [
		"От метро «Алатау» пешком около 5 минут по ул. Абая.",
		"Рядом со входом есть парковка; в вечернее время лучше заложить запас 10 минут.",
		"Если едете впервые, откройте ссылку на Google Maps заранее и ориентируйтесь на адрес: ул. Абая, 120.",
		"На тренировку и первую игру удобно приезжать за 10-15 минут до начала.",
	],
} as const;

export const bookPageContent = {
	hero: {
		eyebrow: "Забронировать",
		title: "Онлайн-бронирование корта или тренировки",
		description:
			"Выберите спорт, формат и дату — потом отметьте удобные слоты. Для тренировки сначала выберите тренера, корт подберётся автоматически.",
	},
	notesTitle: "Правила бронирования",
	notices: [
		"Занятия бронируются на 60 минут и стартуют в начале часа.",
		"Для записи нужен аккаунт: так вы сможете быстро повторно бронировать и отменять занятия в личном кабинете.",
		"На тренировке сначала выберите тренера, затем система покажет только подходящее свободное время.",
		`Отмена в личном кабинете: ${cancellationPolicySummary}`,
	],
} as const;

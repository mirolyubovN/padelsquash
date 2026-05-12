export interface SportInfoPageContent {
	slug: "padel" | "squash" | "tennis";
	navLabel: string;
	eyebrow: string;
	title: string;
	description: string;
	overview: string[];
	photo: {
		src: string;
		alt: string;
		creditLabel: string;
		creditUrl: string;
	};
	rules: string[];
	whyTry: string[];
	sourceLinks: Array<{ label: string; href: string }>;
}

const sportPages: Record<SportInfoPageContent["slug"], SportInfoPageContent> = {
	padel: {
		slug: "padel",
		navLabel: "Про падел",
		eyebrow: "О спорте",
		title: "Про падел",
		description:
			"Падел - парная ракеточная игра на корте 10x20 м со стеклом и сеткой по периметру, где стены участвуют в розыгрыше.",
		overview: [
			"Структура похожа на теннис, но есть нюанс: отскоки от стекла можно продолжать в розыгрыш.",
			"Формат по умолчанию — пара на пару, так что падел хорошо ложится под игру с друзьями.",
			"Порог входа обычно ниже, чем в большой теннис: базовые розыгрыши получаются уже на первых занятиях.",
		],
		photo: {
			src: "https://commons.wikimedia.org/wiki/Special:FilePath/Padel%20court%201.jpg",
			alt: "Падел-корт во время игры",
			creditLabel: "Фото: Wikimedia Commons",
			creditUrl: "https://commons.wikimedia.org/wiki/File:Padel_court_1.jpg",
		},
		rules: [
			"Подача выполняется снизу после отскока от пола, в диагональный квадрат соперника.",
			"В паделе первый отскок мяча должен быть в пол; отскоки от стекла в розыгрыше разрешены.",
			"Счет теннисный: 15-30-40-гейм, при 6:6 в сете обычно играется тай-брейк.",
		],
		whyTry: [
			"Хотите начать ракеточный спорт без долгого вхождения — падел один из лучших вариантов.",
			"Живой и азартный формат, который легко встроить в регулярный график.",
			"Хорошо подходит, если хочется активности и соревновательного настроения без сложного старта.",
		],
		sourceLinks: [
			{
				label: "Terrasquash: Про падел-теннис",
				href: "https://terrasquash.ru/about-padel",
			},
			{
				label: "FIP: Official rules of padel (PDF)",
				href: "https://www.padelfip.com/wp-content/uploads/2024/02/2-game-regulations.pdf",
			},
		],
	},
	squash: {
		slug: "squash",
		navLabel: "Про сквош",
		eyebrow: "О спорте",
		title: "Про сквош",
		description:
			"Сквош - динамичная игра 1 на 1 на компактном корте, где игроки по очереди атакуют переднюю стену и постоянно меняют темп.",
		overview: [
			"Сквош часто называют «физическими шахматами»: важны не только скорость и выносливость, но и тактика.",
			"В игре используется общее пространство на двоих, поэтому нужно уметь принимать быстрые решения в розыгрыше.",
			"Даже короткая тренировка дает заметную нагрузку и быстро прокачивает реакцию и координацию.",
		],
		photo: {
			src: "https://commons.wikimedia.org/wiki/Special:FilePath/Squash%20court.JPG",
			alt: "Сквош-корт",
			creditLabel: "Фото: Wikimedia Commons",
			creditUrl: "https://commons.wikimedia.org/wiki/File:Squash_court.JPG",
		},
		rules: [
			"Основная цель - отправить мяч в переднюю стену так, чтобы соперник не успел корректно ответить.",
			"Гейм обычно до 11 очков; при 10:10 игра продолжается до преимущества в 2 очка.",
			"Подача выполняется из квадрата подачи, а в розыгрыше важно не создавать помех сопернику.",
		],
		whyTry: [
			"Если нравится интенсивная игра и ощущение «полного включения», сквош подходит идеально.",
			"Формат быстро развивает выносливость, скорость мышления и игровую дисциплину.",
			"Это сильный выбор, если хотите короткие, но очень эффективные тренировки с характером.",
		],
		sourceLinks: [
			{
				label: "Terrasquash: Про сквош",
				href: "https://terrasquash.ru/about-squash",
			},
			{
				label: "World Squash: Rules of Singles Squash 2025 (PDF)",
				href: "https://squash.or.jp/rules/rule2025/250901_World-Squash-Rules-of-Singles-Squash-2025.pdf",
			},
		],
	},
	tennis: {
		slug: "tennis",
		navLabel: "Про теннис",
		eyebrow: "О спорте",
		title: "Про теннис",
		description:
			"Теннис сочетает технику ударов, тактику розыгрыша и матчевую психологию. Это универсальный спорт на годы, который подходит для любого возраста.",
		overview: [
			"В теннис можно играть в одиночном и парном формате, подбирая комфортную нагрузку и темп.",
			"Регулярные занятия улучшают координацию, скорость ног, силу удара и концентрацию.",
			"Одинаково хорошо подходит для фитнес-целей и для серьёзной соревновательной практики.",
		],
		photo: {
			src: "https://commons.wikimedia.org/wiki/Special:FilePath/Tennis%20Racket%20and%20Balls.jpg",
			alt: "Теннисная ракетка и мячи",
			creditLabel: "Фото: Wikimedia Commons",
			creditUrl: "https://commons.wikimedia.org/wiki/File:Tennis_Racket_and_Balls.jpg",
		},
		rules: [
			"По правилам ITF: длина корта 23.77 м, ширина 8.23 м (одиночный) и 10.97 м (парный).",
			"Высота сетки: 1.07 м у стоек и 0.914 м в центре.",
			"Матч состоит из сетов и геймов с классическим теннисным счетом.",
		],
		whyTry: [
			"Теннис дает сильную базу техники и движения, которая полезна и в других видах спорта.",
			"Можно начать с индивидуальной тренировки и быстро перейти к полноценным матчам.",
			"Это один из лучших форматов, если вы хотите сочетать развитие навыка, кардио и удовольствие от игры.",
		],
		sourceLinks: [
			{
				label: "ITF: Rules of Tennis 2025 (PDF)",
				href: "https://www.itftennis.com/media/7221/2025-rules-of-tennis-english.pdf",
			},
			{
				label: "ITF: Rules and Regulations",
				href: "https://www.itftennis.com/en/about-us/governance/rules-and-regulations/",
			},
		],
	},
};

export const sportInfoPages = Object.values(sportPages);

export function getSportInfoPageContent(slug: string): SportInfoPageContent | null {
	return sportPages[slug as SportInfoPageContent["slug"]] ?? null;
}

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
			"По структуре игра сочетает элементы тенниса и сквоша: есть сетка, а отскоки от стекла можно продолжать в игру.",
			"Формат по умолчанию - пара на пару, поэтому падел хорошо подходит для игры с друзьями и семейных матчей.",
			"Порог входа в падел обычно ниже, чем в большой теннис: базовые розыгрыши получаются уже на первых занятиях.",
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
			"Если хотите начать ракеточный спорт без долгой адаптации, падел - один из самых удобных вариантов.",
			"Это живой, социальный и азартный формат, который легко встроить в регулярный график.",
			"Идеально для тех, кто хочет активность, соревновательный драйв и при этом понятный старт.",
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
			"Спорт одинаково хорошо работает как для фитнес-целей, так и для полноценной соревновательной практики.",
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

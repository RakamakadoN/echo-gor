import { Branch, Teacher, Group, Student, Hall, Announcement, AuditLog, ArtistLevel, ExecutiveSummary, Payment, Achievement, Competition, Organization, Guardian, FinanceTransaction } from "./types";

export const initialOrganizations: Organization[] = [
  { id: "org-echo-gor", name: "Эхо Гор (Кавказские танцы)", slug: "echo-gor", status: "active" }
];

const orgId = "org-echo-gor";

export const initialBranches: Branch[] = [
  {
    id: "branch-almaty",
    organizationId: orgId,
    name: "Ансамбль Алматы (Флагман)",
    city: "Алматы",
    address: "ул. Абая, 45",
    managerName: "Асланбек Болотаев",
    phone: "+7 (727) 001-20-20",
    hallsCount: 3
  },
  {
    id: "branch-astana",
    organizationId: orgId,
    name: "Филиал Астана Жулдыз",
    city: "Астана",
    address: "пр. Кабанбай батыра, 12А",
    managerName: "Магомед Даудов",
    phone: "+7 (7172) 150-30-40",
    hallsCount: 2
  },
  {
    id: "branch-shymkent",
    organizationId: orgId,
    name: "Резиденция Орда-Юниор",
    city: "Шымкент",
    address: "пр. Тауке хана, 8",
    managerName: "Зелимхан Юсупов",
    phone: "+7 (7252) 777-95-95",
    hallsCount: 2
  }
];

export const initialHalls: Hall[] = [
  { id: "hall-almaty-1", branchId: "branch-almaty", name: "Зал Алатау (Большой)", capacity: 40 },
  { id: "hall-almaty-2", branchId: "branch-almaty", name: "Зал Кок-Тобе (Средний)", capacity: 25 },
  { id: "hall-almaty-3", branchId: "branch-almaty", name: "Зал Медео (Малый)", capacity: 15 },
  { id: "hall-ast-1", branchId: "branch-astana", name: "Зал Байтерек", capacity: 30 },
  { id: "hall-ast-2", branchId: "branch-astana", name: "Зал Хан Шатыр", capacity: 20 },
  { id: "hall-shym-1", branchId: "branch-shymkent", name: "Зал Орда (Главный)", capacity: 35 },
  { id: "hall-shym-2", branchId: "branch-shymkent", name: "Зал Арыс (Малый)", capacity: 15 }
];

export const initialTeachers: Teacher[] = [
  {
    id: "teach-aslan",
    organizationId: orgId,
    name: "Аслан Плиев",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&fit=crop&q=80",
    specialties: ["Мужская лезгинка", "Симд", "Хонга", "Трюковая техника"],
    phone: "+7 (701) 441-11-22",
    bio: "Заслуженный артист республики, экс-солист государственного ансамбля. Опыт преподавания более 15 лет.",
    experienceYears: 18
  },
  {
    id: "teach-fatima",
    organizationId: orgId,
    name: "Фатима Царикаева",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop&q=80",
    specialties: ["Женская лезгинка (Плавные танцы)", "Девичья пластика", "Картули"],
    phone: "+7 (702) 895-33-44",
    bio: "Мастер спорта по художественной гимнастике и профессиональная исполнительница кавказских бальных и народных танцев.",
    experienceYears: 11
  },
  {
    id: "teach-shamil",
    organizationId: orgId,
    name: "Шамиль Гамзатов",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop&q=80",
    specialties: ["Лезгинка быстрая парная", "Гандаган", "Кинтоури", "Игра на барабане (Доул)"],
    phone: "+7 (707) 111-55-66",
    bio: "Специалист по фольклорным кавказским танцам Дагестана и Грузии. Энергичный новатор.",
    experienceYears: 9
  }
];

export const initialGroups: Group[] = [
  {
    id: "group-almaty-ensemble",
    organizationId: orgId,
    branchId: "branch-almaty",
    name: "Старший Кавказский Ансамбль",
    teacherId: "teach-aslan",
    hallId: "hall-almaty-1",
    scheduleText: "Пн, Ср, Пт 19:30 - 21:00",
    days: ["Пн", "Ср", "Пт"],
    time: "19:30",
    ageGroup: "16+ лет",
    level: "Ансамбль",
    studentCount: 4
  },
  {
    id: "group-almaty-kids-1",
    organizationId: orgId,
    branchId: "branch-almaty",
    name: "Младшие джигиты (Основы)",
    teacherId: "teach-aslan",
    hallId: "hall-almaty-2",
    scheduleText: "Вт, Чт 16:00 - 17:00",
    days: ["Вт", "Чт"],
    time: "16:00",
    ageGroup: "6-8 лет",
    level: "Начинающие",
    studentCount: 3
  },
  {
    id: "group-almaty-girls",
    organizationId: orgId,
    branchId: "branch-almaty",
    name: "Грация гор (Младший девичий)",
    teacherId: "teach-fatima",
    hallId: "hall-almaty-2",
    scheduleText: "Пн, Ср, Пт 16:30 - 18:00",
    days: ["Пн", "Ср", "Пт"],
    time: "16:30",
    ageGroup: "9-13 лет",
    level: "Продолжающие",
    studentCount: 3
  }
];

export const initialGuardians: Guardian[] = [
  { id: "guard-alina", organizationId: orgId, fullName: "Алина Болотаева", phone: "+7 (701) 400-30-30", email: "alina.b@example.com" },
  { id: "guard-khetag", organizationId: orgId, fullName: "Хетаг Дзагоев", phone: "+7 (701) 333-55-77" },
  { id: "guard-zarema", organizationId: orgId, fullName: "Зарема Гаджиева", phone: "+7 (702) 789-01-01" },
  { id: "guard-zelimkhan", organizationId: orgId, fullName: "Зелимхан Юсупов", phone: "+7 (999) 777-95-95" }
];

export const initialStudents: Student[] = [
  {
    id: "stud-soslan",
    organizationId: orgId,
    name: "Сослан Болотаев",
    age: 17,
    photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&fit=crop&q=80",
    branchId: "branch-almaty",
    groupIds: ["group-almaty-ensemble"],
    teacherId: "teach-aslan",
    parentName: "Алина Болотаева",
    parentPhone: "+7 (701) 400-30-30",
    guardians: [initialGuardians[0]],
    balance: 15000,
    artistLevel: ArtistLevel.SOLOIST,
    artistLevelPoints: 850,
    achievements: [],
    performances: [],
    notes: [],
    attendance: {},
    subscriptions: [
      { id: "sub-1", studentId: "stud-soslan", name: "Абонемент Ансамбль (12 занятий)", price: 4500, lessonsTotal: 12, lessonsLeft: 8, validUntil: "2026-06-25", isAutoRenew: true, status: "active" }
    ]
  },
  {
    id: "stud-alan",
    organizationId: orgId,
    name: "Алан Дзагоев",
    age: 16,
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&fit=crop&q=80",
    branchId: "branch-astana",
    groupIds: ["group-almaty-ensemble"],
    teacherId: "teach-aslan",
    parentName: "Хетаг Дзагоев",
    parentPhone: "+7 (701) 333-55-77",
    guardians: [initialGuardians[1]],
    balance: -45000,
    artistLevel: ArtistLevel.SCHOOL_REPRESENTATIVE,
    artistLevelPoints: 512,
    achievements: [],
    performances: [],
    notes: [],
    attendance: {},
    subscriptions: [
      { id: "sub-2", studentId: "stud-alan", name: "Абонемент Ансамбль (12 занятий)", price: 4500, lessonsTotal: 12, lessonsLeft: 0, validUntil: "2026-05-30", isAutoRenew: false, status: "expired" }
    ],
    paymentStatus: "В ожидании оплаты"
  }
];

export const initialAnnouncements: Announcement[] = [
  {
    id: "ann-1",
    organizationId: orgId,
    title: "Большой Летний Концерт в Алматы!",
    content: "Уважаемые ученики, родители и преподаватели! 25 июня состоится нашему годовому отчетному концерту во Дворце Республики Алматы. Репетиции для сборного ансамбля будут проходить ежедневно с 18:00. Присутствие обязательно всем солистам и кандидатам!",
    date: "2026-05-28",
    authorId: "owner-1",
    authorName: "Асланбек Болотаев",
    authorRole: "Владелец",
    likes: 24,
    isImportant: true
  }
];

export const initialPayments: Payment[] = [
  { id: "p-pay-1", organizationId: orgId, branchId: "branch-almaty", studentId: "stud-soslan", amount: 45000, date: "2026-05-24", type: "subscription", description: "Оплата абонемента Ансамбль №1", method: "card", status: "paid" }
];

export const initialFinanceTransactions: FinanceTransaction[] = [
  {
    id: "ft-1",
    organizationId: orgId,
    branchId: "branch-almaty",
    studentId: "stud-soslan",
    paymentId: "p-pay-1",
    amount: 45000,
    type: "income",
    category: "tuition",
    description: "Оплата абонемента Ансамбль №1",
    createdAt: "2026-05-24T10:00:00Z"
  }
];

export const initialAuditLogs: AuditLog[] = [
  { id: "log-1", organizationId: orgId, timestamp: "2026-05-31T09:12:00Z", userEmail: "owner@danceos.ru", userRole: "Владелец", action: "Просмотр консолидированного финансового отчета", details: "Успешная выгрузка за май 2026 года" }
];

// Helper to generate Achievements for students
export const getAvailableAchievements = (count: number = 7): Achievement[] => [
  { id: "ach-1", title: "Первый шаг на паркете", description: "Посетил первое ознакомительное занятие", category: "attendance", unlockedAt: "2026-01-15", iconName: "Flame" },
  { id: "ach-2", title: "Молодой Горец", description: "Успешно прошел 10 тренировок", category: "attendance", unlockedAt: "2026-02-28", iconName: "Compass" },
  { id: "ach-3", title: "Храбрый Джигит", description: "Успешно прошел 50 тренировок", category: "attendance", unlockedAt: "2026-05-10", iconName: "TrendingUp" },
  { id: "ach-4", title: "Легенда Посещаемости", description: "Пройти 100 тренировок в академии", category: "attendance", iconName: "Award" },
  { id: "ach-5", title: "Огонь Очага", description: "Первое сольное или групповое выступление перед публикой", category: "performance", unlockedAt: "2026-04-12", iconName: "Sparkles" },
  { id: "ach-6", title: "Вершина Эльбруса", description: "Победа или призовое место на народном фестивале", category: "performance", iconName: "Milestone" },
  { id: "ach-7", title: "Преданность Кавказу", description: "Целый год обучения без единого неуважительного пропуска", category: "time", iconName: "Heart" }
];

export function getExecutiveSummary(
  branches: Branch[],
  groups: Group[],
  students: Student[],
  payments: Payment[]
): ExecutiveSummary {
  return {
    todayRevenue: 4500,
    thisMonthRevenue: 124000,
    activeStudentsTotal: students.length + 154,
    activeSubscriptionsCount: 148,
    overallAttendanceRate: 94,
    churnRate: 1.8,
    newRegistrationsToday: 4,
    branchMetrics: branches.map(b => ({
      branchId: b.id,
      branchName: b.name,
      studentsCount: students.filter(s => s.branchId === b.id).length + 20,
      revenue: 140000,
      attendanceRate: 95,
      capacityRate: 80
    })),
    teacherPerformance: [
      {
        teacherId: "teach-aslan",
        teacherName: "Аслан Плиев",
        studentsCount: 65,
        retentionRate: 97.4,
        averageAttendance: 94.2
      }
    ]
  };
}

export const initialCompetitions: Competition[] = [];

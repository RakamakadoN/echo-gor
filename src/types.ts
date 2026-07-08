/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ArtistLevel {
  FIRST_STEP = "Первый шаг",
  ENSEMBLE_STUDENT = "Ученик ансамбля",
  PERFORMANCE_MEMBER = "Участник выступлений",
  SCHOOL_REPRESENTATIVE = "Представитель школы",
  SOLOIST = "Солист",
  SENIOR_STUDENT = "Старший ученик",
  ACADEMY_LEGEND = "Легенда школы"
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  city: string;
  address: string;
  managerName: string;
  phone: string;
  hallsCount: number;
  comment?: string; // ТЗ §2.4 — комментарий к филиалу
  status?: string; // active | archived
}

export interface Hall {
  id: string;
  branchId: string;
  name: string;
  capacity: number;
  description?: string; // ТЗ §6.1 — описание зала
  status?: string; // active | archived
}

export interface Teacher {
  id: string;
  organizationId: string;
  name: string;
  photoUrl: string;
  specialties: string[];
  phone: string;
  bio: string;
  experienceYears: number;
  branchId?: string | null;
  role?: "teacher" | "admin" | "branch_manager" | "owner";
}

export interface Guardian {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string;
  email?: string;
  telegram?: string;
}

export interface Group {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  teacherId: string;
  hallId: string;
  scheduleText: string;
  days: string[]; // e.g., ["Пн", "Ср", "Пт"]
  time: string; // e.g., "18:30"
  ageGroup: string; // e.g., "7-12 лет", "16+ лет"
  ageFrom?: number | null;
  ageTo?: number | null;
  capacity?: number; // вместимость группы (для расчёта заполняемости)
  level: string; // e.g., "Начинающие", "Продолжающие", "Ансамбль"
  startDate?: string | null; // период работы группы — дата начала
  endDate?: string | null;   // период работы группы — дата окончания
  studentCount: number;
}

// Статусы посещения (ТЗ §5): Был / Не был / Уважительная причина / Перерасчёт / Не отмечено.
// 'sick' оставлен для обратной совместимости со старыми отметками.
export type AttendanceStatus =
  | 'present'   // Был
  | 'absent'    // Не был
  | 'excused'   // Уважительная причина
  | 'recalc'    // Перерасчёт
  | 'trial'     // Пробный урок
  | 'sick'      // legacy
  | 'unmarked'; // Не отмечено

// Причины отсутствия (ТЗ §6).
export type AbsenceReason =
  | 'illness'      // Болезнь
  | 'certificate'  // Справка
  | 'left'         // Уехал
  | 'family'       // Семейные обстоятельства
  | 'no_notice'    // Не предупредил
  | 'other';       // Другое

export interface Attendance {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy?: string;
  note?: string;
  absenceReason?: AbsenceReason | null;
  isTrial?: boolean;
  trialOutcome?: 'pending' | 'converted' | 'lost' | null;
}

// Перерасчёт (ТЗ §10). Заморозок нет — используется перерасчёт.
export interface Recalculation {
  id: string;
  organizationId?: string;
  branchId?: string | null;
  studentId: string;
  studentName?: string;
  subscriptionId?: string | null;
  periodFrom?: string | null; // YYYY-MM-DD
  periodTo?: string | null;   // YYYY-MM-DD
  lessonsCount: number;
  reason?: AbsenceReason | string | null;
  amount: number;
  comment?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  status: 'pending' | 'applied' | 'cancelled';
  createdByName?: string | null;
  createdAt?: string;
  appliedAt?: string | null;
}

// Запись в KPI «Педагоги не закрыли журнал» (ТЗ §3).
export interface OpenJournalAlert {
  lessonId: string;
  groupId: string;
  groupName: string;
  teacherId?: string | null;
  teacherName: string;
  branchId?: string | null;
  startsAt: string;
  endsAt: string;
  timeLabel: string;       // «14:30 – 16:00»
  unmarkedCount: number;
  minutesOverdue: number;  // минут после окончания занятия
}

// Сводка дашборда журнала (ТЗ §2). Каждый показатель отдаёт и число, и список id.
export interface JournalDashboard {
  rangeFrom: string;
  rangeTo: string;
  visited: { count: number; studentIds: string[] };           // Посетили занятия
  unpaid: { count: number; studentIds: string[] };            // Посещают без оплаты
  trialNotBought: { count: number; studentIds: string[] };    // Были на ПУ и не купили
  trialBought: { count: number; studentIds: string[] };       // Были на ПУ и сразу купили
  openJournals: OpenJournalAlert[];                           // Группы без отметок / KPI педагогов
}

// Статистика посещаемости по группе (ТЗ §11).
export interface JournalGroupStats {
  groupId: string;
  lessonsCount: number;
  visitsCount: number;
  missesCount: number;
  avgAttendance: number;     // среднее число учеников на занятии
  attendanceRate: number;    // процент посещаемости 0..100
  frequentMissers: { studentId: string; name: string; misses: number }[];
  noMissStudents: { studentId: string; name: string }[];
}

export interface FinanceTransaction {
  id: string;
  organizationId: string;
  branchId?: string;
  studentId?: string;
  paymentId?: string;
  amount: number;
  type: 'income' | 'expense' | 'debit';
  category?: string;
  description: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  organizationId: string;
  branchId: string;
  studentId: string;
  amount: number;
  date: string;
  type: 'subscription' | 'single' | 'uniform' | 'concert';
  description: string;
  method: 'card' | 'cash' | 'transfer' | 'kaspi';
  status: 'paid' | 'pending';
}

export interface Subscription {
  id: string;
  studentId: string;
  name: string; // e.g., "Стандартный 12 занятий"
  price: number;
  lessonsTotal: number;
  lessonsLeft: number;
  validUntil: string;
  isAutoRenew: boolean;
  status: 'active' | 'expired' | 'suspended' | 'deleted';
  cancelReason?: string | null;
  cancelComment?: string | null;
  deletedBy?: string | null;
  deletedAt?: string | null;
  startsOn?: string; // YYYY-MM-DD, дата начала
  discountAmount?: number; // скидка + перерасчёт, тг
  groupId?: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string; // date unlocked, or undefined if locked
  category: 'attendance' | 'performance' | 'skill' | 'time';
  iconName: string; // lucide icon identifier
}

export interface PerformanceParticipation {
  id: string;
  eventName: string;
  date: string;
  role: string; // e.g., "Сольное исполнение (Лезгинка)", "Общий танец (Симд)"
  location: string;
  achievedRank?: string; // e.g., "Лауреат I степени"
  mediaUrl?: string; // Photo/Video link
  mediaType?: 'photo' | 'video';
}

export interface Homework {
  id: string;
  groupId: string;
  title: string;
  description: string;
  dueDate: string;
  videoUrl?: string;
  linkUrl?: string;
  createdAt: string;
  status: 'assigned' | 'viewed' | 'completed' | 'overdue';
}

export interface StudentProgressNote {
  id: string;
  date: string;
  teacherId: string;
  teacherName: string;
  content: string;
  isPrivate: boolean; // if true, only admins and owner can see it
}

export interface Student {
  id: string;
  organizationId: string;
  name: string;
  age: number;
  photoUrl: string;
  branchId: string;
  groupIds: string[]; // Updated for multiple groups
  teacherId: string;
  guardians?: Guardian[]; // Updated for separate guardian entity
  parentName: string; // Keep for legacy/simple compatibility
  parentPhone: string; // Keep for legacy/simple compatibility
  balance: number; // Positive is credit, negative is outstanding debt
  artistLevel: ArtistLevel;
  artistLevelPoints: number; // e.g., 450 out of 1000 for next rank
  achievements: Achievement[];
  performances: PerformanceParticipation[];
  notes: StudentProgressNote[];
  attendance: { [date: string]: Attendance }; // keyed by date (YYYY-MM-DD)
  subscriptions: Subscription[];
  paymentStatus?: string;
  createdAt?: string; // дата регистрации ученика (ISO), для метрики «новые ученики»
  status?: string; // статус из БД: lead|trial|active|paused|debt|left|archived
  manualStatus?: string | null; // ручной статус (ТЗ §7): Каникулы, Лист ожидания, ...
  computedStatus?: string | null; // автостатус (ТЗ §5–6): no_status|trial|active|debt|expired|archived|trash|<ручной>
  returned?: boolean; // признак вернувшегося ученика (фиолетовый, ТЗ §2)
  payLater?: boolean; // ручной статус «Оплатит позже» (Журнал §8, §9)
  payPromiseDate?: string | null; // дата обещанной оплаты для статуса «Был на пробном, оплатит» (дожим)
  gender?: "male" | "female" | null; // пол (ТЗ «Ученики»: окно нового ученика)
  birthday?: string | null; // дата рождения (YYYY-MM-DD) — для авто-расчёта возраста
  phone?: string; // личный телефон ученика
  sourceId?: string | null; // источник (lead_sources.id): откуда о нас узнали
  comment?: string; // свободный комментарий
  waitlistAddedAt?: string | null; // дата постановки в активный лист ожидания (если в нём состоит)
  archivedAt?: string | null; // дата перевода в архив (если в архиве); данные сохраняются
  archiveReason?: string | null; // «Почему он ушёл?» (обязателен при архивации)
  archiveComment?: string | null; // свободный комментарий при архивации
  archivedBy?: string | null; // кто перевёл в архив
}

/**
 * Пункт листа ожидания (ТЗ «Ученики» → «Лист ожидания»).
 * Хранит желаемый филиал/группу и дату постановки в очередь; приоритет
 * вычисляется из added_at. removedAt != null означает архивную (историческую) запись.
 */
export interface WaitlistEntry {
  id: string;
  studentId: string;
  branchId?: string | null;
  groupId?: string | null;
  comment?: string | null;
  addedAt: string; // ISO — дата постановки в лист ожидания
  removedAt?: string | null;
  removedReason?: string | null;
}

export type AnnouncementAudience = "all" | "branches" | "teachers" | "parents" | "students";

export interface Announcement {
  id: string;
  organizationId: string;
  title: string;
  content: string;
  date: string;
  authorId: string;
  authorName: string;
  authorRole: string; // e.g., "Владелец", "Директор", "Преподаватель"
  branchId?: string; // if undefined, visible network-wide
  audience: AnnouncementAudience;
  likes: number;
  isImportant: boolean;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  timestamp: string;
  userEmail: string;
  userRole: string;
  action: string;
  details: string;
  ip?: string;
}

export interface ExecutiveSummary {
  todayRevenue: number;
  thisMonthRevenue: number;
  activeStudentsTotal: number;
  activeSubscriptionsCount: number;
  overallAttendanceRate: number; // e.g., 92%
  churnRate: number; // e.g., 2.4%
  newRegistrationsToday: number;
  branchMetrics: {
    branchId: string;
    branchName: string;
    studentsCount: number;
    revenue: number;
    attendanceRate: number;
    capacityRate: number;
  }[];
  teacherPerformance: {
    teacherId: string;
    teacherName: string;
    studentsCount: number;
    retentionRate: number;
    averageAttendance: number;
  }[];
}

export type AdminTaskStatus = "new" | "in_progress" | "done" | "cancelled" | "overdue";
export type AdminTaskPriority = "low" | "normal" | "high";

export interface AdminTask {
  id: string;
  branchId?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  assignedTo?: string | null;
  title: string;
  description?: string | null;
  status: AdminTaskStatus;
  priority: AdminTaskPriority;
  dueAt?: string | null; // YYYY-MM-DD
  completedAt?: string | null;
  createdAt?: string | null;
}

export type DirectoryStatus = "active" | "inactive" | "archived";

export interface SubscriptionPlan {
  id: string;
  name: string;
  lessonsCount: number;
  durationDays: number;
  price: number;
  status: DirectoryStatus;
}

export interface LeadSource {
  id: string;
  name: string;
  status: DirectoryStatus;
}

export interface Competition {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  level: "regional" | "republican"; // региональный / республиканский
  scope: "kazakhstan" | "cis"; // Казахстан / СНГ
  location: string;
  prizePool?: string;
  registeredGroupIds: string[]; // Ensemble group IDs planned
  status: "registering" | "rehearsals" | "completed";
  rehearsalSlots?: { [groupId: string]: string[] }; // Map of groupId to list of day-time descriptions
  responsibleTeacherId?: string; // Преподаватель, ответственный за концерт
  participantStudentIds?: string[]; // Ученики, участвующие в концерте
}


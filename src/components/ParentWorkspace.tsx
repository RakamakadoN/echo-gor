import React, { useMemo, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  Heart,
  HeartHandshake,
  Image,
  Library,
  MessageSquare,
  PenLine,
  PlayCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Video,
  Wand2,
  ShoppingBag
} from "lucide-react";
import { Announcement, Group, Student, Teacher } from "../types";

type QuestStatusKey = "in_progress" | "awaiting" | "confirmed";

interface BackendQuest {
  id: string;
  title: string;
  category: string;
  reward: string;
  minutes?: string;
  status: string; // русская подпись из бэкенда
  statusKey?: QuestStatusKey;
}

interface ParentWorkspaceProps {
  students: Student[];
  groups: Group[];
  teachers: Teacher[];
  announcements: Announcement[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onRenewSubscription: (student: Student) => void;
  readOnlyPreview?: boolean;
  // Когда задано (Supabase-режим) — квесты идут через бэкенд (family_quests).
  backendQuests?: BackendQuest[];
  onCreateQuest?: (quest: { title: string; category?: string; reward?: string; minutes?: string }) => Promise<boolean>;
  onUpdateQuestStatus?: (id: string, status: QuestStatusKey) => Promise<boolean>;
}

type ParentTab = "home" | "child" | "quests" | "feed" | "library" | "shop" | "ai";

const parentTabs: { id: ParentTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: "home", label: "Главная", short: "Главная", icon: Heart },
  { id: "child", label: "Мой ребенок", short: "Ребенок", icon: UserRound },
  { id: "quests", label: "Квесты", short: "Квесты", icon: CheckCircle },
  { id: "feed", label: "Лента", short: "Лента", icon: Star },
  { id: "library", label: "Библиотека", short: "Книги", icon: Library },
  { id: "shop", label: "Магазин", short: "Магазин", icon: ShoppingBag },
  { id: "ai", label: "AI помощник", short: "AI", icon: Wand2 }
];

const questCatalog = [
  { title: "Помочь маме дома", category: "помощь семье", minutes: "15 мин", reward: "Помощник семьи" },
  { title: "Прочитать 10 страниц", category: "чтение", minutes: "20 мин", reward: "Читатель недели" },
  { title: "Сделать зарядку", category: "физическая активность", minutes: "10 мин", reward: "Чемпион дисциплины" },
  { title: "Убрать комнату", category: "ответственность", minutes: "15 мин", reward: "Мастер порядка" },
  { title: "Помочь младшему брату", category: "уважение к старшим", minutes: "20 мин", reward: "Защитник семьи" },
  { title: "Выучить танцевальное движение", category: "развитие характера", minutes: "12 мин", reward: "Семейная гордость" },
  { title: "Выучить стихотворение", category: "творчество", minutes: "25 мин", reward: "Мастер добрых дел" },
  { title: "Подготовить форму к занятию", category: "дисциплина", minutes: "5 мин", reward: "Ответственный артист" }
];

const libraryItems = [
  { title: "Как мотивировать ребенка 8 лет заниматься", category: "мотивация", format: "Совет", time: "2 мин" },
  { title: "Дисциплина без давления", category: "дисциплина", format: "Статья", time: "5 мин" },
  { title: "Как поддержать перед выступлением", category: "уверенность", format: "Видео", time: "4 мин" },
  { title: "Работа с эмоциями после неудачи", category: "эмоции", format: "Подборка", time: "7 мин" },
  { title: "Ответственность через семейные задания", category: "характер", format: "Совет", time: "3 мин" },
  { title: "Отношения родителей и детей в период репетиций", category: "семья", format: "Статья", time: "6 мин" }
];

export function ParentWorkspace({
  students,
  groups,
  teachers,
  announcements,
  selectedStudentId,
  onSelectStudent,
  onRenewSubscription,
  readOnlyPreview = false,
  backendQuests,
  onCreateQuest,
  onUpdateQuestStatus
}: ParentWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ParentTab>("home");
  const [localQuests, setLocalQuests] = useState([
    { id: "quest-1", title: "Сделать зарядку", category: "физическая активность", status: "Ждет подтверждения", reward: "Чемпион дисциплины", statusKey: "awaiting" as QuestStatusKey },
    { id: "quest-2", title: "Подготовить форму к занятию", category: "дисциплина", status: "В процессе", reward: "Ответственный артист", statusKey: "in_progress" as QuestStatusKey }
  ]);

  // Источник истины: бэкенд (Supabase) если задан, иначе локальный state (mock/preview).
  const useBackend = Array.isArray(backendQuests);
  const activeQuests = useBackend ? backendQuests! : localQuests;

  const student = students.find((item) => item.id === selectedStudentId) || students[0];
  const group = groups.find((item) => item.id === (student?.groupIds?.[0] || (student as any)?.groupId));
  const teacher = teachers.find((item) => item.id === student?.teacherId);
  const subscription = student?.subscriptions?.[0];

  const attendanceStats = useMemo(() => {
    const records = Object.values(student?.attendance || {});
    const present = records.filter((item) => item.status === "present").length;
    const total = records.filter((item) => item.status !== "unmarked").length || 1;
    return { present, total, rate: Math.round((present / total) * 100) };
  }, [student]);

  if (!student) return null;

  const nextPerformance = student.performances?.[0] || {
    id: "family-stage",
    eventName: "Весенний концерт ансамбля",
    date: "2026-06-18",
    role: "Групповой номер",
    location: "Городской дом культуры"
  };

  const QUEST_LABEL: Record<QuestStatusKey, string> = {
    in_progress: "В процессе",
    awaiting: "Ждет подтверждения",
    confirmed: "Подтверждено"
  };

  // Перевод статуса: in_progress → awaiting → confirmed.
  const setQuestStatus = async (id: string, status: QuestStatusKey) => {
    if (readOnlyPreview) return;
    if (useBackend && onUpdateQuestStatus) {
      await onUpdateQuestStatus(id, status);
      return;
    }
    setLocalQuests((prev) => prev.map((quest) => quest.id === id ? { ...quest, status: QUEST_LABEL[status], statusKey: status } : quest));
  };

  const confirmQuest = (id: string) => setQuestStatus(id, "confirmed");
  const markQuestDone = (id: string) => setQuestStatus(id, "awaiting");

  const addQuest = async (quest: (typeof questCatalog)[number]) => {
    if (readOnlyPreview) return;
    if (useBackend && onCreateQuest) {
      await onCreateQuest({ title: quest.title, category: quest.category, reward: quest.reward, minutes: quest.minutes });
      return;
    }
    setLocalQuests((prev) => [
      { id: `quest-${Date.now()}`, title: quest.title, category: quest.category, status: "В процессе", reward: quest.reward, statusKey: "in_progress" },
      ...prev
    ]);
  };

  return (
    <div className="min-h-full bg-[#0A0A0A] text-slate-200">
      <main className="mx-auto max-w-[1320px] space-y-5 px-4 pb-24 pt-4 md:px-6 md:pb-8">
        {readOnlyPreview && (
          <section className="rounded-3xl border border-[#C5A059]/30 bg-[#C5A059]/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Preview слоя наследия</p>
            <p className="mt-2 text-sm text-slate-200">
              Семейный кабинет сохранен как read-only preview. В Эхо Гор 1.0 рабочий фокус: деньги, посещаемость и коммуникация.
            </p>
          </section>
        )}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
          <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-[#C5A059]/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-4">
              <img src={student.photoUrl} alt={student.name} className="h-20 w-20 rounded-3xl border border-[#C5A059]/40 object-cover shadow-2xl" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C5A059]">Семейный путь артиста</p>
                <h1 className="mt-1 text-3xl font-black text-white">{student.name}</h1>
                <p className="mt-1 text-sm text-slate-400">{group?.name || "Группа"} • {teacher?.name || "Преподаватель"}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={student.id}
                onChange={(event) => onSelectStudent(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#C5A059]"
              >
                {students.slice(0, 5).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button
                onClick={() => setActiveTab("quests")}
                disabled={readOnlyPreview}
                className={`rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider ${readOnlyPreview ? "cursor-not-allowed bg-white/10 text-slate-500" : "bg-[#C5A059] text-black"}`}
              >
                {readOnlyPreview ? "Скоро" : "Создать квест"}
              </button>
            </div>
          </div>
        </section>

        <nav className="hidden gap-2 overflow-x-auto pb-1 md:flex">
          {parentTabs.map((tab) => <ParentNavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />)}
        </nav>

        {activeTab === "home" && (
          <HomeView
            student={student}
            group={group}
            teacher={teacher}
            subscription={subscription}
            attendanceStats={attendanceStats}
            nextPerformance={nextPerformance}
            announcements={announcements}
            onRenewSubscription={readOnlyPreview ? undefined : onRenewSubscription}
            activeQuests={activeQuests}
            setActiveTab={setActiveTab}
            readOnlyPreview={readOnlyPreview}
          />
        )}

        {activeTab === "child" && <ChildStoryView student={student} attendanceStats={attendanceStats} nextPerformance={nextPerformance} />}
        {activeTab === "quests" && <FamilyQuestsView quests={activeQuests} onConfirm={confirmQuest} onMarkDone={markQuestDone} onAddQuest={addQuest} readOnlyPreview={readOnlyPreview} />}
        {activeTab === "feed" && <FamilyFeedView student={student} quests={activeQuests} nextPerformance={nextPerformance} />}
        {activeTab === "library" && <ParentLibraryView />}
        {activeTab === "shop" && <ParentShopView />}
        {activeTab === "ai" && <ParentAiView student={student} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-white/10 bg-[#080808]/95 px-1.5 py-2 backdrop-blur-xl md:hidden">
        {parentTabs.map((tab) => <ParentMobileNav key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />)}
      </nav>
    </div>
  );
}

function HomeView({ student, group, teacher, subscription, attendanceStats, nextPerformance, announcements, onRenewSubscription, activeQuests, setActiveTab, readOnlyPreview }: any) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <InfoCard icon={<CalendarDays />} title="Сегодняшнее занятие" accent="Сегодня, 18:00">
          <p className="text-sm font-bold text-white">{group?.scheduleText || "Пн / Ср / Пт"} • {group?.level || "Ансамбль"}</p>
          <p className="mt-1 text-xs text-slate-400">Прийти за 15 минут до начала. Форма обязательна.</p>
        </InfoCard>

        <InfoCard icon={<Clock />} title="Следующее занятие" accent="Пятница, 18:00">
          <p className="text-sm font-bold text-white">{teacher?.name || "Преподаватель"} продолжит подготовку к выступлению.</p>
          <p className="mt-1 text-xs text-slate-400">Можно поддержать ребенка короткой домашней репетицией.</p>
        </InfoCard>

        <InfoCard icon={<Trophy />} title="Ближайшее выступление" accent={nextPerformance.date}>
          <p className="text-sm font-bold text-white">{nextPerformance.eventName}</p>
          <p className="mt-1 text-xs text-slate-400">{nextPerformance.location} • {nextPerformance.role}</p>
        </InfoCard>

        <section className="rounded-[2rem] border border-[#C5A059]/25 bg-[#C5A059]/10 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C5A059]">Миссия месяца</p>
          <h2 className="mt-2 text-2xl font-black text-white">Месяц уважения</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">4 семейных задания помогут ребенку почувствовать связь дисциплины, дома и ансамбля.</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30"><div className="h-full w-[45%] rounded-full bg-[#C5A059]" /></div>
          <p className="mt-2 text-xs text-slate-500">2 из 5 заданий выполнены</p>
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Посещаемость</p>
          <p className="mt-2 text-4xl font-black text-emerald-400">{attendanceStats.rate}%</p>
          <p className="mt-1 text-xs text-slate-400">{attendanceStats.present} из {attendanceStats.total} посещений</p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <CreditCard className="h-5 w-5 text-[#C5A059]" />
          <h3 className="mt-3 font-black text-white">{subscription?.name || "Абонемент"}</h3>
          <p className="mt-1 text-xs text-slate-400">Осталось занятий: <strong className="text-white">{subscription?.lessonsLeft ?? 0}</strong></p>
          <button
            onClick={() => onRenewSubscription?.(student)}
            disabled={readOnlyPreview}
            className={`mt-4 w-full rounded-2xl px-4 py-3 text-xs font-black uppercase ${readOnlyPreview ? "cursor-not-allowed bg-white/10 text-slate-500" : "bg-[#C5A059] text-black"}`}
          >
            {readOnlyPreview ? "Продление в MVP через администратора" : "Продлить"}
          </button>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white">Квесты ждут</h3>
            <button onClick={() => setActiveTab("quests")} className="text-xs font-bold text-[#C5A059]">Открыть</button>
          </div>
          <div className="mt-4 space-y-2">
            {activeQuests.slice(0, 2).map((quest: any) => <MiniRow key={quest.id} title={quest.title} meta={quest.status} />)}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="font-black text-white">Объявления</h3>
          <div className="mt-4 space-y-2">
            {announcements.slice(0, 2).map((item: Announcement) => <MiniRow key={item.id} title={item.title} meta={item.authorName} />)}
            <MiniRow title="Сообщение преподавателя" meta="Подготовить форму к пятнице" />
          </div>
        </section>
      </div>
    </div>
  );
}

function ChildStoryView({ student, attendanceStats, nextPerformance }: any) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <div className="flex items-start gap-4">
          <img src={student.photoUrl} alt={student.name} className="h-28 w-28 rounded-[1.75rem] object-cover" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">Цифровая история ребенка</p>
            <h2 className="mt-1 text-2xl font-black text-white">{student.artistLevel}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">Ваш ребенок сделал еще один шаг вперед. Здесь сохраняются достижения, концерты, дипломы и личный путь роста.</p>
          </div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${Math.min(student.artistLevelPoints / 10, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">{student.artistLevelPoints} очков личного пути. Сравнение только с самим собой.</p>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Паспорт развития</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Посещаемость" value={`${attendanceStats.rate}%`} />
          <Stat label="Достижений" value={student.achievements.length} />
          <Stat label="Концертов" value={student.performances.length} />
          <Stat label="Дипломы" value="2" />
          <Stat label="Сертификаты" value="3" />
          <Stat label="Следующая сцена" value={nextPerformance.date} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5 lg:col-span-2">
        <h3 className="font-black text-white">Достижения, дипломы и сертификаты</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {student.achievements.slice(0, 6).map((achievement: any) => (
            <div key={achievement.id} className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <Award className="h-5 w-5 text-[#C5A059]" />
              <p className="mt-3 text-sm font-black text-white">{achievement.title}</p>
              <p className="mt-1 text-xs text-slate-500">{achievement.unlockedAt || "В процессе"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FamilyQuestsView({ quests, onConfirm, onMarkDone, onAddQuest, readOnlyPreview }: any) {
  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-[#C5A059]/10 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C5A059]">Семейные квесты</p>
        <h2 className="mt-2 text-2xl font-black text-white">Родитель создает. Ребенок выполняет. Семья подтверждает.</h2>
        <p className="mt-2 text-sm text-slate-300">Квесты не наказание, а мягкая поддержка дисциплины, уважения, ответственности и характера.</p>
        {readOnlyPreview && <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#C5A059]">Coming Soon: в 1.0 этот модуль доступен только для просмотра.</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
          <h3 className="font-black text-white">Активные квесты</h3>
          <div className="mt-4 space-y-3">
            {quests.map((quest: any) => (
              <div key={quest.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{quest.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{quest.category} • награда: {quest.reward}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${quest.status === "Подтверждено" ? "bg-emerald-500/10 text-emerald-400" : "bg-[#C5A059]/10 text-[#C5A059]"}`}>{quest.status}</span>
                </div>
                {quest.status === "В процессе" && (
                  <button
                    onClick={() => onMarkDone(quest.id)}
                    disabled={readOnlyPreview}
                    className={`mt-4 rounded-2xl px-4 py-2 text-xs font-black uppercase ${readOnlyPreview ? "cursor-not-allowed bg-white/10 text-slate-500" : "border border-[#C5A059]/40 text-[#C5A059]"}`}
                  >
                    {readOnlyPreview ? "Скоро" : "Отметить выполненным"}
                  </button>
                )}
                {quest.status === "Ждет подтверждения" && (
                  <button
                    onClick={() => onConfirm(quest.id)}
                    disabled={readOnlyPreview}
                    className={`mt-4 rounded-2xl px-4 py-2 text-xs font-black uppercase ${readOnlyPreview ? "cursor-not-allowed bg-white/10 text-slate-500" : "bg-[#C5A059] text-black"}`}
                  >
                    {readOnlyPreview ? "Скоро" : "Подтвердить выполнение"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="font-black text-white">Готовая библиотека квестов</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {questCatalog.map((quest) => (
              <button
                key={quest.title}
                onClick={() => onAddQuest(quest)}
                disabled={readOnlyPreview}
                className={`rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition ${readOnlyPreview ? "cursor-not-allowed opacity-70" : "hover:border-[#C5A059]/40"}`}
              >
                <p className="text-sm font-black text-white">{quest.title}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#C5A059]">{quest.category}</p>
                <p className="mt-2 text-xs text-slate-500">{quest.minutes} • {quest.reward}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FamilyFeedView({ student, quests, nextPerformance }: any) {
  const feed = [
    { title: "Ваш ребенок сделал еще один шаг вперед", meta: student.achievements[0]?.title || "Новое достижение", icon: <Sparkles /> },
    { title: "Квест выполнен", meta: quests[0]?.title || "Семейное задание", icon: <CheckCircle /> },
    { title: "Ближайшее выступление", meta: `${nextPerformance.eventName} • ${nextPerformance.date}`, icon: <Trophy /> },
    { title: "Новая награда", meta: "Семейная гордость", icon: <HeartHandshake /> },
    { title: "Фото с репетиции", meta: "Добавлено в семейный архив", icon: <Image /> }
  ];
  return (
    <div className="space-y-3">
      {feed.map((item) => (
        <div key={item.title} className="flex gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">{item.icon}</div>
          <div>
            <p className="font-black text-white">{item.title}</p>
            <p className="mt-1 text-sm text-slate-400">{item.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ParentLibraryView() {
  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C5A059]">Библиотека родителей</p>
        <h2 className="mt-2 text-2xl font-black text-white">Короткие материалы для спокойного воспитания</h2>
        <p className="mt-2 text-sm text-slate-400">Воспитание, дисциплина, мотивация, эмоции, ответственность, уверенность и отношения с ребенком.</p>
      </section>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {libraryItems.map((item) => (
          <article key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <BookOpen className="h-6 w-6 text-[#C5A059]" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-wider text-[#C5A059]">{item.category} • {item.format}</p>
            <h3 className="mt-2 font-black text-white">{item.title}</h3>
            <p className="mt-2 text-xs text-slate-500">Время: {item.time}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

// Магазин студии для родителя/ученика: товары с фото (генерируются нейросетью),
// корзина и оформление заказа (заявка обрабатывается администратором).
function ParentShopView() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", comment: "" });
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fmt = (n: number) => `${(n || 0).toLocaleString("ru-RU")} ₸`;

  React.useEffect(() => {
    let alive = true;
    fetch("/api/mvp/shop", { headers: { "x-demo-role": "parent" } })
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d) => { if (alive) setProducts(d.products || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const list = products.filter((p) => !cat || p.category === cat);
  const setQty = (id: string, qty: number) => setCart((c) => { const n = { ...c }; if (qty <= 0) delete n[id]; else n[id] = qty; return n; });
  const add = (id: string) => setQty(id, (cart[id] || 0) + 1);
  const cartLines = Object.entries(cart).map(([id, qty]) => { const p = products.find((x) => x.id === id); return p ? { id, name: p.name, qty, price: p.salePrice, amount: qty * p.salePrice } : null; }).filter(Boolean) as any[];
  const cartTotal = cartLines.reduce((s, l) => s + l.amount, 0);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  const placeOrder = async () => {
    if (cartLines.length === 0) return;
    if (!form.customerName.trim() || !form.customerPhone.trim()) { setErr("Укажите имя и телефон"); return; }
    setPlacing(true); setErr(null);
    try {
      const res = await fetch("/api/mvp/shop/orders", {
        method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": "parent" },
        body: JSON.stringify({ items: cartLines.map((l) => ({ productId: l.id, qty: l.qty })), customerName: form.customerName, customerPhone: form.customerPhone, comment: form.comment }),
      });
      if (!res.ok) { const t = await res.json().catch(() => ({})); throw new Error(t.error || "Не удалось оформить заказ"); }
      setPlaced({ total: cartTotal }); setCart({}); setCheckout(false);
    } catch (e: any) { setErr(e?.message || "Ошибка оформления"); }
    finally { setPlacing(false); }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C5A059]">Магазин студии</p>
        <h2 className="mt-2 text-2xl font-black text-white">Форма, мерч и аксессуары «Эхо Гор»</h2>
        <p className="mt-2 text-sm text-slate-400">Соберите корзину и оформите заказ — администратор вашего филиала свяжется для подтверждения и выдачи.</p>
        {cats.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button onClick={() => setCat("")} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${cat === "" ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-300"}`}>Все</button>
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${cat === c ? "bg-[#C5A059] text-black" : "border border-white/10 bg-white/[0.04] text-slate-300"}`}>{c}</button>
            ))}
          </div>
        )}
      </section>

      {placed && (
        <section className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <CheckCircle className="mx-auto h-8 w-8 text-emerald-400" />
          <p className="mt-2 font-black text-white">Заказ оформлен!</p>
          <p className="mt-1 text-sm text-slate-300">Сумма {fmt(placed.total)}. Администратор свяжется с вами для подтверждения.</p>
          <button onClick={() => setPlaced(null)} className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-200">Продолжить покупки</button>
        </section>
      )}

      {loading ? (
        <p className="px-1 text-sm text-slate-500">Загрузка магазина…</p>
      ) : list.length === 0 ? (
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">Товары скоро появятся.</section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]">
              <div className="aspect-square w-full bg-white/5">
                {p.photoUrl
                  ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-slate-600"><ShoppingBag className="h-10 w-10" /></div>}
              </div>
              <div className="p-4">
                {p.category && <p className="text-[10px] font-black uppercase tracking-wider text-[#C5A059]">{p.category}</p>}
                <h3 className="mt-1 font-black text-white">{p.name}</h3>
                <p className="mt-2 text-lg font-black text-[#C5A059]">{fmt(p.salePrice)}</p>
                {cart[p.id] ? (
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setQty(p.id, (cart[p.id] || 0) - 1)} className="h-8 w-8 rounded-lg border border-white/10 text-white">−</button>
                    <span className="min-w-[2rem] text-center font-bold text-white">{cart[p.id]}</span>
                    <button onClick={() => add(p.id)} className="h-8 w-8 rounded-lg border border-white/10 text-white">+</button>
                  </div>
                ) : (
                  <button onClick={() => add(p.id)} className="mt-3 w-full rounded-xl bg-[#C5A059] py-2 text-xs font-black text-black">В корзину</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Плавающая корзина */}
      {cartCount > 0 && !checkout && (
        <button onClick={() => setCheckout(true)} className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-5 py-3 text-sm font-black text-black shadow-2xl md:bottom-6">
          <ShoppingBag className="h-5 w-5" /> Корзина · {cartCount} · {fmt(cartTotal)}
        </button>
      )}

      {/* Оформление заказа */}
      {checkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setCheckout(false)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[#0f0f0f] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white">Оформление заказа</h3>
            <div className="mt-3 space-y-2">
              {cartLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="text-slate-200">{l.name}</span>
                  <span className="flex items-center gap-2">
                    <button onClick={() => setQty(l.id, l.qty - 1)} className="h-6 w-6 rounded border border-white/10 text-white">−</button>
                    <span className="text-white">{l.qty}</span>
                    <button onClick={() => setQty(l.id, l.qty + 1)} className="h-6 w-6 rounded border border-white/10 text-white">+</button>
                    <span className="ml-1 w-20 text-right font-bold text-[#C5A059]">{fmt(l.amount)}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm"><span className="text-slate-400">Итого</span><span className="font-black text-[#C5A059]">{fmt(cartTotal)}</span></div>
            <div className="mt-4 space-y-2">
              <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Ваше имя *" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50" />
              <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Телефон *" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50" />
              <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={2} placeholder="Комментарий (размер, филиал…)" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50" />
            </div>
            {err && <p className="mt-2 text-[11px] text-rose-400">{err}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setCheckout(false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300">Назад</button>
              <button onClick={placeOrder} disabled={placing} className="rounded-xl bg-[#C5A059] px-4 py-2 text-xs font-black text-black disabled:opacity-50">{placing ? "Оформляем…" : "Оформить заказ"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ParentAdvice {
  answer: string;
  weekPlan: { day: string; action: string }[];
  suggestedQuests?: { title: string; category: string; reward: string }[];
}

// Резервный ответ, когда бэкенд AI недоступен (нет GEMINI_API_KEY) — UI не ломается.
const AI_FALLBACK: ParentAdvice = {
  answer: "Поддерживайте ребёнка вниманием к усилиям, а не только к результату. Короткая совместная репетиция и тёплое слово работают лучше давления.",
  weekPlan: [
    { day: "Понедельник", action: "Похвалить за старание, не за результат." },
    { day: "Среда", action: "Семейный квест: подготовить форму и повторить движение." },
    { day: "Пятница", action: "Перед занятием сказать: «Я вижу, как ты стараешься»." },
    { day: "Выходные", action: "Посмотреть видео выступления и отметить один новый навык." }
  ]
};

function ParentAiView({ student }: { student: Student }) {
  const prompts = [
    "Как мотивировать ребенка 8 лет заниматься?",
    "Какие семейные задания дать на неделю?",
    "Как поддержать ребенка перед выступлением?",
    "Составь план развития дисциплины"
  ];
  const [advice, setAdvice] = useState<ParentAdvice>(AI_FALLBACK);
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const ask = async (prompt: string) => {
    if (loadingPrompt) return;
    setLoadingPrompt(prompt);
    setUsedFallback(false);
    try {
      const attendance = Object.values(student.attendance || {});
      const present = attendance.filter((a: any) => a.status === "present").length;
      const rate = attendance.length ? Math.round((present / attendance.length) * 100) : null;
      const response = await fetch("/api/gemini/parent-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt, childName: student.name, attendanceRate: rate })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as ParentAdvice;
      setAdvice({
        answer: data.answer || AI_FALLBACK.answer,
        weekPlan: Array.isArray(data.weekPlan) && data.weekPlan.length ? data.weekPlan : AI_FALLBACK.weekPlan,
        suggestedQuests: data.suggestedQuests
      });
    } catch {
      // Бэкенд недоступен (например, нет ключа) — показываем резервный план.
      setAdvice(AI_FALLBACK);
      setUsedFallback(true);
    } finally {
      setLoadingPrompt(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-[#C5A059]/20 bg-gradient-to-br from-[#2A2110] to-[#101010] p-5 md:p-7">
        <Wand2 className="h-8 w-8 text-[#C5A059]" />
        <h2 className="mt-4 text-2xl font-black text-white">AI Родительский помощник</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">Помогает подобрать квест, составить план недели и поддержать {student.name} без давления.</p>
        <div className="mt-5 space-y-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => ask(prompt)}
              disabled={!!loadingPrompt}
              className={`flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left text-sm font-bold text-white transition ${loadingPrompt ? "opacity-60" : "hover:border-[#C5A059]/40"}`}
            >
              <span>{prompt}</span>
              {loadingPrompt === prompt
                ? <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-[#C5A059]" />
                : <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C5A059]">Ответ помощника</p>
          {usedFallback && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">офлайн-режим</span>}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{advice.answer}</p>
        <h3 className="mt-5 text-xl font-black text-white">План поддержки на неделю</h3>
        <div className="mt-4 space-y-3">
          {advice.weekPlan.map((item, i) => <MiniRow key={`${item.day}-${i}`} title={item.day} meta={item.action} />)}
        </div>
        {advice.suggestedQuests && advice.suggestedQuests.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Идеи квестов</p>
            <div className="mt-3 space-y-2">
              {advice.suggestedQuests.map((q, i) => <MiniRow key={`${q.title}-${i}`} title={q.title} meta={`${q.category} • награда: ${q.reward}`} />)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ParentNavButton({ tab, active, onClick }: { key?: React.Key; tab: any; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-wider transition ${active ? "border-[#C5A059] bg-[#C5A059] text-black" : "border-white/10 bg-white/5 text-slate-400 hover:text-white"}`}>
      <span className="inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{tab.label}</span>
    </button>
  );
}

function ParentMobileNav({ tab, active, onClick }: { key?: React.Key; tab: any; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button onClick={onClick} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px] font-black uppercase ${active ? "text-[#C5A059]" : "text-slate-500"}`}>
      <Icon className="h-5 w-5" />
      <span>{tab.short}</span>
    </button>
  );
}

function InfoCard({ icon, title, accent, children }: { icon: React.ReactNode; title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">{icon}</div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
            <p className="text-sm font-black text-[#C5A059]">{accent}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-600" />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniRow({ title, meta }: { key?: React.Key; title: string; meta: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/25 p-3">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{meta}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/25 p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

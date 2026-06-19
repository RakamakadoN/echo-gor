import React, { useEffect, useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  Users, Calendar, CheckSquare, Trophy, Bell, BookOpen, User, 
  MessageSquare, BrainCircuit, PlayCircle, Plus, FileText, ChevronRight, 
  Search, Star, AlertCircle, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Home, ClipboardList, Download
} from 'lucide-react';
import { Group, Student, Competition, Announcement, Homework } from '../types';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import teacherProfileCard from '../assets/images/teacher_profile_card.png';

interface TeacherWorkspaceProps {
  groups: Group[];
  students: Student[];
  competitions: Competition[];
  announcements: Announcement[];
  addAuditLog: (action: string, details: string) => void;
  teacherName?: string;
  scheduleItems?: any[];
  scheduleLoading?: boolean;
  onLoadSchedule?: (filters?: { branchId?: string; groupId?: string; from?: string; to?: string }) => void;
}

// Sub-components: 
// - Dashboard
// - GroupList & GroupDetails
// - StudentDetails
// - HomeworksView
// - CompetitionsView
// - AINotebook

export function TeacherWorkspace({
  groups,
  students,
  competitions,
  announcements,
  addAuditLog,
  teacherName = "Аслан Плиев",
  scheduleItems = [],
  scheduleLoading = false,
  onLoadSchedule,
}: TeacherWorkspaceProps) {
  
  const [activeTab, setActiveTab] = useState<'today' | 'profile' | 'groups' | 'students' | 'feedback' | 'more'>('today');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Load real schedule on mount
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    if (onLoadSchedule) onLoadSchedule({ from: today, to: weekAhead });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Local state for Homeworks and Notebook
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [notebookEntries, setNotebookEntries] = useState<any[]>([]);

  // Helpers
  const teacherGroups = groups; // Taking all passed for demo, normally filter by teacherId
  const teacherStudents = students;

  const navigateToGroup = (id: string) => {
    setSelectedGroupId(id);
    setSelectedStudentId(null);
    setActiveTab('groups');
  };

  const navigateToStudent = (id: string) => {
    setSelectedStudentId(id);
    setActiveTab('students');
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0A0A0A] overflow-hidden text-slate-300 font-sans">
      
      {/* Dynamic Content Area (scrollable) */}
      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        
        {/* TOP BAR (Mobile / Tablet friendly) */}
        {!selectedStudentId && !selectedGroupId && (
          <div className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 py-4 px-4 md:px-8 space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Кабинет преподавателя</h1>
            <p className="text-[11px] text-[#C5A059] uppercase tracking-widest font-bold">ЭХОГОР OS</p>
          </div>
        )}

        <div className="p-4 md:p-8">
          {/* TODAY VIEW */}
          {activeTab === 'today' && !selectedGroupId && !selectedStudentId && (
            <DashboardView
              teacherName={teacherName}
              groups={teacherGroups}
              students={teacherStudents}
              announcements={announcements}
              onNavigateToGroup={navigateToGroup}
              onNavigateToStudent={navigateToStudent}
              scheduleItems={scheduleItems}
              scheduleLoading={scheduleLoading}
            />
          )}

          {activeTab === 'profile' && !selectedGroupId && !selectedStudentId && (
            <TeacherProfileView
              teacherName={teacherName}
              groups={teacherGroups}
              students={teacherStudents}
              competitions={competitions}
            />
          )}

          {/* GROUPS VIEW */}
          {activeTab === 'groups' && !selectedGroupId && (
            <div className="animate-fade-in space-y-6">
              <h2 className="text-lg font-bold text-white">Мои группы</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherGroups.map(g => (
                  <div key={g.id} 
                    onClick={() => navigateToGroup(g.id)}
                    className="cursor-pointer bg-white/5 border border-white/10 hover:border-[#C5A059]/40 transition-colors p-5 rounded-3xl group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-bold text-base">{g.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">{g.level} • {g.ageGroup}</p>
                      </div>
                      <span className="bg-[#C5A059]/10 text-[#C5A059] text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                        {g.studentCount} уч.
                      </span>
                    </div>
                    <div className="space-y-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-500"/> {g.scheduleText}</div>
                      <div className="flex items-center gap-2"><Home className="w-3.5 h-3.5 text-slate-500"/> {g.hallId}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GROUP DETAILS VIEW */}
          {activeTab === 'groups' && selectedGroupId && (
            <GroupDetailsView 
              groupId={selectedGroupId}
              groups={groups}
              students={students}
              onBack={() => setSelectedGroupId(null)}
              onNavigateToStudent={navigateToStudent}
            />
          )}

          {/* STUDENTS VIEW (Or specific student details) */}
          {activeTab === 'students' && selectedStudentId && (
            <StudentDetailsView 
              studentId={selectedStudentId}
              students={students}
              onBack={() => setSelectedStudentId(null)}
            />
          )}

          {activeTab === 'students' && !selectedStudentId && (
            <div className="animate-fade-in space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Мои ученики</h2>
                <p className="text-xs text-slate-500 mt-1">Педагогический список: прогресс, посещаемость и быстрый переход в историю ученика.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {teacherStudents.map((stud) => (
                  <button
                    key={stud.id}
                    onClick={() => navigateToStudent(stud.id)}
                    className="text-left rounded-3xl border border-white/10 bg-white/[0.04] p-4 hover:border-[#C5A059]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img src={stud.photoUrl} alt={stud.name} className="w-14 h-14 rounded-2xl object-cover border border-[#C5A059]/25" />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">{stud.name}</p>
                        <p className="text-[10px] text-[#C5A059] uppercase tracking-wider font-bold truncate">{stud.artistLevel}</p>
                        <AttendanceSparkline attendance={stud.attendance} />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-400 line-clamp-2">
                      {stud.notes.find((note) => !note.isPrivate)?.content || "Нет открытых заметок по ученику."}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <SafeFeedbackView groups={teacherGroups} students={teacherStudents} />
          )}

          {activeTab === 'more' && (
            <AINotebookView announcements={announcements} groups={teacherGroups} students={teacherStudents} competitions={competitions} />
          )}

        </div>
      </div>

      {/* BOTTOM NAVIGATION (Responsive/Mobile-first) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/10 pb-safe">
        <div className="flex justify-around items-center p-2 max-w-2xl mx-auto">
          <NavItem icon={<Home className="w-5 h-5" />} label="Сегодня" active={activeTab === 'today'} onClick={() => {setActiveTab('today'); setSelectedGroupId(null); setSelectedStudentId(null)}} />
          <NavItem icon={<User className="w-5 h-5" />} label="Профиль" active={activeTab === 'profile'} onClick={() => {setActiveTab('profile'); setSelectedGroupId(null); setSelectedStudentId(null)}} />
          <NavItem icon={<Users className="w-5 h-5" />} label="Группы" active={activeTab === 'groups' && !selectedGroupId} onClick={() => {setActiveTab('groups'); setSelectedGroupId(null); setSelectedStudentId(null)}} />
          <NavItem icon={<CheckSquare className="w-5 h-5" />} label="Ученики" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          <NavItem icon={<Star className="w-5 h-5" />} label="Спасибо" active={activeTab === 'feedback'} onClick={() => {setActiveTab('feedback'); setSelectedGroupId(null); setSelectedStudentId(null)}} />
          <NavItem icon={<BrainCircuit className="w-5 h-5" />} label="Notebook" active={activeTab === 'more'} onClick={() => {setActiveTab('more'); setSelectedGroupId(null); setSelectedStudentId(null)}} />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------

const teacherPhotoUrl = teacherProfileCard;

const safeReactions = [
  { label: "Спасибо, учитель", count: 42, tone: "amber" },
  { label: "Мне понравилось занятие", count: 35, tone: "emerald" },
  { label: "Было интересно", count: 31, tone: "sky" },
  { label: "Я понял движение", count: 27, tone: "indigo" },
  { label: "Хочу еще такую тренировку", count: 19, tone: "rose" },
  { label: "Было сложно, но я старался", count: 16, tone: "violet" }
];

const announcementTypes = ["Репетиция", "Форма одежды", "Концерт", "Оплата", "Перенос занятия", "Домашнее задание", "Важное сообщение"];

type AutoVideoJob = {
  id: string;
  status: "queued" | "validating" | "rendering" | "uploading" | "completed" | "failed";
  progress: number;
  templatePayloadSnapshot?: {
    teacherName: string;
    groups: { id: string; name: string; level: string; studentCount: number }[];
    concertsCount: number;
    achievements: string[];
    studentThanks: { text: string; studentName?: string }[];
    branchName: string;
  };
  output?: {
    storageUrl: string;
    thumbnailUrl: string;
    shareUrl: string;
  };
};

function TeacherProfileView({ teacherName, groups, students, competitions }: any) {
  const [spotlightJob, setSpotlightJob] = useState<AutoVideoJob | null>(null);
  const [spotlightError, setSpotlightError] = useState<string | null>(null);
  const gratitudeItems = [
    "Спасибо за терпение перед первым выступлением.",
    "Ребенок стал увереннее выходить на сцену.",
    "После ваших занятий сын сам повторяет движения дома."
  ];
  const spotlightStats = useMemo(() => {
    const concertsCount = students.reduce((sum: number, student: Student) => sum + student.performances.length, 0);
    const achievementsCount = students.reduce(
      (sum: number, student: Student) => sum + student.achievements.filter((achievement) => achievement.unlockedAt).length,
      0,
    );

    return [
      { label: "Стаж", value: "9 лет" },
      { label: "Группы", value: groups.length },
      { label: "Ученики", value: students.length },
      { label: "Концерты", value: concertsCount },
      { label: "Достижения", value: achievementsCount },
      { label: "Благодарности", value: gratitudeItems.length },
    ];
  }, [groups.length, students]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | undefined;

    const fallbackSimulation = () => {
      const id = `local-teacher-spotlight-${Date.now()}`;
      setSpotlightError(null);
      setSpotlightJob({ id, status: "queued", progress: 12 });
      window.setTimeout(() => !cancelled && setSpotlightJob({ id, status: "rendering", progress: 48 }), 450);
      window.setTimeout(() => !cancelled && setSpotlightJob({ id, status: "uploading", progress: 84 }), 950);
      window.setTimeout(
        () =>
          !cancelled &&
          setSpotlightJob({
            id,
            status: "completed",
            progress: 100,
            output: {
              storageUrl: `/storage/videos/teacher-spotlight/${id}/video.mp4`,
              thumbnailUrl: `/storage/videos/teacher-spotlight/${id}/thumbnail.jpg`,
              shareUrl: `/share/video/${id}`,
            },
          }),
        1450,
      );
    };

    const startAutoRender = async () => {
      try {
        setSpotlightError(null);
        setSpotlightJob({ id: "auto-starting", status: "queued", progress: 8 });
        const response = await fetch("/api/mvp/video/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: "teacher-spotlight",
            entityType: "teacher",
            entityId: "teach-aslan",
            format: "reel-9x16",
            priority: "normal",
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const payload = await response.json();
        if (cancelled) return;
        setSpotlightJob(payload.job);

        pollTimer = window.setInterval(async () => {
          const jobResponse = await fetch(`/api/mvp/video/jobs/${payload.job.id}`);
          if (!jobResponse.ok) return;
          const jobPayload = await jobResponse.json();
          if (cancelled) return;
          setSpotlightJob(jobPayload.job);
          if (jobPayload.job.status === "completed" || jobPayload.job.status === "failed") {
            window.clearInterval(pollTimer);
          }
        }, 550);
      } catch (error: any) {
        if (cancelled) return;
        setSpotlightError("API render недоступен, включена локальная автосборка демо.");
        fallbackSimulation();
      }
    };

    startAutoRender();

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [teacherName]);

  return (
    <div className="animate-fade-in space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
        <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-[#C5A059]/10 blur-3xl" />
        <div className="relative grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border border-[#C5A059]/60 bg-black shadow-2xl shadow-black/40">
            <img src={teacherPhotoUrl} alt={teacherName} className="h-full w-full object-cover object-center" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Профиль наставника</p>
            <h1 className="mt-2 text-3xl font-black text-white">{teacherName}</h1>
            <p className="mt-1 text-sm text-slate-300">Лезгинка, ансамблевая подготовка, сценическая дисциплина • Филиал Алматы</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
              Преподаватель, который ведет учеников от первых шагов до уверенного выхода на сцену. Фокус: техника, дисциплина,
              уважение к традиции и командный дух без токсичного сравнения детей.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-72">
            <ProfileMetric label="Стаж" value="9 лет" />
            <ProfileMetric label="Учеников" value={students.length} />
            <ProfileMetric label="Групп" value={groups.length} />
            <ProfileMetric label="Событий" value={competitions.length + 8} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#C5A059]/25 bg-gradient-to-br from-[#171717] via-[#101318] to-black p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Автогенерация видео</p>
            <h2 className="mt-2 text-2xl font-black text-white">Teacher Spotlight собирается сам</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              CRM уже собрала фото, стаж, группы, концерты, достижения и благодарности. Рендер запускается автоматически при открытии профиля.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {spotlightStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-lg font-black text-white">{item.value}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
            {spotlightError && <p className="mt-3 text-xs font-bold text-amber-300">{spotlightError}</p>}
          </div>
          <div className="space-y-3 lg:w-[360px]">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400">{teacherSpotlightStatusLabel(spotlightJob?.status)}</span>
                <span className="font-black text-white">{spotlightJob?.progress || 0}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#C5A059] transition-all duration-500" style={{ width: `${spotlightJob?.progress || 0}%` }} />
              </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {spotlightJob?.templatePayloadSnapshot
                  ? `${spotlightJob.templatePayloadSnapshot.teacherName} / ${spotlightJob.templatePayloadSnapshot.groups.length} групп`
                  : spotlightJob?.id
                    ? `job ${spotlightJob.id.slice(0, 12)}`
                    : "ожидание"}
              </p>
            </div>
            <a
              href="http://localhost:3001/TeacherSpotlightTrailer"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:border-[#C5A059]/50"
            >
              <PlayCircle className="h-4 w-4" />
              Preview
            </a>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Группы и педагогическая зона ответственности</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {groups.map((group: Group) => (
              <div key={group.id} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                <p className="text-sm font-black text-white">{group.name}</p>
                <p className="mt-1 text-xs text-slate-400">{group.ageGroup} • {group.level} • {group.scheduleText}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${Math.min(100, group.studentCount * 12)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Благодарности</h2>
          <div className="mt-4 space-y-3">
            {gratitudeItems.map((item) => (
              <div key={item} className="rounded-2xl border border-[#C5A059]/15 bg-[#C5A059]/10 p-4">
                <p className="text-xs leading-relaxed text-slate-200">"{item}"</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ProfileStory title="Достижения" value="12 концертов подготовлено" text="Ученики регулярно выходят на городские и школьные сцены." />
        <ProfileStory title="Методика" value="Дисциплина без давления" text="Система фиксирует прогресс, а не сравнивает детей между собой." />
        <ProfileStory title="Роль в школе" value="Наставник ансамбля" text="Связывает учеников, родителей и администрацию вокруг развития ребенка." />
      </div>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function teacherSpotlightStatusLabel(status?: AutoVideoJob["status"]) {
  if (status === "queued") return "Собираем CRM данные";
  if (status === "validating") return "Проверяем шаблон";
  if (status === "rendering") return "Рендерим видео";
  if (status === "uploading") return "Готовим публикацию";
  if (status === "completed") return "Видео собрано автоматически";
  if (status === "failed") return "Ошибка автосборки";
  return "Автосборка запускается";
}

function ProfileStory({ title, value, text }: { title: string; value: string; text: string }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">{title}</p>
      <h3 className="mt-2 text-lg font-black text-white">{value}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{text}</p>
    </section>
  );
}

function SafeFeedbackView({ groups, students }: any) {
  const totalReactions = safeReactions.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#171717] to-black p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C5A059]">Безопасные благодарности</p>
            <h1 className="mt-2 text-3xl font-black text-white">Реакции после занятий</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Это не рейтинг преподавателей. Дети выбирают только готовые безопасные реакции один раз после занятия.
              Преподаватель видит признание, владелец видит вовлеченность, публичного соревнования нет.
            </p>
          </div>
          <div className="rounded-3xl border border-[#C5A059]/25 bg-[#C5A059]/10 p-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C5A059]">За неделю</p>
            <p className="mt-1 text-4xl font-black text-white">{totalReactions}</p>
            <p className="text-xs text-slate-400">теплых реакций</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Самые частые реакции</h2>
          <div className="mt-5 space-y-3">
            {safeReactions.map((reaction) => (
              <div key={reaction.label} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{reaction.label}</p>
                  <span className="rounded-full bg-[#C5A059]/15 px-3 py-1 text-xs font-black text-[#C5A059]">{reaction.count}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#C5A059]" style={{ width: `${Math.round((reaction.count / safeReactions[0].count) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Вовлеченность групп</h2>
            <div className="mt-4 space-y-3">
              {groups.slice(0, 4).map((group: Group, index: number) => {
                const rate = [92, 81, 64, 73][index] || 70;
                return (
                  <div key={group.id} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <div className="flex justify-between gap-3">
                      <p className="text-xs font-black text-white">{group.name}</p>
                      <p className={`text-xs font-black ${rate < 70 ? "text-amber-400" : "text-emerald-400"}`}>{rate}%</p>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{rate < 70 ? "Нужна поддержка и больше позитивной обратной связи" : "Стабильная эмоциональная вовлеченность"}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-indigo-500/20 bg-indigo-500/10 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Экран ученика после занятия</h2>
            <p className="mt-2 text-xs text-slate-400">“Как прошло занятие?”</p>
            <div className="mt-4 grid gap-2">
              {["Спасибо, учитель", "Было интересно", "Я стал лучше", "Было сложно, но я старался", "Хочу повторить"].map((label) => (
                <div key={label} className="rounded-xl border border-indigo-500/15 bg-black/25 px-3 py-2 text-xs font-bold text-indigo-100">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AINotebookView({ announcements, groups, students, competitions }: any) {
  return (
    <div className="animate-fade-in space-y-6">
      <section className="rounded-[2rem] border border-indigo-500/20 bg-[#11121A] p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <BrainCircuit className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-300">AI Notebook преподавателя</p>
              <h1 className="mt-1 text-2xl font-black text-white">Личная педагогическая память</h1>
              <p className="mt-1 text-xs text-slate-400">Заметки по ученикам, группам, занятиям, концертам и подготовке.</p>
            </div>
          </div>
          <button className="rounded-2xl bg-indigo-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-white">
            Новая заметка
          </button>
        </div>

        <div className="relative mt-6">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-300/60" />
          <input
            type="text"
            className="w-full rounded-2xl border border-indigo-500/30 bg-black/35 py-4 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
            placeholder="Спросите: подготовь сообщение родителям, составь план занятия, найди заметки по ученику..."
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["Заметки по ученикам", `${students.length} профилей`],
          ["Заметки по группам", `${groups.length} групп`],
          ["Планы репетиций", "4 активных"],
          ["Концерты", `${competitions.length} события`]
        ].map(([title, value]) => (
          <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
            <p className="mt-2 text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Готовые AI-запросы</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              "Подготовь сообщение родителям после пропуска",
              "Составь план занятия для старшей группы",
              "Найди заметки по Сослану за месяц",
              "Сделай сводку по группе перед концертом",
              "Какие ученики требуют поддержки?",
              "Что повторить перед фестивалем?"
            ].map((prompt) => (
              <button key={prompt} className="rounded-2xl border border-indigo-500/15 bg-indigo-500/10 p-4 text-left text-xs font-bold leading-relaxed text-indigo-100 hover:bg-indigo-500/15">
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Объявления</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {announcementTypes.map((type) => (
              <span key={type} className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-300">
                {type}
              </span>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {(announcements || []).slice(0, 2).map((item: Announcement) => (
              <div key={item.id} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[#121212] p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Последние наблюдения</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            "Старшей группе нужен отдельный прогон по синхронности рук.",
            "Сослан уверенно держит сольную часть, но устает к финалу.",
            "Перед концертом подготовить мягкое сообщение родителям по форме."
          ].map((note) => (
            <div key={note} className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Сегодня</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'confirmed' | 'rejected' }) {
  const config = {
    pending: { label: 'Ожидает', styles: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    confirmed: { label: 'Подтверждено', styles: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    rejected: { label: 'Отклонено', styles: 'text-rose-400 bg-rose-400/10 border-rose-400/20' }
  };
  
  const { label, styles } = config[status];
  
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider border ${styles}`}>
      {label}
    </span>
  );
}

function AttendanceSparkline({ attendance }: { attendance: any }) {
  const data: { value: number }[] = [];
  const today = new Date();
  let presentCount = 0;
  let totalCount = 0;
  
  // Checking last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = attendance?.[dateStr];
    
    if (record && record.status !== 'unmarked') {
      totalCount++;
      let val = 0;
      if (record.status === 'present') {
        val = 100;
        presentCount++;
      } else if (record.status === 'sick') {
        val = 50;
      }
      data.push({ value: val });
    }
  }

  const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-4 opacity-70">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={rate > 80 ? "#10b981" : rate > 50 ? "#f59e0b" : "#ef4444"} 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-0.5 bg-white/10 rounded-full" />
        )}
      </div>
      <span className={`text-[10px] font-black font-mono ${rate > 80 ? 'text-emerald-400' : rate > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
        {rate}%
      </span>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex min-h-[52px] flex-col items-center justify-center w-14 sm:w-16 space-y-1 py-2 transition-all ${
        active ? 'text-[#C5A059]' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-[9px] font-bold tracking-wide">{label}</span>
    </button>
  );
}

function DashboardView({ teacherName, groups, students, announcements, onNavigateToGroup, onNavigateToStudent, scheduleItems, scheduleLoading }: any) {
  const attentionStudents = students
    .filter((student: Student) => {
      const recent = Object.values(student.attendance || {}).slice(-4);
      return recent.some((item: any) => item.status === "absent") || student.balance < 0;
    })
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Hello Card - Bento style */}
      <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-[2rem] p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Trophy className="w-48 h-48 text-[#C5A059] origin-top-right rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#C5A059]/45 bg-black shadow-xl">
              <img src={teacherPhotoUrl} alt={teacherName} className="h-full w-full object-cover object-center" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-1">Доброе утро, {teacherName}.</h2>
              <p className="text-xs text-[#C5A059] uppercase tracking-widest font-bold">Лезгинка • ансамбль • сценическая дисциплина</p>
              <p className="mt-2 text-xs text-slate-400">Филиал Алматы. Сегодня вы ведете группы, родителей и учеников через понятный ритм школы.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:w-[560px]">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">Занятия</span>
              <span className="text-2xl font-bold text-white">4</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">Ученики</span>
              <span className="text-2xl font-bold text-white">{students.length}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-md relative overflow-hidden">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">Объявления</span>
              <span className="text-2xl font-bold text-white">3</span>
              <div className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            </div>
            <div className="bg-[#C5A059]/10 rounded-2xl p-4 border border-[#C5A059]/20 backdrop-blur-md">
              <span className="text-[10px] text-[#C5A059] uppercase font-black tracking-wider block mb-1">Спасибо</span>
              <span className="text-2xl font-bold text-white">170</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions / Bento Grid */}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Быстрые действия</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickAction icon={<ClipboardList />} label="Отметить посещаемость" color="emerald" />
          <QuickAction icon={<Calendar />} label="Открыть расписание" color="blue" />
          <QuickAction icon={<FileText />} label="Добавить заметку" color="amber" />
          <QuickAction icon={<Bell />} label="Создать объявление" color="purple" />
          <QuickAction icon={<CheckSquare />} label="Проверить задания" color="indigo" />
          <QuickAction icon={<Trophy />} label="Подготовка к конкурсу" color="rose" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 bg-white/[0.04] border border-white/10 rounded-[2rem] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Расписание сегодня</h3>
              <p className="text-xs text-slate-500 mt-1">Открывайте занятие прямо перед началом: посещаемость, заметки, план репетиции.</p>
            </div>
          </div>
          <div className="space-y-3">
            {scheduleLoading && <p className="text-xs text-slate-500 py-3 text-center">Загрузка расписания…</p>}
            {!scheduleLoading && scheduleItems && scheduleItems.length > 0
              ? scheduleItems.filter((l: any) => l.status !== "cancelled").slice(0, 5).map((lesson: any) => (
                  <button
                    key={lesson.id}
                    onClick={() => lesson.groupId && onNavigateToGroup(lesson.groupId)}
                    className="w-full rounded-2xl border border-white/5 bg-black/30 p-4 text-left hover:border-[#C5A059]/35 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">
                          {new Date(lesson.startsAt).toLocaleString("ru-RU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} • {lesson.groupName || "Группа"}
                        </p>
                        <p className="text-xs text-slate-500">{lesson.hallName || ""}{lesson.topic ? ` • ${lesson.topic}` : ""}</p>
                      </div>
                      <span className="rounded-full bg-[#C5A059]/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C5A059]">открыть</span>
                    </div>
                  </button>
                ))
              : !scheduleLoading && groups.slice(0, 4).map((group: Group, index: number) => (
                  <button
                    key={group.id}
                    onClick={() => onNavigateToGroup(group.id)}
                    className="w-full rounded-2xl border border-white/5 bg-black/30 p-4 text-left hover:border-[#C5A059]/35 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{group.time || `${16 + index}:00`} • {group.name}</p>
                        <p className="text-xs text-slate-500">{group.ageGroup} • {group.level}</p>
                      </div>
                      <span className="rounded-full bg-[#C5A059]/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C5A059]">открыть</span>
                    </div>
                  </button>
                ))}
          </div>
        </section>

        <section className="bg-white/[0.04] border border-white/10 rounded-[2rem] p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ученики требуют внимания</h3>
          <div className="mt-4 space-y-3">
            {attentionStudents.map((student: Student) => (
              <button
                key={student.id}
                onClick={() => onNavigateToStudent(student.id)}
                className="w-full rounded-2xl border border-white/5 bg-black/30 p-3 text-left hover:border-amber-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src={student.photoUrl} alt={student.name} className="h-10 w-10 rounded-xl object-cover" />
                  <div>
                    <p className="text-xs font-black text-white">{student.name}</p>
                    <p className="text-[10px] text-amber-400">{student.balance < 0 ? "Нужно мягко напомнить родителям" : "Есть пропуск в последних занятиях"}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] p-5">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Notebook</h3>
              <p className="text-xs text-slate-400 mt-1">Спросите: “составь план репетиции” или “какие проблемы были у группы”.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {["План репетиции", "История ученика", "Сообщение родителям", "Проблемы месяца"].map((prompt) => (
              <div key={prompt} className="rounded-xl border border-indigo-500/15 bg-black/25 px-3 py-2 text-xs font-bold text-indigo-200">
                {prompt}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/[0.04] border border-white/10 rounded-[2rem] p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Важные объявления от владельца</h3>
          <div className="mt-4 space-y-3">
            {(announcements || []).slice(0, 2).map((item: Announcement) => (
              <div key={item.id} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{item.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ближайшие выступления</h3>
          <div className="mt-4 space-y-3">
            {["Весенний концерт ансамбля", "Городской фестиваль традиций", "Открытый урок для родителей"].map((eventName, index) => (
              <div key={eventName} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                <p className="text-sm font-black text-white">{eventName}</p>
                <p className="mt-1 text-xs text-slate-500">{["18 июня", "24 июня", "30 июня"][index]} • подготовка состава и формы</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Уведомления от родителей</h3>
          <div className="mt-4 space-y-3">
            {[
              "Амина сегодня может опоздать на 10 минут.",
              "У Тимура вопрос по костюму для концерта.",
              "Родитель Сослана подтвердил участие в фестивале."
            ].map((message) => (
              <div key={message} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                <p className="text-xs leading-relaxed text-slate-300">{message}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Тон дня</h3>
          <p className="mt-4 text-sm leading-relaxed text-slate-200">
            Сегодня стоит поддержать младшую группу: у них хороший прогресс, но нужна уверенность перед открытым уроком.
          </p>
          <button className="mt-5 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-black">
            Подготовить план занятия
          </button>
        </section>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20',
  };
  return (
    <button className={`flex flex-col items-center justify-center text-center p-4 rounded-3xl border transition-all ${colorClasses[color]}`}>
      <div className="mb-2">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">{label}</span>
    </button>
  );
}

function GroupDetailsView({ groupId, groups, students, onBack, onNavigateToStudent }: any) {
  const group = groups.find((g: any) => g.id === groupId);
  const groupStudents = students.filter((s: any) => s.groupIds?.includes(groupId));

  if (!group) return null;

  return (
    <div className="animate-fade-in space-y-6">
      <button onClick={onBack} className="text-[#C5A059] text-xs font-bold uppercase tracking-wider flex items-center hover:text-white transition-colors">
        ← Назад к группам
      </button>

      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">{group.name}</h1>
            <p className="text-sm text-[#C5A059] font-mono mt-1">{group.level} | {group.ageGroup}</p>
          </div>
          <button className="bg-[#C5A059] hover:bg-[#C5A059]/90 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95">
            Отметить всех присутствующими
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Ученики в группе ({groupStudents.length})</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupStudents.map((stud: any) => (
              <div key={stud.id} className="bg-black/40 border border-white/5 rounded-2xl p-3 hover:border-white/20 transition-all flex items-center gap-3">
                <img src={stud.photoUrl} alt={stud.name} className="w-12 h-12 rounded-full object-cover border border-[#C5A059]/30" />
                <div className="flex-1 min-w-0" onClick={() => onNavigateToStudent(stud.id)}>
                  <p className="text-sm font-bold text-white truncate cursor-pointer hover:text-[#C5A059] transition-colors">{stud.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] text-slate-500 font-mono">Ур. {stud.artistLevel}</p>
                    <div className="w-px h-2.5 bg-white/10" />
                    <AttendanceSparkline attendance={stud.attendance} />
                  </div>
                </div>
                {/* Micro Attendance Control */}
                <div className="flex bg-white/5 rounded-lg p-1 gap-1">
                  <button className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors font-bold text-xs">П</button>
                  <button className="w-8 h-8 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors font-bold text-xs">О</button>
                  <button className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors font-bold text-xs text-[10px]">Б</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentDetailsView({ studentId, students, onBack }: any) {
  const student = students.find((s: any) => s.id === studentId);
  const [activeSegment, setActiveSegment] = useState<'info' | 'ai' | 'homework'>('info');

  if (!student) return null;

  return (
    <div className="animate-fade-in space-y-6">
      <button onClick={onBack} className="text-[#C5A059] text-xs font-bold uppercase tracking-wider flex items-center hover:text-white transition-colors">
        ← Назад
      </button>

      {/* Student Hero Header */}
      <div className="flex flex-col md:flex-row gap-6 bg-gradient-to-br from-[#1A1A1A] to-black border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
        <img src={student.photoUrl} alt={student.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-2 border-[#C5A059] shadow-[0_0_20px_rgba(197,160,89,0.3)] z-10" />
        <div className="z-10 flex-1 flex flex-col justify-center">
          <h1 className="text-2xl md:text-3xl font-black text-white">{student.name}</h1>
          <p className="text-[#C5A059] font-mono text-sm mt-1">{student.age} лет | Уровень {student.artistLevel}</p>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <button className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-colors border border-white/10">Добавить заметку</button>
            <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20">Похвалить ++</button>
            <button className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-colors border border-indigo-500/20">Задать ДЗ</button>
          </div>
        </div>
      </div>

      <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 max-w-sm">
        <button onClick={() => setActiveSegment('info')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeSegment === 'info' ? 'bg-[#C5A059] text-black shadow-md' : 'text-slate-400 hover:text-white'}`}>Прогресс</button>
        <button onClick={() => setActiveSegment('ai')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeSegment === 'ai' ? 'bg-[#C5A059] text-black shadow-md' : 'text-slate-400 hover:text-white'}`}>AI Ассистент</button>
        <button onClick={() => setActiveSegment('homework')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeSegment === 'homework' ? 'bg-[#C5A059] text-black shadow-md' : 'text-slate-400 hover:text-white'}`}>Дом. Задания</button>
      </div>

      {activeSegment === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Timeline / Analytics */}
           <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">История посещений</h3>
             <div className="h-32 flex items-end gap-1 mb-2">
                {/* Mock chart bars */}
                {[...Array(14)].map((_, i) => (
                  <div key={i} className={`flex-1 rounded-t-sm ${Math.random() > 0.2 ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`} style={{ height: `${50 + Math.random() * 50}%` }} />
                ))}
             </div>
             <p className="text-[10px] text-slate-500 uppercase">Последние 14 занятий (85% посещаемость)</p>
           </div>

           <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Достижения</h3>
             {student.achievements?.map((ach: any) => (
               <div key={ach.id} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl">
                 <div className="w-10 h-10 rounded-full bg-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                   <Trophy className="w-5 h-5" />
                 </div>
                 <div>
                   <p className="text-sm font-bold text-white">{ach.title}</p>
                   <p className="text-[10px] text-slate-400">{ach.description}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeSegment === 'ai' && (
        <div className="bg-[#121212] border border-indigo-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <BrainCircuit className="w-48 h-48 text-indigo-500" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 text-indigo-400 mb-6">
              <BrainCircuit className="w-6 h-6 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider">ИИ-Профиль ученика</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <h4 className="text-[10px] uppercase text-emerald-400 font-bold mb-2">Сильные стороны</h4>
                <p className="text-xs text-slate-300 leading-relaxed">Идеально держит спину во время базовых перестроений. Высокая выносливость, отлично справляется с темповыми связками.</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <h4 className="text-[10px] uppercase text-rose-400 font-bold mb-2">Слабые стороны</h4>
                <p className="text-xs text-slate-300 leading-relaxed">Заметна рассинхронизация рук в сложных трюковых элементах (вращениях). Спадает концентрация к концу 90-минутного занятия.</p>
              </div>

              <div className="bg-indigo-500/10 rounded-2xl p-4 border border-indigo-500/20">
                <h4 className="text-[10px] uppercase text-indigo-400 font-bold mb-2">Рекомендации и след. уровень</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  Назначить ДЗ: Отработка позиции рук перед зеркалом (видео-задание 5 мин). <br/>
                  Готов к выступлению на осеннем фестивале "Ритмы Гор" в массовом блоке лезгинки.
                </p>
                <div className="mt-4 flex">
                  <button className="bg-indigo-500 text-white rounded-lg px-4 py-2 text-[10px] font-bold uppercase flex items-center gap-2 shadow-lg hover:bg-indigo-600 transition-colors">
                    <span>Сгенерировать План Развития</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSegment === 'homework' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Активные задания</h3>
            <button className="bg-[#C5A059] text-black text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Plus className="w-3 h-3" /> Выдать задание
            </button>
          </div>
          
          {/* Mock Homework */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-bold text-white">Отработка позиции рук</h4>
                <span className="text-[9px] bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  Выдано
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mb-3">Записать видео перед зеркалом 3 минуты</p>
              <div className="flex gap-2">
                 <span className="text-[9px] text-slate-500 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                   <PlayCircle className="w-3 h-3" /> Прикреплено видео
                 </span>
                 <span className="text-[9px] text-slate-500 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                   Срок: через 2 дня
                 </span>
              </div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-bold text-white">Упражнения на выносливость</h4>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  Выполнено
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mb-3">Сделать 5 подходов по 15 прыжков</p>
              <div className="flex gap-2">
                 <button className="text-[9px] bg-white/10 hover:bg-white/20 text-white transition-colors px-2 py-1 rounded font-bold uppercase transition-all">Проверить отчет</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function CompetitionsView({ competitions, students }: any) {
  const [expandedCompId, setExpandedCompId] = React.useState<string | null>(null);

  const handleDownloadReport = (comp: any, demoStudents: any[]) => {
    // Collect data for CSV
    const headers = ["ФИО артиста", "Статус оплаты", "Пропуски (май 2026)"];
    
    const rows = demoStudents.map(student => {
      // Determine payment status: use explicit field or balance fallback
      const status = student.paymentStatus || (student.balance < 0 ? "Задолженность" : "Оплачено");
      
      // Count misses in the last month (May 2026)
      const monthlyMisses = Object.values(student.attendance || {})
        .filter((att: any) => att.date.startsWith("2026-05") && att.status === "absent")
        .length;
        
      return [student.name, status, monthlyMisses];
    });

    // Create CSV string with BOM for Excel UTF-8 support
    const csvContent = "\ufeff" + [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Отчет_артисты_${comp.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">Подготовка к соревнованиям</h2>
        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {competitions.map((comp: any) => {
          const compStudents = (students || []).filter((s: any) => 
            s.participations?.some((p: any) => p.competitionId === comp.id)
          );
          // If the mock data doesn't have participations, let's randomly grab 3 students based on competition id for demo purposes.
          const demoStudents = compStudents.length > 0 ? compStudents : (students || []).slice(0, 3 + (comp.id.charCodeAt(comp.id.length-1) % 4));
          
          const totalGroupSize = students?.length || 15;
          const percentage = Math.round((demoStudents.length / totalGroupSize) * 100);
          
          const confirmationStatus = (['pending', 'confirmed', 'rejected'][comp.id.charCodeAt(comp.id.length - 1) % 3]) as 'pending' | 'confirmed' | 'rejected';

          let readinessColor = "text-red-400 bg-red-400/10 border-red-400/20";
          if (percentage >= 80) readinessColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
          else if (percentage >= 40) readinessColor = "text-amber-400 bg-amber-400/10 border-amber-400/20";

          return (
          <div key={comp.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 hover:border-white/20 transition-colors relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] bg-[#C5A059]/20 text-[#C5A059] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    {comp.scope === 'kazakhstan' ? 'Казахстан' : 'СНГ'}
                  </span>
                  <span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded font-black uppercase tracking-wider border border-sky-500/20">
                    {comp.status === 'registration' ? 'Регистрация' : comp.status}
                  </span>
                  <StatusBadge status={confirmationStatus} />
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">{comp.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{comp.date} | {comp.location}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Готовность группы</p>
                <div className={`inline-block px-2.5 py-1 rounded-lg border text-xs font-black ${readinessColor}`}>
                  {percentage}% ({demoStudents.length}/{totalGroupSize})
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-4 items-center">
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setExpandedCompId(expandedCompId === comp.id ? null : comp.id)}
              >
                <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${expandedCompId === comp.id ? 'bg-[#C5A059]' : 'bg-slate-700'}`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${expandedCompId === comp.id ? 'translate-x-4' : 'translate-x-[2px]'}`} />
                </div>
                <span className={`text-[10px] font-bold uppercase transition-colors ${expandedCompId === comp.id ? 'text-[#C5A059]' : 'text-slate-400 group-hover:text-slate-300'}`}>Участники ({demoStudents.length})</span>
              </div>
              <div className="flex gap-2 ml-auto">
                <button 
                  onClick={() => handleDownloadReport(comp, demoStudents)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase px-3 py-2 rounded-xl transition-colors flex items-center gap-2"
                  title="Скачать отчет по составу"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Отчет</span>
                </button>
                <button className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase px-4 py-2 rounded-xl transition-colors">Назначить</button>
                <button className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase px-4 py-2 rounded-xl transition-colors hidden sm:block">AI План</button>
              </div>
            </div>

            {expandedCompId === comp.id && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Назначенные артисты</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {demoStudents.map((stud: any) => (
                    <div key={stud.id} className="bg-black/30 border border-white/5 rounded-2xl p-2 flex items-center gap-3">
                      <img src={stud.photoUrl} alt={stud.name} className="w-10 h-10 rounded-full object-cover border border-[#C5A059]/20" />
                      <div>
                        <p className="text-sm font-bold text-white truncate">{stud.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Ур. {stud.artistLevel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

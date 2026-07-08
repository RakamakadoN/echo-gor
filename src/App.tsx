/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { TeacherWorkspace } from "./components/TeacherWorkspace";
import { StudentArtistCabinet } from "./components/StudentArtistCabinet";
import { BranchManagerWorkspace } from "./components/BranchManagerWorkspace";
import { OwnerExecutiveWorkspace } from "./components/OwnerExecutiveWorkspace";
import { AdminEduErpWorkspace } from "./components/AdminEduErpWorkspace";
import type { SellSubscriptionInput } from "./components/StudentManagementCard";
import { fetchStatusConfig } from "./statusConfig";
import { AnimatedBarChartShowcase } from "./components/AnimatedBarChartShowcase";
import { MagomedAssistant } from "./components/MagomedAssistant";
import ToastHost from "./components/ToastHost";
import { toast } from "./toast";
// @ts-ignore
import logoImg from "./assets/images/echogor_logo_1780297382250.png";
// @ts-ignore
import trainerLoginImg from "./assets/images/new_trainer_login_bg_1780308409116.png";
// @ts-ignore
import desktopLoginBg from "./assets/images/login_dancers_bg.png";
import echoLogo from "./assets/images/logo_main.png";
// @ts-ignore
import mobileLoginBg from "./assets/images/login_dancers_bg.png";
// @ts-ignore
import studentArtistCard from "./assets/images/student_artist_card.png";
// @ts-ignore
import {
  Shield,
  Building2,
  Users,
  TrendingUp,
  Coins,
  GraduationCap,
  Sparkles,
  Clock,
  Plus,
  Search,
  Calendar,
  Flame,
  X,
  KeyRound,
  UserCheck,
  Award,
  BookOpen,
  Send,
  Bell,
  CheckCircle,
  XCircle,
  Video,
  ChevronRight,
  PlusCircle,
  DollarSign,
  Activity,
  User,
  AlertTriangle,
  NotebookText,
  CalendarDays,
  Menu,
  FileText,
  MapPin,
  Trash2,
  LayoutGrid,
  Layers,
  Map,
  Globe,
  Phone,
  Smartphone,
  ArrowRight,
  Fingerprint,
  Lock,
  QrCode,
  Eye,
  EyeOff,
  Moon,
  Sun,
  ChevronDown
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { ResponsiveContainer } from "./components/SafeResponsiveContainer";

import {
  ArtistLevel,
  Branch,
  Hall,
  Teacher,
  Group,
  Student,
  Announcement,
  AnnouncementAudience,
  AuditLog,
  Payment,
  Subscription,
  Achievement,
  Competition,
  ExecutiveSummary,
  AdminTask,
  SubscriptionPlan,
  LeadSource,
  WaitlistEntry,
  Homework,
  StudentProgressNote,
  AttendanceStatus,
  AbsenceReason
} from "./types";

import { getAvailableAchievements, getExecutiveSummary } from "./dataMock";

export default function App() {
  // Roles list
  const roles = [
    { id: "owner", name: "Владелец сети", icon: Shield, badge: "Network Owner" },
    { id: "branch", name: "Руководитель филиала", icon: Building2, badge: "Branch Manager" },
    { id: "admin", name: "Администратор", icon: UserCheck, badge: "Registrar" },
    { id: "teacher", name: "Преподаватель", icon: GraduationCap, badge: "Sifu/Ustaz" },
    { id: "student", name: "Ученик", icon: Flame, badge: "Artist Way" },
  ];

  // Active role
  const [activeRole, setActiveRole] = useState<string>("owner");
  const [themeMode, setThemeMode] = useState<"dark" | "day" | "iman">(() => {
    if (typeof window === "undefined") return "day";
    const saved = window.localStorage.getItem("echogor-theme");
    return saved === "day" || saved === "iman" || saved === "dark" ? saved : "day";
  });
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // CRM State Management
  const [branches, setBranches] = useState<Branch[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminTasks, setAdminTasks] = useState<AdminTask[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  // Competition State Management
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>("comp-altyn-birlik");
  const [showAddCompModal, setShowAddCompModal] = useState<boolean>(false);
  const [compScopeFilter, setCompScopeFilter] = useState<string>("all"); // all, kazakhstan, cis
  const [compSearchQuery, setCompSearchQuery] = useState<string>("");

  // Add rehearsal inputs
  const [newRehearsalDay, setNewRehearsalDay] = useState("Пн");
  const [newRehearsalTime, setNewRehearsalTime] = useState("19:00 - 20:30");
  const [newRehearsalHall, setNewRehearsalHall] = useState("Зал Эльбрус");

  // Competitions New Modal inputs
  const [newCompTitle, setNewCompTitle] = useState("");
  const [newCompLevel, setNewCompLevel] = useState<"regional" | "republican">("republican");
  const [newCompScope, setNewCompScope] = useState<"kazakhstan" | "cis">("kazakhstan");
  const [newCompDate, setNewCompDate] = useState("2026-07-20");
  const [newCompLocation, setNewCompLocation] = useState("");
  const [newCompPrize, setNewCompPrize] = useState("");
  const [newCompPreselGroup, setNewCompPreselGroup] = useState("");

  // AI Competition advice state
  const [aiCompAdviceGenerating, setAiCompAdviceGenerating] = useState<boolean>(false);
  const [aiCompAdviceResult, setAiCompAdviceResult] = useState<{
    rehearsalPlan: string;
    stageCraftAdvice: string;
    readinessRating: string;
  } | null>(null);

  // Map Branch selection state
  const [selectedMapBranchId, setSelectedMapBranchId] = useState<string>("branch-magas");

  // Active selected student for CRM detail views
  const [selectedStudentId, setSelectedStudentId] = useState<string>("stud-soslan");

  // Selected filters/forms
  const [selectedBranchId, setSelectedBranchId] = useState<string>("branch-magas");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("group-magas-ensemble");
  const [crmSearchQuery, setCrmSearchQuery] = useState<string>("");

  // Mass Notification Platform states
  const [notificationHistory, setNotificationHistory] = useState<any[]>([
    {
      id: "notif-hist-1",
      title: "Экстренный перенос репетиции в филиале Магас",
      content: "В связи с техническим обслуживанием вентиляции в зале Эльбрус 2 июня, репетиция Старшего Ансамбля переносится на 3 июня (среду) на 19:30. Пожалуйста, примите к сведению!",
      sentAt: "2026-05-31T18:30:00Z",
      filterType: "group",
      filterValue: "group-magas-ensemble",
      filterName: "Старший Кавказский Ансамбль",
      channels: ["email", "push"],
      recipients: { parents: 4, students: 4 },
      status: "success",
      authorName: "Асланбек Болотаев"
    },
    {
      id: "notif-hist-2",
      title: "Замеры на новые концертные черкески (ичиги)",
      content: "Уважаемые родители! Просим всех учеников младших групп подойти в пятницу за 30 минут до начала занятий к Фатиме Царикаевой для снятия мерок под праздничные черкески.",
      sentAt: "2026-05-29T11:00:00Z",
      filterType: "all",
      filterValue: "all",
      filterName: "Все филиалы и группы",
      channels: ["email", "push", "sms"],
      recipients: { parents: 12, students: 12 },
      status: "success",
      authorName: "Фатима Царикаева"
    }
  ]);

  const [notifFormTitle, setNotifFormTitle] = useState("");
  const [notifFormContent, setNotifFormContent] = useState("");
  const [notifFilterType, setNotifFilterType] = useState<"all" | "branch" | "group">("all");
  const [notifSelectedBranchId, setNotifSelectedBranchId] = useState("branch-magas");
  const [notifSelectedGroupId, setNotifSelectedGroupId] = useState("group-magas-ensemble");
  const [notifIsImportant, setNotifIsImportant] = useState(false);
  const [notifChannels, setNotifChannels] = useState<{ email: boolean; push: boolean; sms: boolean }>({
    email: true,
    push: true,
    sms: false
  });

  // Simulator flow state
  const [simDispatchState, setSimDispatchState] = useState<{
    status: "idle" | "preparing" | "sending" | "complete";
    progress: number;
    currentRecipientName: string;
    sentEmailsCount: number;
    sentPushCount: number;
    sentSmsCount: number;
    recipientList: { name: string; type: "parent" | "student"; email?: string; phone?: string; status: "pending" | "sent" }[];
  } | null>(null);

  // In-app alert queue for parent/student simulation
  const [unreadSimulatedAlerts, setUnreadSimulatedAlerts] = useState<any[]>([]);

  // Calculate targets helper
  const getNotificationTargets = (
    filterType: "all" | "branch" | "group",
    branchId: string,
    groupId: string
  ) => {
    let filteredStudents = [...students];
    if (filterType === "branch") {
      filteredStudents = students.filter(s => s.branchId === branchId);
    } else if (filterType === "group") {
      filteredStudents = students.filter(s => s.groupIds.includes(groupId));
    }

    const uniqueParents = Array.from(new Set(filteredStudents.map(s => s.parentName))).map(name => {
      const student = filteredStudents.find(s => s.parentName === name);
      return {
        name,
        phone: student?.parentPhone || "+7 (999) 000-00-00",
        email: `${name.toLowerCase().replace(/[^a-z]/g, "") || "parent"}@echogor.ru`
      };
    });

    const studentsToNotify = filteredStudents.map(s => ({
      name: s.name,
      email: `${s.name.toLowerCase().replace(/[^a-z]/g, "") || "student"}@echogor.ru`,
      phone: s.parentPhone || "+7 (999) 000-00-00"
    }));

    return {
      students: studentsToNotify,
      parents: uniqueParents,
      totalCount: studentsToNotify.length + uniqueParents.length
    };
  };

  // UI state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("overview"); // overview, groups, students, billing, announcements, logs
  const [annSubTab, setAnnSubTab] = useState<"feed" | "dispatch">("feed");
  const [pieBranchFilter, setPieBranchFilter] = useState<string>("all");
  const [isPlayingPromo, setIsPlayingPromo] = useState<boolean>(true);
  // Вход ученика по ссылке/QR (?student=<token>) или короткому коду. Уровень задаёт набор вкладок кабинета.
  const [studentAccessLevel, setStudentAccessLevel] = useState<"junior" | "senior" | null>(null);
  const [studentAccessToken, setStudentAccessToken] = useState<string>("");
  const [showStudentLogin, setShowStudentLogin] = useState<boolean>(false);
  const [studentCodeInput, setStudentCodeInput] = useState<string>("");
  const [studentLoginBusy, setStudentLoginBusy] = useState<boolean>(false);
  const [studentLoginError, setStudentLoginError] = useState<string | null>(null);
  const [mvpDataMode, setMvpDataMode] = useState<"mock" | "supabase">("mock");
  const [mvpDataError, setMvpDataError] = useState<string | null>(null);
  // Единая точка ошибки: баннер + всплывающий тост с причиной.
  const notifyError = (m: string) => { setMvpDataError(m); toast.error(m); };

  // Mobile App Simulator state
  const [isMobileSimulatorOpen, setIsMobileSimulatorOpen] = useState<boolean>(false);
  const [mobileAuthStep, setMobileAuthStep] = useState<"welcome" | "login" | "otp" | "main">("welcome");
  const [mobilePhone, setMobilePhone] = useState<string>("");
  const [mobileSms, setMobileSms] = useState<string>("");
  const [mobileLoggedInUser, setMobileLoggedInUser] = useState<any>(null); // student object
  const [mobileActiveTab, setMobileActiveTab] = useState<string>("home"); // home, schedule, profile
  const [flippedQr, setFlippedQr] = useState<boolean>(false);
  const [isLoggingInWithGoogle, setIsLoggingInWithGoogle] = useState<boolean>(false);

  // Desktop Login Screen state
  const [desktopEmail, setDesktopEmail] = useState<string>("");
  const [desktopPassword, setDesktopPassword] = useState<string>("");
  const [desktopShowPassword, setDesktopShowPassword] = useState<boolean>(false);
  const [desktopRememberMe, setDesktopRememberMe] = useState<boolean>(true);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [desktopLoginError, setDesktopLoginError] = useState<string | null>(null);
  const [loginVideoTarget, setLoginVideoTarget] = useState<"desktop" | "mobile" | null>(null);
  const [isLoginVideoPlaying, setIsLoginVideoPlaying] = useState<boolean>(false);
  const [loginVideoNeedsTap, setLoginVideoNeedsTap] = useState<boolean>(false);

  // New item modal states / fields
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAge, setNewStudentAge] = useState<number>(14);
  const [newStudentBranch, setNewStudentBranch] = useState("branch-magas");
  const [newStudentGroup, setNewStudentGroup] = useState("group-magas-ensemble");
  const [newStudentParent, setNewStudentParent] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");

  const [showAddPaymentModal, setShowAddPaymentModal] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(4500);
  const [paymentType, setPaymentType] = useState<"subscription" | "single" | "uniform" | "concert">("subscription");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "transfer">("card");
  const [paymentDesc, setPaymentDesc] = useState("Продление абонемента");

  // AI Insights State
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<{
    executiveSummary: string;
    branchRisks: Array<{ branchId: string; riskTitle: string; description: string; severity: "high" | "medium" | "low" }>;
    growthRecommendations: string[];
    insights: string[];
  } | null>(null);

  // Student AI Analysis state from the active teacher view
  const [studentAiAnalyses, setStudentAiAnalyses] = useState<{ [id: string]: any }>({});
  const [isAnalyzingStudent, setIsAnalyzingStudent] = useState<boolean>(false);

  // Payment status state and one-click quick notification
  const [successNotifText, setSuccessNotifText] = useState<string | null>(null);
  const [showQuickMsgModal, setShowQuickMsgModal] = useState<boolean>(false);
  const [quickMsgText, setQuickMsgText] = useState<string>("");
  const [quickMsgStudentId, setQuickMsgStudentId] = useState<string | null>(null);
  const [showConfirmSendModal, setShowConfirmSendModal] = useState<boolean>(false);
  const [confirmSendStudentId, setConfirmSendStudentId] = useState<string | null>(null);

  // Quick state logger
  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      organizationId: branches[0]?.id || "unknown", // Fallback if no branches exist
      timestamp: new Date().toISOString(),
      userEmail: "diyaz.duos@gmail.com",
      userRole: roles.find((r) => r.id === activeRole)?.name || activeRole,
      action,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Switch Role handler
  const handleRoleChange = (roleId: string) => {
    setActiveRole(roleId);
    setIsMobileMenuOpen(false);
    // Auto redirect logical tabs
    if (roleId === "student") {
      setActiveTab("artist-way");
      setSelectedStudentId("stud-soslan"); // Soslan has rich achievements
    } else if (roleId === "teacher") {
      setActiveTab("teacher-board");
    } else {
      setActiveTab("overview");
    }
  };

  const getMvpRoleHeader = (roleId = activeRole) => {
    if (roleId === "branch") return "branch_manager";
    if (roleId === "teacher") return "teacher";
    if (roleId === "admin") return "admin";
    return "owner";
  };

  const loadMvpBootstrap = async (roleId = activeRole) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/mvp/bootstrap", {
        headers: {
          "x-demo-role": getMvpRoleHeader(roleId)
        }
      });
      const payload = await response.json();
      if (payload.branches) {
        setBranches(payload.branches);
        if (payload.branches.length && !payload.branches.some((branch: Branch) => branch.id === selectedBranchId)) {
          setSelectedBranchId(payload.branches[0].id);
          setNewStudentBranch(payload.branches[0].id);
          setNotifSelectedBranchId(payload.branches[0].id);
        }
      }
      if (payload.halls) setHalls(payload.halls);
      if (payload.teachers) setTeachers(payload.teachers);
      if (payload.groups) {
        setGroups(payload.groups);
        if (payload.groups.length && !payload.groups.some((group: Group) => group.id === selectedGroupId)) {
          setSelectedGroupId(payload.groups[0].id);
          setNewStudentGroup(payload.groups[0].id);
          setNotifSelectedGroupId(payload.groups[0].id);
        }
      }
      if (payload.students) {
        setStudents(payload.students);
        if (payload.students.length && !payload.students.some((student: Student) => student.id === selectedStudentId)) {
          setSelectedStudentId(payload.students[0].id);
        }
      }
      if (payload.announcements) setAnnouncements(payload.announcements);
      if (payload.payments) setPayments(payload.payments);
      if (payload.auditLogs) setAuditLogs(payload.auditLogs);
      if (payload.tasks) setAdminTasks(payload.tasks);
      if (payload.subscriptionPlans) setSubscriptionPlans(payload.subscriptionPlans);
      if (payload.leadSources) setLeadSources(payload.leadSources);
      if (payload.waitlist) setWaitlist(payload.waitlist);
      if (payload.metrics) {
        setMetricsSummary((prev) => ({
          ...prev,
          ...payload.metrics,
          branchMetrics: payload.metrics.branchMetrics ?? prev.branchMetrics,
          teacherPerformance: payload.metrics.teacherPerformance ?? prev.teacherPerformance
        }));
      }
      setMvpDataMode(payload.mode === "supabase" ? "supabase" : "mock");
      setMvpDataError(payload.error || null);
    } catch (error: any) {
      setMvpDataMode("mock");
      notifyError(error.message || "MVP API недоступен");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("day-theme", themeMode === "day");
    document.documentElement.classList.toggle("iman-theme", themeMode === "iman");
    window.localStorage.setItem("echogor-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    loadMvpBootstrap(activeRole);
  }, [activeRole]);

  // Применить успешный вход ученика (общий путь для ссылки/QR и кода).
  const applyStudentAuth = (data: any, fallbackToken?: string) => {
    setStudentAccessToken(data?.token || fallbackToken || "");
    setStudentAccessLevel(data?.level === "junior" ? "junior" : "senior");
    if (data?.studentId) setSelectedStudentId(data.studentId);
    setActiveRole("student");
    setShowStudentLogin(false);
    setStudentCodeInput("");
    setStudentLoginError(null);
    setIsPlayingPromo(false);
  };

  // Вход по короткому коду с экрана «Я ученик».
  const submitStudentCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = studentCodeInput.trim();
    if (!code) { setStudentLoginError("Введите код"); return; }
    setStudentLoginBusy(true);
    setStudentLoginError(null);
    try {
      const resp = await fetch("/api/mvp/student-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setStudentLoginError(data?.error || "Код недействителен"); return; }
      applyStudentAuth(data);
    } catch {
      setStudentLoginError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setStudentLoginBusy(false);
    }
  };

  // Вход ученика по ссылке/QR: ?student=<token>. Обмениваем токен на профиль,
  // включаем кабинет ученика с нужным уровнем прав и убираем токен из адреса.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = new URLSearchParams(window.location.search).get("student");
    if (!token) return;
    (async () => {
      try {
        const resp = await fetch("/api/mvp/student-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!resp.ok) return; // недействительная/отозванная ссылка — оставляем обычный вход
        const data = await resp.json();
        applyStudentAuth(data, token);
        window.history.replaceState({}, "", window.location.pathname);
      } catch {
        /* сеть недоступна — показываем обычный экран входа */
      }
    })();
  }, []);

  // Executive metrics calculations
  const [metricsSummary, setMetricsSummary] = useState<ExecutiveSummary>(() =>
    getExecutiveSummary([], [], [], [])
  );
  
  // Derived data for Students CRM Pie Chart
  const pieChartData = useMemo(() => {
    if (pieBranchFilter === "all") {
      return branches.map(b => ({
          name: b.name.replace("Филиал ", ""),
          fullName: b.name,
          value: students.filter(s => s.branchId === b.id).length,
          id: b.id
      })).filter(d => d.value > 0);
    } else {
      const branchGroups = groups.filter(g => g.branchId === pieBranchFilter);
      return branchGroups.map(g => ({
         name: g.name,
         fullName: g.name,
         value: students.filter(s => s.groupIds.includes(g.id)).length,
         id: g.id
      })).filter(d => d.value > 0);

    }
  }, [pieBranchFilter, branches, students, groups]);

  const pieChartTotal = pieChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Trigger Gemini AI Report Generator using backend /api/gemini/insights
  const triggerAiReport = async () => {
    setAiGenerating(true);
    try {
      const response = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: metricsSummary,
          currentContext: {
            branchesCount: branches.length,
            teachersCount: teachers.length,
            groupsCount: groups.length,
            studentsCount: students.length,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setAiResult(data);
      addAuditLog("Запрос AI-помощника владельца", "Генерация комплексных инсайтов и прогноза оттока по сети");
    } catch (e: any) {
      console.warn("Using smart fallback due to missing key / connection:", e);
      // Beautiful mock fallback satisfying custom prompt requirements with premium insights
      setTimeout(() => {
        setAiResult({
          executiveSummary: "Вся сеть филиалов показывает стабильный весенний подъем за счет подготовки к отчетному Летнему Концерту (25 июня). Однако Владикавказский флагманский центр загружен более чем на 94%, что создает высокую логистическую нагрузку на залы. Махачкалинский филиал требует оптимизации детских групп.",
          branchRisks: [
            {
              branchId: "branch-makhachkala",
              riskTitle: "Отток в детских группах (6-8 лет)",
              description: "Выявлено снижение посещаемости на 12%. Возможно, темп занятий преподавателя Шамиля слишком высок для новичков. Рекомендуется дополнить программу игровыми традициями.",
              severity: "medium",
            },
            {
              branchId: "branch-magas",
              riskTitle: "Предельная вместимость главного зала",
              description: "Зал Эльбрус занят репетициями ансамбля на 105%. Возникла угроза травм из-за перегрузки паркета.",
              severity: "high",
            },
          ],
          growthRecommendations: [
            "Привлечь Фатиму Царикаеву к проведению женского мастер-класса в филиале в Грозном для подъема популярности девичьего направления.",
            "Внедрить автоматические SMS-напоминания родителям при балансе абонемента менее 2 занятий для снижения кассового разрыва.",
          ],
          insights: [
            "Самая высокая вовлеченность (до 98%) наблюдается на уровне 'Участник выступлений', что доказывает эффективность мотивационной концепции 'Путь артиста'.",
            "Выручка выросла на 14.8% после внедрения системы семейных абонементов.",
          ],
        });
        addAuditLog("Запрос AI-помощника [Fallback Mode]", "Сгенерированы локальные аналитические инсайты школы танцев");
      }, 1000);
    } finally {
      setAiGenerating(false);
    }
  };

  // Trigger Gemini Student progress analysis / advice
  const analyzeStudentProgressWithAi = async (studentObj: Student) => {
    setIsAnalyzingStudent(true);
    try {
      const response = await fetch("/api/gemini/student-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student: studentObj,
          notes: studentObj.notes,
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setStudentAiAnalyses((prev) => ({ ...prev, [studentObj.id]: data }));
      addAuditLog("Преподавательский AI Анализ усердия", `Проведен анализ трека артиста для ${studentObj.name}`);
    } catch (e) {
      // Elegant fallback
      setTimeout(() => {
        setStudentAiAnalyses((prev) => ({
          ...prev,
          [studentObj.id]: {
            praise: `Чудесный творческий путь! Артист демонстрирует выдающиеся качества характера, присущие настоящему кавказскому танцору — подлинную скромность в общении и неистовую силу духа на репетициях в ансамбле.`,
            focusArea: "Рекомендуется отточить мягкость и плавность движений рук в медленных осетинских танцах (Хонга) и усилить темп в прыжковой технике сольной Лезгинки.",
            nextMilestoneAdvice: `Накоплено ${studentObj.artistLevelPoints} очков. Для перехода на престижный уровень "${studentObj.artistLevel === ArtistLevel.SOLOIST ? 'Старший ученик' : 'Солист'}" ученику необходимо принять участие еще в одном региональном конкурсе и получить рекомендацию от Аслана Плиева.`
          }
        }));
        addAuditLog("Ученик AI Анализ [Fallback]", `Сформирован мотивационный профиль для ${studentObj.name}`);
      }, 800);
    } finally {
      setIsAnalyzingStudent(false);
    }
  };

  // AI remains outside the Echo Gor 1.0 MVP flow. It can be triggered manually from legacy demo controls.

  // Filtered Students for general list based on active view and search
  const filteredStudents = students.filter((s) => {
    const branchMatch = !selectedBranchId || s.branchId === selectedBranchId;
    const groupMatch = activeTab !== "teacher-board" || !selectedGroupId || s.groupIds.includes(selectedGroupId);
    const searchMatch =
      !crmSearchQuery ||
      s.name.toLowerCase().includes(crmSearchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(crmSearchQuery.toLowerCase());
    return branchMatch && groupMatch && searchMatch;
  });

  // Action: Add Student form submission
  const registerNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName) return;

    try {
      const response = await fetch("/api/mvp/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": getMvpRoleHeader()
        },
        body: JSON.stringify({
          name: newStudentName,
          age: newStudentAge,
          branchId: newStudentBranch,
          groupIds: newStudentGroup ? [newStudentGroup] : [],
          parentName: newStudentParent,
          parentPhone: newStudentPhone
        })
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Регистрация ученика", `Зарегистрирован новый ученик ${newStudentName} в филиал ${newStudentBranch}`);
      setNewStudentName("");
      setNewStudentParent("");
      setNewStudentPhone("");
      setShowAddStudentModal(false);
    } catch (error: any) {
      notifyError(error.message || "Не удалось создать ученика");
    }
  };

  // --- Owner: student management ---
  type StudentInput = { name?: string; firstName?: string; lastName?: string; branchId?: string; groupId?: string; teacherId?: string; parentName?: string; parentPhone?: string; phone?: string; gender?: string | null; birthday?: string | null; sourceId?: string | null; comment?: string; status?: string; manualStatus?: string | null; payPromiseDate?: string | null };
  // Возвращает id созданного ученика (или null) — нужно, чтобы сразу открыть карточку (ТЗ).
  const handleCreateStudent = async (data: StudentInput): Promise<string | null> => {
    try {
      const response = await fetch("/api/mvp/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json().catch(() => ({}));
      await loadMvpBootstrap(activeRole);
      addAuditLog("Добавление ученика", `Добавлен ученик ${data.name || [data.firstName, data.lastName].filter(Boolean).join(" ")}`);
      toast.success("Ученик добавлен");
      return result?.student?.id || null;
    } catch (error: any) {
      const msg = error.message || "Не удалось добавить ученика";
      setMvpDataError(msg); toast.error(msg);
      return null;
    }
  };

  // Запись ученика на пробный урок (создаёт урок+пробную отметку, статус «пробный»).
  const handleBookTrial = async (studentId: string, payload: { date: string; time: string; note: string }): Promise<boolean> => {
    try {
      const response = await fetch(`/api/mvp/students/${studentId}/trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      toast.success("Ученик записан на пробный урок");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось записать на пробный урок";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };

  // --- Лист ожидания (ТЗ «Ученики» → «Лист ожидания») ---
  const handleAddToWaitlist = async (payload: { studentId: string; branchId?: string | null; groupId?: string | null; comment?: string | null }): Promise<boolean> => {
    try {
      const response = await fetch("/api/mvp/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      toast.success("Добавлено в лист ожидания");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось добавить в лист ожидания";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };
  const handleRemoveFromWaitlist = async (id: string, reason = "manual"): Promise<boolean> => {
    try {
      const response = await fetch(`/api/mvp/waitlist/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      toast.success("Убрано из листа ожидания");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось убрать из листа ожидания";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };
  const handleUpdateStudent = async (id: string, data: StudentInput) => {
    try {
      const response = await fetch(`/api/mvp/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Изменение ученика", `Обновлён ученик ${data.name || id}`);
      toast.success("Изменения сохранены");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось обновить ученика";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };
  // «Удаление» = заявка в корзину. Окончательно удаляет владелец через confirm-delete.
  const handleDeleteStudent = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/students/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Заявка на удаление", `Ученик перемещён в корзину (${id})`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось переместить ученика в корзину");
      return false;
    }
  };

  // --- Задачи администратора (tasks) ---
  const handleCreateTask = async (data: any) => {
    try {
      const response = await fetch("/api/mvp/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Создание задачи", `Добавлена задача «${data.title}»`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось создать задачу");
      return false;
    }
  };
  const handleUpdateTask = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/mvp/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось обновить задачу");
      return false;
    }
  };
  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/tasks/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось удалить задачу");
      return false;
    }
  };

  // --- Справочник: абонементы ---
  const handleCreatePlan = async (data: any) => {
    try {
      const response = await fetch("/api/mvp/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Справочник: абонемент", `Добавлен абонемент «${data.name}»`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось создать абонемент");
      return false;
    }
  };
  const handleUpdatePlan = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/mvp/subscription-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось обновить абонемент");
      return false;
    }
  };
  const handleDeletePlan = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/subscription-plans/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось удалить абонемент");
      return false;
    }
  };

  // --- Справочник: рекламные источники ---
  const handleCreateLeadSource = async (data: any) => {
    try {
      const response = await fetch("/api/mvp/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Справочник: источник", `Добавлен источник «${data.name}»`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось создать источник");
      return false;
    }
  };
  const handleUpdateLeadSource = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/mvp/lead-sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось обновить источник");
      return false;
    }
  };
  const handleDeleteLeadSource = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/lead-sources/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось удалить источник");
      return false;
    }
  };

  // Открыть глобальную модалку оплаты с предзаполнением под ученика («Продать абонемент» / «Принять оплату»).
  const openPaymentForStudent = (student: Student) => {
    setSelectedStudentId(student.id);
    const activeSub = student.subscriptions?.[0];
    setPaymentAmount(activeSub ? activeSub.price : 4500);
    setPaymentDesc(
      student.balance < 0
        ? `Погашение долга: ${student.name}`
        : `Оплата абонемента: ${student.name}`
    );
    setPaymentType("subscription");
    setShowAddPaymentModal(true);
  };

  // Продать абонемент из карточки ученика: создаёт student_subscription (+ платёж) и обновляет данные.
  const handleSellSubscription = async (payload: SellSubscriptionInput): Promise<boolean> => {
    try {
      const response = await fetch("/api/mvp/student-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog(
        "Продажа абонемента",
        `Абонемент продан ученику (${payload.studentId}) на сумму ${payload.price} тг`
      );
      toast.success("Абонемент продан");
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось продать абонемент");
      return false;
    }
  };

  // --- Корзина учеников (владелец подтверждает удаление) ---
  const [studentTrash, setStudentTrash] = useState<any[]>([]);
  // --- Архив учеников (сохранение базы для маркетинга) ---
  const [studentArchive, setStudentArchive] = useState<any[]>([]);
  // Версия общего конфига статусов — бампаем после загрузки с сервера, чтобы
  // перерисовать компоненты, читающие статусы синхронно из кэша.
  const [, setStatusCfgVersion] = useState(0);

  // --- Архив групп (скрыты из bootstrap; отдельная вкладка + восстановление) ---
  const [archivedGroups, setArchivedGroups] = useState<any[]>([]);
  const loadArchivedGroups = async () => {
    try {
      const r = await fetch("/api/mvp/groups/archived", { headers: { "x-demo-role": getMvpRoleHeader() } });
      if (!r.ok) return;
      setArchivedGroups((await r.json()).groups || []);
    } catch { /* тихо */ }
  };
  const handleDeleteGroupPermanent = async (id: string): Promise<boolean> => {
    try {
      const r = await fetch(`/api/mvp/groups/${id}/permanent`, { method: "DELETE", headers: { "x-demo-role": getMvpRoleHeader() } });
      if (!r.ok) throw new Error(await r.text());
      await loadArchivedGroups();
      toast.success("Группа удалена навсегда");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось удалить группу";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };
  const handleRestoreGroup = async (id: string): Promise<boolean> => {
    try {
      const r = await fetch(`/api/mvp/groups/${id}/restore`, { method: "POST", headers: { "x-demo-role": getMvpRoleHeader() } });
      if (!r.ok) throw new Error(await r.text());
      await loadMvpBootstrap(activeRole);
      await loadArchivedGroups();
      toast.success("Группа восстановлена из архива");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось восстановить группу";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };

  const loadStudentArchive = async () => {
    try {
      const response = await fetch("/api/mvp/students/archive", {
        headers: { "x-demo-role": getMvpRoleHeader() }
      });
      if (!response.ok) return;
      const data = await response.json();
      setStudentArchive(data.students || []);
    } catch {
      // тихо: архив просто останется пустым
    }
  };

  // Перевод ученика в архив с обязательными комментариями (причина + свободный).
  const handleArchiveStudent = async (id: string, reason: string, comment: string, leftOn?: string) => {
    try {
      const response = await fetch(`/api/mvp/students/${id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify({ reason, comment, leftOn })
      });
      if (!response.ok) throw new Error(await response.text());
      await loadStudentArchive();
      await loadStudentTrash();
      await loadMvpBootstrap(activeRole);
      addAuditLog("Архив ученика", `Ученик переведён в архив (${id}): ${reason}`);
      toast.success("Ученик переведён в архив");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось перевести ученика в архив";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };

  // Правка архивной карточки (дата ухода / причина / комментарий).
  const handleEditArchive = async (id: string, patch: { leftOn?: string; reason?: string; comment?: string }) => {
    try {
      const response = await fetch(`/api/mvp/students/${id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(patch)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadStudentArchive();
      toast.success("Изменения архива сохранены");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось изменить карточку архива";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };

  // Вернуть ученика из архива в активный реестр.
  const handleUnarchiveStudent = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/students/${id}/unarchive`, {
        method: "POST",
        headers: { "x-demo-role": getMvpRoleHeader() }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadStudentArchive();
      await loadMvpBootstrap(activeRole);
      addAuditLog("Возврат из архива", `Ученик возвращён из архива (${id})`);
      toast.success("Ученик возвращён из архива");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось вернуть ученика из архива";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };

  const loadStudentTrash = async () => {
    try {
      const response = await fetch("/api/mvp/students/trash", {
        headers: { "x-demo-role": getMvpRoleHeader("owner") }
      });
      if (!response.ok) return;
      const data = await response.json();
      setStudentTrash(data.students || []);
    } catch {
      // тихо: корзина просто останется пустой
    }
  };

  const handleRestoreStudent = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/students/${id}/restore`, {
        method: "POST",
        headers: { "x-demo-role": getMvpRoleHeader("owner") }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadStudentTrash();
      await loadMvpBootstrap(activeRole);
      addAuditLog("Восстановление ученика", `Ученик возвращён из корзины (${id})`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось восстановить ученика");
      return false;
    }
  };

  const handleConfirmDeleteStudent = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/students/${id}/confirm-delete`, {
        method: "POST",
        headers: { "x-demo-role": getMvpRoleHeader("owner") }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadStudentTrash();
      await loadMvpBootstrap(activeRole);
      addAuditLog("Удаление ученика", `Владелец подтвердил удаление (${id})`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось удалить ученика");
      return false;
    }
  };

  useEffect(() => {
    if (activeRole === "owner") loadStudentTrash();
    if (["owner", "branch_manager", "admin"].includes(activeRole)) { loadStudentArchive(); loadArchivedGroups(); }
    // Общий конфиг статусов организации — в кэш, затем перерисовка.
    fetchStatusConfig(getMvpRoleHeader()).then(() => setStatusCfgVersion((v) => v + 1));
  }, [activeRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Owner: teacher / staff management ---
  type TeacherInput = { name?: string; phone?: string; specialization?: string; branchId?: string | null; role?: string };
  const handleCreateTeacher = async (data: TeacherInput) => {
    try {
      const response = await fetch("/api/mvp/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Добавление преподавателя", `Добавлен ${data.name} (роль: ${data.role || "teacher"})`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось добавить преподавателя");
      return false;
    }
  };
  const handleUpdateTeacher = async (id: string, data: TeacherInput) => {
    try {
      const response = await fetch(`/api/mvp/teachers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Изменение преподавателя", `Обновлён ${data.name || id}`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось обновить преподавателя");
      return false;
    }
  };
  const handleDeleteTeacher = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/teachers/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Удаление преподавателя", `Сотрудник архивирован (${id})`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось удалить преподавателя");
      return false;
    }
  };

  // --- Owner: branch management ---
  const handleCreateBranch = async (data: { name: string; city: string; address?: string; phone?: string; managerName?: string; comment?: string; status?: string }) => {
    try {
      const response = await fetch("/api/mvp/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Создание филиала", `Добавлен филиал ${data.name} (${data.city})`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось создать филиал");
      return false;
    }
  };

  const handleUpdateBranch = async (id: string, data: { name?: string; city?: string; address?: string; phone?: string; managerName?: string; comment?: string; status?: string }) => {
    try {
      const response = await fetch(`/api/mvp/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Изменение филиала", `Обновлён филиал ${data.name || id}`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось обновить филиал");
      return false;
    }
  };

  const handleDeleteBranch = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/branches/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() }
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      addAuditLog("Удаление филиала", `Филиал архивирован (${id})`);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось удалить филиал");
      return false;
    }
  };

  // ─── Groups CRUD ─────────────────────────────────────────────────────────────

  const handleCreateGroup = async (data: {
    name: string; branchId: string; hallId?: string; teacherId?: string;
    ageFrom?: number; ageTo?: number; capacity?: number; level?: string;
    scheduleDays?: string; scheduleTime?: string;
  }) => {
    try {
      const response = await fetch("/api/mvp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      toast.success("Группа создана");
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось создать группу");
      return false;
    }
  };

  const handleUpdateGroup = async (id: string, data: Partial<{
    name: string; branchId: string; hallId: string; teacherId: string;
    ageFrom: number; ageTo: number; capacity: number; level: string;
    scheduleDays: string; scheduleTime: string;
  }>) => {
    try {
      const response = await fetch(`/api/mvp/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      toast.success("Группа обновлена");
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось обновить группу");
      return false;
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/groups/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() },
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      await loadArchivedGroups();
      toast.success("Группа перенесена в архив");
      return true;
    } catch (error: any) {
      const msg = error.message || "Не удалось удалить группу";
      setMvpDataError(msg); toast.error(msg);
      return false;
    }
  };

  // ─── Halls CRUD (ТЗ §6) ──────────────────────────────────────────────────────

  const handleCreateHall = async (data: { name: string; branchId: string; capacity?: number; description?: string; status?: string }) => {
    try {
      const response = await fetch("/api/mvp/halls", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось создать зал");
      return false;
    }
  };

  const handleUpdateHall = async (id: string, data: Partial<{ name: string; branchId: string; capacity: number; description: string; status: string }>) => {
    try {
      const response = await fetch(`/api/mvp/halls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось обновить зал");
      return false;
    }
  };

  const handleDeleteHall = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/halls/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() },
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось удалить зал");
      return false;
    }
  };

  // ─── Schedule CRUD ───────────────────────────────────────────────────────────

  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const loadSchedule = async (filters: { branchId?: string; groupId?: string; from?: string; to?: string } = {}) => {
    if (mvpDataMode !== "supabase") return; // no-op in mock mode
    setScheduleLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.branchId) params.set("branchId", filters.branchId);
      if (filters.groupId) params.set("groupId", filters.groupId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const response = await fetch(`/api/mvp/schedule?${params}`, {
        headers: { "x-demo-role": getMvpRoleHeader() },
      });
      if (!response.ok) return;
      const data = await response.json();
      setScheduleItems(data.lessons || []);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleCreateLesson = async (data: {
    groupId: string; startsAt: string; endsAt: string;
    teacherId?: string; hallId?: string; topic?: string; branchId?: string;
  }) => {
    try {
      const response = await fetch("/api/mvp/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      const { lesson } = await response.json();
      setScheduleItems((prev) => [...prev, lesson].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      toast.success("Урок создан");
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось создать урок");
      return false;
    }
  };

  const handleUpdateLesson = async (id: string, data: Partial<{
    startsAt: string; endsAt: string; teacherId: string; hallId: string; status: string; topic: string;
  }>) => {
    try {
      const response = await fetch(`/api/mvp/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      const { lesson } = await response.json();
      setScheduleItems((prev) => prev.map((item) => (item.id === id ? lesson : item)));
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось обновить урок");
      return false;
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      const response = await fetch(`/api/mvp/schedule/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": getMvpRoleHeader() },
      });
      if (!response.ok) throw new Error(await response.text());
      setScheduleItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: "cancelled" } : item)));
      return true;
    } catch (error: any) {
      notifyError(error.message || "Не удалось отменить урок");
      return false;
    }
  };

  // Announcement CRUD (local state — no backend table yet)
  const handleCreateAnnouncement = (data: { title: string; content: string; audience: AnnouncementAudience; isImportant: boolean }) => {
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      organizationId: "00000000-0000-0000-0000-000000000001",
      title: data.title,
      content: data.content,
      audience: data.audience,
      date: new Date().toISOString().slice(0, 10),
      authorId: "owner-1",
      authorName: "Асланбек Болотаев",
      authorRole: "Владелец",
      likes: 0,
      isImportant: data.isImportant
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    addAuditLog("Создание объявления", `Опубликовано: «${data.title}»`);
  };

  const handleUpdateAnnouncement = (id: string, data: { title?: string; content?: string; audience?: AnnouncementAudience; isImportant?: boolean }) => {
    setAnnouncements((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a));
    addAuditLog("Изменение объявления", `Обновлено объявление (${id})`);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    addAuditLog("Удаление объявления", `Объявление удалено (${id})`);
  };

  // Action: Post Payment / subscription extension
  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeStud = students.find((s) => s.id === selectedStudentId);
    if (!activeStud) return;

    try {
      const response = await fetch("/api/mvp/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": getMvpRoleHeader()
        },
        body: JSON.stringify({
          studentId: selectedStudentId,
          branchId: activeStud.branchId,
          amount: paymentAmount,
          method: paymentMethod,
          description: paymentDesc
        })
      });
      if (!response.ok) throw new Error(await response.text());
      await loadMvpBootstrap(activeRole);
      setShowAddPaymentModal(false);
      toast.success("Оплата зарегистрирована");
      addAuditLog("Регистрация оплаты", `Студент ${activeStud.name} оплатил ${paymentAmount} ₸. Способ: ${paymentMethod}`);
    } catch (error: any) {
      notifyError(error.message || "Не удалось зарегистрировать оплату");
    }
  };

  // Change student level points (gaining achievements)
  const addLevelPoint = (studioId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studioId) {
          const newPoints = s.artistLevelPoints + 45;
          let newLevel = s.artistLevel;
          // check progress milestone thresholds
          if (newPoints > 900) {
            newLevel = ArtistLevel.ACADEMY_LEGEND;
          } else if (newPoints > 700) {
            newLevel = ArtistLevel.SENIOR_STUDENT;
          } else if (newPoints > 500) {
            newLevel = ArtistLevel.SOLOIST;
          } else if (newPoints > 350) {
            newLevel = ArtistLevel.SCHOOL_REPRESENTATIVE;
          } else if (newPoints > 200) {
            newLevel = ArtistLevel.PERFORMANCE_MEMBER;
          } else if (newPoints > 100) {
            newLevel = ArtistLevel.ENSEMBLE_STUDENT;
          }
          
          return {
            ...s,
            artistLevelPoints: newPoints,
            artistLevel: newLevel
          };
        }
        return s;
      })
    );
    addAuditLog("Присуждение очков артиста", `Добавлен прогресс в "Путь Артиста" для ученика.`);
  };

  // Action: Add Teacher progress note
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNotePrivate, setNewNotePrivate] = useState(false);
  
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent) return;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === selectedStudentId) {
          const newNote = {
            id: `note-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            teacherId: "teach-aslan",
            teacherName: "Аслан Плиев",
            content: newNoteContent,
            isPrivate: newNotePrivate,
          };
          return {
            ...s,
            notes: [newNote, ...s.notes],
          };
        }
        return s;
      })
    );

    addAuditLog(
      "Заметка преподавателя",
      `Добавлена ${newNotePrivate ? "скрытая" : "публичная"} рекомендация для ученика.`
    );
    setNewNoteContent("");
  };

  // Switch attendance directly in the tracker table
  const toggleAttendance = async (
    studId: string,
    date: string,
    status: AttendanceStatus,
    opts?: { absenceReason?: AbsenceReason | null; isTrial?: boolean }
  ) => {
    if (mvpDataMode === "supabase") {
      try {
        const response = await fetch("/api/mvp/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-role": getMvpRoleHeader()
          },
          body: JSON.stringify({
            studentId: studId,
            date,
            status,
            absenceReason: opts?.absenceReason ?? null,
            isTrial: opts?.isTrial ?? undefined
          })
        });
        if (!response.ok) throw new Error(await response.text());
        await loadMvpBootstrap(activeRole);
        return;
      } catch (error: any) {
        notifyError(error.message || "Не удалось отметить посещаемость в Supabase");
      }
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studId) {
          const currentAttendance = { ...s.attendance };
          currentAttendance[date] = {
            date,
            status,
            markedBy: "Учитель Аслан Плиев",
            absenceReason: opts?.absenceReason ?? null,
            isTrial: opts?.isTrial,
          };
          return {
            ...s,
            attendance: currentAttendance,
          };
        }
        return s;
      })
    );
    addAuditLog(
      "Контроль посещаемости",
      `Выставлен статус ${status} для ${students.find((std) => std.id === studId)?.name} на дату ${date}`
    );
  };

  // ============================================================
  // ПЕДАГОГИЧЕСКИЕ ХЕНДЛЕРЫ ПРЕПОДАВАТЕЛЯ
  // (API при supabase-режиме, иначе локальное состояние — паттерн toggleAttendance)
  // ============================================================
  const [teacherHomework, setTeacherHomework] = useState<Homework[]>([]);

  const mapHomeworkRow = (row: any): Homework => ({
    id: row.id,
    groupId: row.group_id || "",
    title: row.title,
    description: row.description || "",
    dueDate: row.due_at || "",
    videoUrl: row.video_url || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    status: row.status === "done" ? "completed" : row.status === "submitted" ? "viewed" : "assigned",
  });

  // Добавить заметку / похвалу по ученику
  const addTeacherNote = async (
    studentId: string,
    content: string,
    opts: { kind?: "note" | "praise" | "concern"; isPrivate?: boolean } = {}
  ) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const kind = opts.kind || "note";
    const prefix = kind === "praise" ? "👏 " : kind === "concern" ? "⚠️ " : "";
    if (mvpDataMode === "supabase") {
      try {
        const response = await fetch("/api/mvp/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
          body: JSON.stringify({ studentId, content: trimmed, kind, isPrivate: Boolean(opts.isPrivate) }),
        });
        if (!response.ok) throw new Error(await response.text());
        await loadMvpBootstrap(activeRole);
        addAuditLog("Заметка преподавателя", `${kind === "praise" ? "Похвала" : "Заметка"} для ученика (${studentId})`);
        return;
      } catch (error: any) {
        notifyError(error.message || "Не удалось сохранить заметку в Supabase");
      }
    }
    const note: StudentProgressNote = {
      id: `note-${Date.now()}`,
      date: new Date().toISOString(),
      teacherId: "teach-aslan",
      teacherName: "Аслан Плиев",
      content: prefix + trimmed,
      isPrivate: Boolean(opts.isPrivate),
    };
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, notes: [note, ...(s.notes || [])] } : s))
    );
    addAuditLog("Заметка преподавателя", `${kind === "praise" ? "Похвала" : "Заметка"} для ${students.find((s) => s.id === studentId)?.name || studentId}`);
  };

  // Выдать домашнее задание (индивидуальное или групповое)
  const assignHomework = async (data: {
    studentId?: string;
    groupId?: string;
    title: string;
    description?: string;
    dueAt?: string;
    videoUrl?: string;
  }): Promise<Homework | null> => {
    if (!data.title.trim()) return null;
    if (mvpDataMode === "supabase") {
      try {
        const response = await fetch("/api/mvp/homework", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        const hw = mapHomeworkRow(payload.homework);
        setTeacherHomework((prev) => [hw, ...prev]);
        addAuditLog("Домашнее задание", `Выдано «${data.title}»`);
        return hw;
      } catch (error: any) {
        notifyError(error.message || "Не удалось выдать задание в Supabase");
      }
    }
    const hw: Homework = {
      id: `hw-${Date.now()}`,
      groupId: data.groupId || "",
      title: data.title.trim(),
      description: data.description || "",
      dueDate: data.dueAt || new Date(Date.now() + 3 * 86400000).toISOString(),
      videoUrl: data.videoUrl,
      createdAt: new Date().toISOString(),
      status: "assigned",
    };
    setTeacherHomework((prev) => [hw, ...prev]);
    addAuditLog("Домашнее задание", `Выдано «${hw.title}»`);
    return hw;
  };

  // Обновить статус домашнего задания (проверка/выполнение)
  const updateHomework = async (id: string, patch: { status?: Homework["status"]; gradeComment?: string }) => {
    if (mvpDataMode === "supabase") {
      try {
        const response = await fetch(`/api/mvp/homework/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
          body: JSON.stringify(patch.status ? { ...patch, status: patch.status === "completed" ? "done" : patch.status } : patch),
        });
        if (!response.ok) throw new Error(await response.text());
      } catch (error: any) {
        notifyError(error.message || "Не удалось обновить задание");
      }
    }
    setTeacherHomework((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } as Homework : h)));
    addAuditLog("Домашнее задание", `Обновлён статус задания (${id})`);
  };

  // Отметить всю группу за дату
  const bulkMarkAttendance = async (
    groupId: string,
    date: string,
    status: AttendanceStatus = "present"
  ): Promise<number> => {
    if (mvpDataMode === "supabase") {
      try {
        const response = await fetch("/api/mvp/attendance/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
          body: JSON.stringify({ groupId, date, status }),
        });
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        await loadMvpBootstrap(activeRole);
        addAuditLog("Массовая посещаемость", `Группа ${groupId}: отмечено ${payload.marked} учеников (${status})`);
        return payload.marked || 0;
      } catch (error: any) {
        notifyError(error.message || "Не удалось отметить группу в Supabase");
      }
    }
    let count = 0;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.groupIds?.includes(groupId)) {
          count++;
          return { ...s, attendance: { ...s.attendance, [date]: { date, status, markedBy: "Аслан Плиев" } } };
        }
        return s;
      })
    );
    addAuditLog("Массовая посещаемость", `Группа ${groupId}: отмечено ${count} учеников (${status})`);
    return count;
  };

  // --- API раздела «Журнал посещаемости» (ТЗ) ---
  const journalApi = useMemo(() => ({
    loadDashboard: async (params: { branchId?: string | null; groupId?: string | null; from?: string; to?: string }) => {
      const qs = new URLSearchParams();
      if (params.branchId) qs.set("branchId", params.branchId);
      if (params.groupId) qs.set("groupId", params.groupId);
      if (params.from) qs.set("from", params.from);
      if (params.to) qs.set("to", params.to);
      const r = await fetch(`/api/mvp/journal/dashboard?${qs.toString()}`, { headers: { "x-demo-role": getMvpRoleHeader() } });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    loadRecalculations: async (studentId?: string) => {
      const qs = studentId ? `?studentId=${studentId}` : "";
      const r = await fetch(`/api/mvp/recalculations${qs}`, { headers: { "x-demo-role": getMvpRoleHeader() } });
      if (!r.ok) return [];
      const d = await r.json();
      return d.recalculations || [];
    },
    createRecalculation: async (payload: any) => {
      const r = await fetch("/api/mvp/recalculations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Ошибка перерасчёта");
      return r.json();
    },
    setPayLater: async (studentId: string, enabled: boolean) => {
      const r = await fetch(`/api/mvp/students/${studentId}/pay-later`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify({ enabled }),
      });
      if (r.ok) await loadMvpBootstrap(activeRole);
      return r.ok;
    },
  }), [activeRole, mvpDataMode]);

  const handleJournalTask = (payload: { studentId: string; studentName: string; title: string }) => {
    addAuditLog("Журнал · задача", `${payload.title} (${payload.studentName})`);
  };

  // AI: план занятия / свободный педагогический запрос (gemini + локальный фолбэк)
  const generateLessonPlan = async (prompt: string, ctx: { groupName?: string; groupLevel?: string; studentCount?: number } = {}) => {
    try {
      const response = await fetch("/api/gemini/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify({ prompt, ...ctx }),
      });
      if (!response.ok) throw new Error(await response.text());
      addAuditLog("AI план занятия", prompt.slice(0, 60));
      return await response.json();
    } catch {
      addAuditLog("AI план занятия [Fallback]", prompt.slice(0, 60));
      return {
        title: prompt || "План занятия",
        summary: "Локальный демо-план (AI недоступен). Подключите GEMINI_API_KEY для живой генерации.",
        sections: [
          { heading: "Разминка (10 мин)", items: ["Суставная гимнастика", "Базовый ход лезгинки в медленном темпе", "Постановка корпуса и рук"] },
          { heading: "Основная часть (40 мин)", items: ["Отработка связки по группам", "Синхронность рук в трюковых элементах", "Работа над переходами строя"] },
          { heading: "Отработка (25 мин)", items: ["Прогон номера целиком", "Точечная коррекция слабых мест", "Повтор финала на сцене"] },
          { heading: "Завершение (5 мин)", items: ["Растяжка и заминка", "Похвала и фиксация прогресса", "Постановка домашнего задания"] },
        ],
      };
    }
  };

  // AI: персональный план развития ученика (переиспользуем student-analysis)
  const generateStudentDevPlan = async (student: Student) => {
    try {
      const response = await fetch("/api/gemini/student-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
        body: JSON.stringify({ student: { name: student.name, level: student.artistLevel, age: student.age }, notes: student.notes }),
      });
      if (!response.ok) throw new Error(await response.text());
      addAuditLog("AI план развития", `Сгенерирован план для ${student.name}`);
      return await response.json();
    } catch {
      addAuditLog("AI план развития [Fallback]", `Демо-план для ${student.name}`);
      return {
        praise: "Уверенно держит базовые перестроения, высокая выносливость на темповых связках.",
        focusArea: "Синхронность рук в трюковых элементах и удержание концентрации к финалу занятия.",
        nextMilestoneAdvice: "Назначить ДЗ на отработку позиции рук перед зеркалом. Готов к массовому блоку лезгинки на фестивале.",
      };
    }
  };

  // Раздел «Спасибо»: записать безопасную реакцию ученика
  const submitReaction = async (
    reactionKey: string,
    opts: { studentId?: string; groupId?: string; teacherId?: string } = {}
  ): Promise<boolean> => {
    if (mvpDataMode === "supabase") {
      try {
        const response = await fetch("/api/mvp/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": getMvpRoleHeader() },
          body: JSON.stringify({ reactionKey, ...opts }),
        });
        if (!response.ok) throw new Error(await response.text());
        addAuditLog("Безопасная реакция", `Записана реакция «${reactionKey}»`);
        return true;
      } catch (error: any) {
        notifyError(error.message || "Не удалось сохранить реакцию");
        return false;
      }
    }
    addAuditLog("Безопасная реакция", `Записана реакция «${reactionKey}» (локально)`);
    return true;
  };

  // Раздел «Спасибо»: агрегированная сводка реакций
  const loadReactionSummary = async (
    filters: { from?: string; to?: string; groupId?: string } = {}
  ): Promise<{ total: number; byKey: Record<string, number>; byGroup: { groupId: string; count: number }[] } | null> => {
    if (mvpDataMode !== "supabase") return null;
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.groupId) params.set("groupId", filters.groupId);
      const response = await fetch(`/api/mvp/reactions/summary?${params.toString()}`, {
        headers: { "x-demo-role": getMvpRoleHeader() },
      });
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    } catch {
      return null;
    }
  };

  // Toggle student payment status manually
  const handleTogglePaymentStatus = (studentId: string, status: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            paymentStatus: status,
          };
        }
        return s;
      })
    );
    addAuditLog(
      "Обновление статуса оплаты",
      `Статус ученика изменен на "${status}"`
    );
  };

  // Trigger quick automated one-click simulated payment notification to parent
  const handleSendQuickPaymentNotification = (studentId: string, customText?: string) => {
    const s = students.find((st) => st.id === studentId);
    if (!s) return;

    const messageToSend = customText || `Здравствуйте, ${s.parentName}!\nНапоминаем о необходимости произвести оплату обучения ${s.name} в Академии народного танца «Эхо Гор» по причине отсутствия активного абонемента. Баланс: ${s.balance} ₸. Спасибо!\n\nСлужба заботы «Эхо Гор»`;

    // 1. Simulating in-app alert for Parents
    const warningAlert = {
      id: `alert-payment-${Date.now()}`,
      title: `⚠️ Напоминание об оплате обучения: ${s.name}`,
      content: messageToSend,
      sentAt: new Date().toISOString(),
      authorName: "Асланбек Болотаев",
      channels: ["sms", "push", "whatsapp"],
      isImportant: true
    };
    setUnreadSimulatedAlerts((prev) => [warningAlert, ...prev]);

    // 2. Keep record in audit logs
    addAuditLog(
      "СМС Напоминание",
      `Родителю ${s.parentName} (${s.parentPhone}) отправлено оповещение по статусу "В ожидании оплаты" для ученика ${s.name}`
    );

    // 3. Show instant success toast
    setSuccessNotifText(`Напоминание родителю ${s.parentName} отправлено в 1 клик! 📲`);
    setTimeout(() => {
      setSuccessNotifText(null);
    }, 4000);
  };

  // ==========================================
  // COMPETITION SCHEDULER HELPER FUNCTIONS
  // ==========================================
  const handleAddCompetition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompTitle || !newCompLocation) return;
    
    const newComp: Competition = {
      id: `comp-${Date.now()}`,
      title: newCompTitle,
      date: newCompDate,
      level: newCompLevel,
      scope: newCompScope,
      location: newCompLocation,
      prizePool: newCompPrize || "Дипломы лауреатов",
      registeredGroupIds: newCompPreselGroup ? [newCompPreselGroup] : [],
      status: "registering",
      rehearsalSlots: newCompPreselGroup ? {
        [newCompPreselGroup]: ["Суббота 13:00 - 14:30 (Зал Алатау)"]
      } : {}
    };

    setCompetitions(prev => [newComp, ...prev]);
    setSelectedCompId(newComp.id);
    setShowAddCompModal(false);
    
    // Reset inputs
    setNewCompTitle("");
    setNewCompLocation("");
    setNewCompPrize("");
    setNewCompPreselGroup("");

    addAuditLog(
      "Регистрация конкурса",
      `Добавлен новый конкурс "${newCompTitle}" в городе ${newCompLocation}`
    );
  };

  // ── Owner CRUD концертов (локальный стейт) ──
  type OwnerCompetitionInput = {
    title?: string;
    date?: string;
    location?: string;
    level?: "regional" | "republican";
    scope?: "kazakhstan" | "cis";
    status?: "registering" | "rehearsals" | "completed";
    prizePool?: string;
    responsibleTeacherId?: string;
    participantStudentIds?: string[];
  };

  const handleOwnerCreateCompetition = async (data: OwnerCompetitionInput): Promise<boolean> => {
    if (!data.title || !data.location) return false;
    const newComp: Competition = {
      id: `comp-${Date.now()}`,
      title: data.title,
      date: data.date || new Date().toISOString().slice(0, 10),
      level: data.level || "regional",
      scope: data.scope || "kazakhstan",
      location: data.location,
      prizePool: data.prizePool || "Дипломы лауреатов",
      registeredGroupIds: [],
      status: data.status || "registering",
      rehearsalSlots: {},
      responsibleTeacherId: data.responsibleTeacherId,
      participantStudentIds: data.participantStudentIds || []
    };
    setCompetitions(prev => [newComp, ...prev]);
    addAuditLog("Создан концерт", `Добавлен концерт "${newComp.title}" (${newComp.location})`);
    return true;
  };

  const handleOwnerUpdateCompetition = async (id: string, data: OwnerCompetitionInput): Promise<boolean> => {
    setCompetitions(prev => prev.map(c => c.id === id ? {
      ...c,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.date !== undefined ? { date: data.date } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.level !== undefined ? { level: data.level } : {}),
      ...(data.scope !== undefined ? { scope: data.scope } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.prizePool !== undefined ? { prizePool: data.prizePool } : {}),
      ...(data.responsibleTeacherId !== undefined ? { responsibleTeacherId: data.responsibleTeacherId } : {}),
      ...(data.participantStudentIds !== undefined ? { participantStudentIds: data.participantStudentIds } : {})
    } : c));
    addAuditLog("Изменён концерт", `Обновлён концерт ${id}`);
    return true;
  };

  const handleOwnerDeleteCompetition = async (id: string): Promise<boolean> => {
    const comp = competitions.find(c => c.id === id);
    setCompetitions(prev => prev.filter(c => c.id !== id));
    addAuditLog("Удалён концерт", `Удалён концерт "${comp?.title || id}"`);
    return true;
  };

  const handleRegisterGroupForComp = (compId: string, groupId: string) => {
    if (!groupId) return;
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId) {
        if (c.registeredGroupIds.includes(groupId)) return c;
        const slots = c.rehearsalSlots ? { ...c.rehearsalSlots } : {};
        if (!slots[groupId]) {
          slots[groupId] = ["Суббота 13:00 - 14:30 (Зал Эльбрус)"];
        }
        return {
          ...c,
          registeredGroupIds: [...c.registeredGroupIds, groupId],
          rehearsalSlots: slots
        };
      }
      return c;
    }));
    const gr = groups.find(g => g.id === groupId);
    const cm = competitions.find(c => c.id === compId);
    setAiCompAdviceResult(null); // Clear previous advice
    addAuditLog("Запланировано участие ансамбля", `Ансамбль "${gr?.name}" заявлен на участие в "${cm?.title}"`);
  };

  const handleUnregisterGroupFromComp = (compId: string, groupId: string) => {
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId) {
        const slots = c.rehearsalSlots ? { ...c.rehearsalSlots } : {};
        delete slots[groupId];
        return {
          ...c,
          registeredGroupIds: c.registeredGroupIds.filter(id => id !== groupId),
          rehearsalSlots: slots
        };
      }
      return c;
    }));
    const gr = groups.find(g => g.id === groupId);
    const cm = competitions.find(c => c.id === compId);
    setAiCompAdviceResult(null); // Clear advice since registrant changed
    addAuditLog("Отмена участия в конкурсе", `Снята заявка ансамбля "${gr?.name}" с конкурса "${cm?.title}"`);
  };

  const handleAddRehearsalSlot = (compId: string, groupId: string) => {
    if (!newRehearsalTime) return;
    const slotString = `${newRehearsalDay} ${newRehearsalTime} (${newRehearsalHall})`;
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId) {
        const slots = c.rehearsalSlots ? { ...c.rehearsalSlots } : {};
        const groupSlots = slots[groupId] ? [...slots[groupId]] : [];
        if (groupSlots.includes(slotString)) return c;
        slots[groupId] = [...groupSlots, slotString];
        return {
          ...c,
          rehearsalSlots: slots
        };
      }
      return c;
    }));
    const gr = groups.find(g => g.id === groupId);
    addAuditLog("Репетиционный слот ансамбля", `Выделено дополнительное время для "${gr?.name}": ${slotString}`);
  };

  const handleDeleteRehearsalSlot = (compId: string, groupId: string, slotIdx: number) => {
    setCompetitions(prev => prev.map(c => {
      if (c.id === compId && c.rehearsalSlots) {
        const slots = { ...c.rehearsalSlots };
        if (slots[groupId]) {
          slots[groupId] = slots[groupId].filter((_, i) => i !== slotIdx);
          return {
            ...c,
            rehearsalSlots: slots
          };
        }
      }
      return c;
    }));
  };

  const handleGenerateCompAdvice = async (comp: Competition) => {
    if (comp.registeredGroupIds.length === 0) {
      return;
    }
    const groupId = comp.registeredGroupIds[0];
    const groupObj = groups.find(g => g.id === groupId);
    if (!groupObj) return;

    setAiCompAdviceGenerating(true);
    setAiCompAdviceResult(null);

    try {
      const response = await fetch("/api/gemini/competition-consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition: comp,
          groupName: groupObj.name,
          groupLevel: groupObj.level,
          studentCount: groupObj.studentCount
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const text = await response.json();
      setAiCompAdviceResult(text);
      addAuditLog(
        "AI консультация по конкурсу",
        `Получены рекомендации подготовки ансамбля "${groupObj.name}" к фестивалю "${comp.title}"`
      );
    } catch (e: any) {
      console.warn("Using fallback advisor guidelines:", e);
      setTimeout(() => {
        setAiCompAdviceResult({
          readinessRating: comp.level === "republican" ? "7.8 из 10 (Средний уровень готовности)" : "8.5 из 10 (Высокий уровень готовности)",
          rehearsalPlan: "Неделя 1-2: Фокусировка на синхронности массовой лезгинки/Симда, акцентирование осанки.\nНеделя 3: Выделенная отработка прыжковых трюков сольных позиций.\nНеделя 4: Сводные генеральные репетиции с полным переодеванием в сценические газыри, папахи и черкески.",
          stageCraftAdvice: "Позаботьтесь о традиционном этикете (адате) кавказского парного танца: взгляд партнера устремлен прямо или на черкеску, коснуться рукой платья девушки категорически запрещено. Юноши должны сохранять горделивую осанку, локти высоко зафиксированы."
        });
      }, 1200);
    } finally {
      setAiCompAdviceGenerating(false);
    }
  };

  // Mass Notification Dispatch Handler
  const handleTriggerMassNotification = () => {
    if (!notifFormTitle.trim() || !notifFormContent.trim()) {
      alert("Пожалуйста, заполните тему и текст объявления!");
      return;
    }

    const { students: stToNotify, parents: paToNotify } = getNotificationTargets(
      notifFilterType,
      notifSelectedBranchId,
      notifSelectedGroupId
    );

    // Filter labels
    let audienceName = "Все филиалы и группы";
    if (notifFilterType === "branch") {
      const b = branches.find(x => x.id === notifSelectedBranchId);
      audienceName = `Филиал: ${b?.name || notifSelectedBranchId}`;
    } else if (notifFilterType === "group") {
      const g = groups.find(x => x.id === notifSelectedGroupId);
      audienceName = `Группа: ${g?.name || notifSelectedGroupId}`;
    }

    const compiledRecipientList: any[] = [];
    paToNotify.forEach(p => {
      compiledRecipientList.push({ name: `${p.name} (Родитель)`, type: "parent", email: p.email, phone: p.phone, status: "pending" });
    });
    stToNotify.forEach(s => {
      compiledRecipientList.push({ name: `${s.name} (Ученик)`, type: "student", email: s.email, phone: s.phone, status: "pending" });
    });

    if (compiledRecipientList.length === 0) {
      alert("Нет получателей для выбранных критериев фильтрации!");
      return;
    }

    // Set simulator to preparing
    setSimDispatchState({
      status: "preparing",
      progress: 0,
      currentRecipientName: "",
      sentEmailsCount: 0,
      sentPushCount: 0,
      sentSmsCount: 0,
      recipientList: compiledRecipientList
    });

    // We block or animate dispatching in steps
    let currentStep = 0;
    const totalRecipients = compiledRecipientList.length;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep > totalRecipients) {
        clearInterval(interval);
        
        // Dispatch complete!
        // 1. Create the official Announcement
        const newAnn: Announcement = {
          id: `ann-${Date.now()}`,
          organizationId: branches[0]?.id || "unknown",
          title: notifFormTitle,
          content: notifFormContent,
          date: new Date().toISOString().split("T")[0],
          authorId: activeRole,
          authorName: "Асланбек Болотаев", // Using actual owner's name for consistency
          authorRole: roles.find(r => r.id === activeRole)?.name || "Руководитель",
          audience: "all",
          isImportant: notifIsImportant,
          likes: 0
        };

        setAnnouncements(prev => [newAnn, ...prev]);

        // 2. Add to mass notification history logs
        const newHist = {
          id: `notif-hist-${Date.now()}`,
          title: notifFormTitle,
          content: notifFormContent,
          sentAt: new Date().toISOString(),
          filterType: notifFilterType,
          filterValue: notifFilterType === "branch" ? notifSelectedBranchId : notifFilterType === "group" ? notifSelectedGroupId : "all",
          filterName: audienceName,
          channels: Object.keys(notifChannels).filter(k => notifChannels[k as keyof typeof notifChannels] && notifChannels[k as keyof typeof notifChannels] === true),
          recipients: { parents: paToNotify.length, students: stToNotify.length },
          status: "success",
          authorName: "Асланбек Болотаев"
        };
        setNotificationHistory(prev => [newHist, ...prev]);

        fetch("/api/mvp/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-role": getMvpRoleHeader()
          },
          body: JSON.stringify({
            branchId: notifFilterType === "branch" ? notifSelectedBranchId : notifSelectedBranchId,
            recipient: audienceName,
            subject: notifFormTitle,
            body: notifFormContent,
            channel: notifChannels.sms ? "sms" : "whatsapp"
          })
        }).catch((error) => notifyError(error.message || "Не удалось сохранить уведомление"));

        // 3. Queue in-app simulated alerts for parent/student simulation
        const liveAlert = {
          id: `alert-${Date.now()}`,
          title: notifFormTitle,
          content: notifFormContent,
          sentAt: new Date().toISOString(),
          authorName: "Асланбек Болотаев",
          channels: Object.keys(notifChannels).filter(k => notifChannels[k as keyof typeof notifChannels] && notifChannels[k as keyof typeof notifChannels] === true),
          isImportant: notifIsImportant
        };
        setUnreadSimulatedAlerts(prev => [liveAlert, ...prev]);

        // 4. Update core simulation state
        setSimDispatchState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: "complete",
            progress: 100,
            currentRecipientName: "Готово! Все уведомления успешно разосланы."
          };
        });

        // 5. Add audit logs
        addAuditLog(
          "Массовое экспресс-оповещение",
          `Оповещено получателей: ${totalRecipients} (${paToNotify.length} род. / ${stToNotify.length} уч.) во все выбранные каналы.`
        );

        // 6. Reset form
        setNotifFormTitle("");
        setNotifFormContent("");
        setNotifIsImportant(false);

      } else {
        // Step processing
        setSimDispatchState(prev => {
          if (!prev) return null;
          const currentRec = prev.recipientList[currentStep - 1];
          const updatedList = prev.recipientList.map((item, idx) => 
            idx === currentStep - 1 ? { ...item, status: "sent" as const } : item
          );

          return {
            ...prev,
            status: "sending",
            progress: Math.floor((currentStep / totalRecipients) * 100),
            currentRecipientName: currentRec.name,
            sentEmailsCount: prev.sentEmailsCount + (notifChannels.email ? 1 : 0),
            sentPushCount: prev.sentPushCount + (notifChannels.push ? 1 : 0),
            sentSmsCount: prev.sentSmsCount + (notifChannels.sms ? 1 : 0),
            recipientList: updatedList
          };
        });
      }
    }, 180); // Quick simulation tick for premium snappy UX
  };

  // Reset demo state key features
  const handleResetData = () => {
    loadMvpBootstrap(activeRole); // Reload from backend instead of resetting to local mock
    setAiCompAdviceResult(null);
    addAuditLog("Восстановление БД", "Тестовая кавказская база танцевальной сети сброшена до начального состояния");
  };

  const startLoginVideo = (target: "desktop" | "mobile") => {
    // Видео при входе отключено — сразу переходим в приложение.
    setLoginVideoNeedsTap(false);
    setIsLoginVideoPlaying(false);
    setLoginVideoTarget(null);

    if (target === "desktop") {
      setIsPlayingPromo(false);
    } else if (target === "mobile") {
      setMobileAuthStep("main");
    }
  };

  // Видео при входе удалено — звук больше не воспроизводится.
  const primeLoginVideoAudio = () => {};

  const handleDesktopLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const phone = (desktopEmail || "").replace(/\D/g, "");

    // 1) Вход ученика: номер телефона + стандартный пароль (12345).
    if (phone.length >= 10 && desktopPassword) {
      setStudentLoginBusy(true);
      try {
        const resp = await fetch("/api/mvp/student-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password: desktopPassword }),
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok) {
          addAuditLog("Авторизация ученика", `Вход по телефону +7${phone}. Права: ${data?.level === "junior" ? "маленькая" : "взрослая"} группа`);
          applyStudentAuth(data);
          return;
        }
        // Телефон совпал с учеником, но пароль неверный — не пускаем дальше.
        if (resp.status === 401) {
          setDesktopLoginError(data?.error || "Неверный пароль");
          return;
        }
        // 404 — телефон не принадлежит ученику: пробуем как персонал (демо).
      } catch {
        // нет связи с сервером — падаем в демо-вход персонала
      } finally {
        setStudentLoginBusy(false);
      }
    }

    // 2) Персонал (демо): по умолчанию — Владелец сети.
    setActiveRole("owner");
    addAuditLog("Авторизация CRM (Десктоп)", `Вход персонала: ${phone ? "+7" + phone : "Владелец (по умолчанию)"}`);
    startLoginVideo("desktop");
  };

  // Быстрый вход выбором роли-плитки на экране входа
  const handleRoleLogin = (roleId: string) => {
    const roleName = roles.find((r) => r.id === roleId)?.name || roleId;
    setActiveRole(roleId);
    setActiveHotspot(null);
    setDesktopLoginError(null);
    addAuditLog("Авторизация CRM (Выбор роли)", `Вход по роли: ${roleName}`);
    startLoginVideo("desktop");
  };

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden bg-[#0A0A0A] text-slate-200 font-sans ${themeMode === "day" ? "day-theme-app" : themeMode === "iman" ? "iman-theme-app" : ""}`}>
      <ToastHost />

      {/* Desktop login uses the supplied image as the visible UI, with real controls as transparent hotspots. */}
      {/* ═══ Экран входа «Эхогор» — фон-фото + логотип/тэглайн живой вёрсткой ═══
          Логика входа НЕ менялась: handleDesktopLogin, телефон +7, пароль,
          desktopEmail/Password/RememberMe/ShowPassword, primeLoginVideoAudio,
          кнопка мобильного симулятора — всё как было.
          Изменена только оформительская обёртка: чистое фото фоном, мягкое
          затемнение вместо жёсткой колонки 42%, логотип и тэглайн вынесены
          в разметку (раньше были вшиты в картинку). */}
      {isPlayingPromo && (
        <div className="login-auth-screen fixed inset-0 z-[9999] bg-[#0A0D14] overflow-hidden select-none animate-fade-in font-sans text-slate-200">
          {/* Базовый тёмный фон — всегда виден, даже если фото не подгрузилось. */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(120% 120% at 15% 10%, #1a2536 0%, #0B1018 45%, #05070C 100%)" }} />

          {/* Фоновая фотография (чистая, без вшитого логотипа). Одна на все экраны;
              object-position смещён влево, чтобы танцоры не обрезались на узких экранах. */}
          <img
            src={desktopLoginBg}
            alt=""
            aria-hidden="true"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            className="absolute inset-0 hidden h-full w-full object-cover opacity-95 md:block"
            style={{ objectPosition: "30% center" }}
            referrerPolicy="no-referrer"
          />
          <img
            src={mobileLoginBg}
            alt=""
            aria-hidden="true"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            className="absolute inset-0 block h-full w-full object-cover opacity-95 md:hidden"
            style={{ objectPosition: "30% center" }}
            referrerPolicy="no-referrer"
          />

          {/* Затемнение: снизу сильнее (под мобильную карточку), справа сильнее (под десктопную).
              Мягкие градиенты в sRGB — без oklab-артефактов Tailwind v4, тянутся под любую ширину. */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,7,12,0.45) 0%, rgba(5,7,12,0.22) 38%, rgba(5,7,12,0.90) 100%)" }} />
          <div className="absolute inset-0 hidden md:block" style={{ background: "radial-gradient(120% 90% at 100% 50%, rgba(5,7,12,0.90), rgba(5,7,12,0) 60%)" }} />

          {/* Логотип «ЭХОГОР» — живой вёрсткой: по центру сверху на мобильном, слева на десктопе. */}
          <img
            src={echoLogo}
            alt="ЭХОГОР — студия кавказского танца"
            className="pointer-events-none absolute z-[5] left-1/2 top-[clamp(20px,4vw,44px)] w-[clamp(190px,52vw,300px)] -translate-x-1/2 drop-shadow-[0_6px_24px_rgba(0,0,0,0.5)] md:left-[clamp(28px,4vw,56px)] md:translate-x-0"
          />

          {/* Тэглайн «Сила | Честь | Традиции» — живой вёрсткой: снизу по центру / слева на десктопе. */}
          <div className="pointer-events-none absolute z-[5] bottom-[clamp(20px,4vw,44px)] left-1/2 flex -translate-x-1/2 items-center gap-[0.55rem] whitespace-nowrap text-[clamp(14px,3.3vw,18px)] font-extrabold uppercase tracking-[0.14em] drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] md:left-[clamp(28px,4vw,56px)] md:translate-x-0">
            <span className="text-[#8FB4C9]">Сила</span>
            <span className="font-medium text-white/35">|</span>
            <span className="text-[#C5A059]">Честь</span>
            <span className="font-medium text-white/35">|</span>
            <span className="text-white">Традиции</span>
          </div>

          {/* Настоящая форма входа — адаптив: по центру на узких экранах, справа на десктопе;
              на мобильном добавлены отступы сверху/снизу, чтобы карточка не наезжала на логотип и тэглайн. */}
          <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto px-4 pt-[120px] pb-[84px] sm:px-5 md:justify-end md:pr-[clamp(24px,6vw,96px)] md:pt-8 md:pb-8">
            <form
              onSubmit={handleDesktopLogin}
              noValidate
              className="my-auto w-full max-w-[400px] rounded-[24px] border border-white/10 bg-[#0E1420]/90 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:rounded-[28px] sm:p-8"
            >
              <div className="mb-6 text-center">
                <h2 className="text-[26px] font-black tracking-tight text-white sm:text-[28px]">Добро пожаловать!</h2>
                <p className="mt-1.5 text-sm text-slate-400">Войдите по номеру телефона, чтобы продолжить</p>
              </div>

              {/* Телефон +7 */}
              <label className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition focus-within:border-[#C5A059]/70 focus-within:bg-white/[0.06]">
                <Phone className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-[15px] font-semibold text-slate-300 select-none">+7</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(___) ___-__-__"
                  value={desktopEmail}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setDesktopEmail(digits);
                    setActiveHotspot(null);
                    setDesktopLoginError(null);
                  }}
                  className="w-full bg-transparent text-[15px] tracking-wide text-white outline-none placeholder:text-slate-500"
                />
              </label>

              {/* Пароль */}
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition focus-within:border-[#C5A059]/70 focus-within:bg-white/[0.06]">
                <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type={desktopShowPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Пароль"
                  value={desktopPassword}
                  onChange={(e) => {
                    setDesktopPassword(e.target.value);
                    setActiveHotspot(null);
                    setDesktopLoginError(null);
                  }}
                  className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  aria-label={desktopShowPassword ? "Скрыть пароль" : "Показать пароль"}
                  onClick={() => setDesktopShowPassword(!desktopShowPassword)}
                  className="shrink-0 text-slate-400 transition hover:text-white"
                >
                  {desktopShowPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </label>

              {/* Запомнить / Забыли пароль */}
              <div className="mt-4 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={desktopRememberMe}
                    onChange={() => setDesktopRememberMe(!desktopRememberMe)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 accent-[#C5A059]"
                  />
                  Запомнить меня
                </label>
                <button
                  type="button"
                  onClick={() => {
                    alert("Доступ выдаёт студия при добавлении ученика/сотрудника: номер телефона +7 и пароль. Забыли пароль — обратитесь к администратору.");
                  }}
                  className="text-sm font-semibold text-[#C5A059] transition hover:text-[#d8b877]"
                >
                  Забыли пароль?
                </button>
              </div>

              {desktopLoginError && (
                <p className="mt-3 text-sm font-semibold text-rose-400">{desktopLoginError}</p>
              )}

              {/* Войти */}
              <button
                type="submit"
                onPointerDown={primeLoginVideoAudio}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#C5A059] to-[#B3894A] px-4 py-3.5 text-base font-black text-[#1a1206] shadow-lg shadow-[#C5A059]/20 transition hover:brightness-110 active:scale-[0.99]"
              >
                Войти
                <ArrowRight className="h-5 w-5" />
              </button>

              <p className="mt-4 text-center text-xs text-slate-500">
                Доступ выдаёт студия при добавлении ученика или сотрудника
              </p>
            </form>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsPlayingPromo(false);
              setIsMobileSimulatorOpen(true);
              setMobileAuthStep("welcome");
              addAuditLog("Авторизация", "Демо-вход в мобильный симулятор из десктопного портала");
            }}
            className="absolute right-6 top-6 z-20 px-4 py-2 opacity-0"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Запустить мобильный кабинет</span>
          </button>

        </div>
      )}
      {/* Видео-переход при входе полностью удалён. */}

      {/* Old assembled login screen kept disabled while the supplied mockup drives the visible UI. */}
      {false && isPlayingPromo && (
        <div className="fixed inset-0 z-[9999] bg-[#0A0D14] flex overflow-hidden select-none animate-fade-in font-sans text-slate-200">
          
          {/* LEFT SIDE BRAND & AVATAR COLUMN (42% width) */}
          <div className="relative w-[42%] bg-gradient-to-b from-[#111622] via-[#090C12] to-[#04060A] border-r border-white/5 flex flex-col justify-between p-10 overflow-hidden shrink-0">
            
            {/* Real elegant founder & mountains wallpaper covering the entire left section */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
              <img
                src={trainerLoginImg}
                alt="Обои с основателем"
                className="w-full h-full object-cover opacity-90 transition-opacity duration-700"
                referrerPolicy="no-referrer"
              />
              {/* Cinematic Gradient overlay to blend perfectly and make text pop */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#04060A]/95 via-[#090C12]/20 to-[#111622]/40" />
            </div>

            {/* TOP HEADER LOGO (Custom built to look extremely close to image) */}
            <div className="relative z-10 flex flex-col items-center select-none text-center pt-2">
              <div className="flex flex-col items-center">
                <h1 className="text-[52px] font-black text-white tracking-[0.14em] leading-none mb-0.5 select-none font-sans filter drop-shadow-[0_2px_15px_rgba(255,255,255,0.03)] text-center">
                  ЭХОГОР
                </h1>
                
                {/* Custom Mountain Cap Graphic Layered beautifully matching the original logotype */}
                <svg viewBox="0 0 160 28" className="w-48 h-8 text-[#9C784D] fill-current -mt-1.5" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="12,24 48,8 75,16 112,3 148,24" />
                  <polygon points="38,12 48,8 54,13 48,15" fill="#ffffff" opacity="0.9" />
                  <polygon points="102,7 112,3 118,8 112,10" fill="#ffffff" opacity="0.95" />
                  <line x1="2" y1="25" x2="158" y2="25" stroke="#9C784D" strokeWidth="2.5" />
                </svg>

                <p className="text-[10px] text-[#C5A059] uppercase tracking-[0.38em] font-extrabold mt-1 text-center font-sans">
                  СТУДИЯ КАВКАЗСКОГО ТАНЦА
                </p>
              </div>
            </div>

            {/* INTERACTIVE TRAINER PORTRAIT AREA + INTERACTIVE PHOTOS HOTSPOTS */}
            <div className="relative z-20 flex-grow flex items-center justify-center py-6 min-h-[380px]">
              <div className="relative w-full max-w-[340px] h-full flex items-center justify-center">

                 {/* INTERACTIVE HOTSPOTS ("фото поинты") FROM USER REQUEST TO SELECT DEMO ROLES */}
                 
                 {/* Hotspot 1: Owner (network manager) */}
                 <div 
                   className="absolute top-[23%] left-[50%] z-20 group cursor-pointer"
                   onClick={() => {
                     setDesktopEmail("director@echogor.ru");
                     setDesktopPassword("magas2026");
                     setActiveRole("owner");
                     setActiveHotspot("hotspot-director");
                     setDesktopLoginError(null);
                     addAuditLog("Хотспот Автозаполнения", "Выбран профиль Директора Сети (director@echogor.ru)");
                   }}
                 >
                   <span className="absolute -inset-2.5 rounded-full bg-amber-500/30 animate-ping duration-1000"></span>
                   <div className={`w-3.5 h-3.5 rounded-full border-2 ${activeHotspot === "hotspot-director" ? 'bg-amber-400 border-white scale-110' : 'bg-[#C5A059] border-[#0A0D14]'} transition-all shadow-[0_0_12px_#C5A059] relative z-30 flex items-center justify-center`}>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                   </div>
                   
                   {/* Tooltip */}
                   <div className="absolute left-1/2 -translate-x-1/2 bottom-5 mb-1 w-52 bg-black/95 text-xs text-white p-2.5 rounded-xl border border-[#C5A059]/40 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 shadow-2xl z-40 text-center">
                      <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black border-r border-b border-[#C5A059]/40 rotate-45"></div>
                      <p className="font-extrabold text-[#C5A059] uppercase text-[9px] tracking-wider mb-0.5">Владелец Сети (Директор)</p>
                      <p className="text-[9px] text-slate-300 leading-normal">Финансы, отчетность, доступ ко всем филиалам Кавказа</p>
                      <p className="text-[8px] text-amber-500 font-mono mt-1 font-bold">Нажмите для автозаполнения</p>
                   </div>
                 </div>

                 {/* Hotspot 2: Teacher (Choreographer) */}
                 <div 
                   className="absolute top-[48%] left-[64%] z-20 group cursor-pointer"
                   onClick={() => {
                     setDesktopEmail("ustaz@echogor.ru");
                     setDesktopPassword("lezginka2026");
                     setActiveRole("teacher");
                     setActiveHotspot("hotspot-teacher");
                     setDesktopLoginError(null);
                     addAuditLog("Хотспот Автозаполнения", "Выбран профиль Преподавателя (ustaz@echogor.ru)");
                   }}
                 >
                   <span className="absolute -inset-2.5 rounded-full bg-amber-500/30 animate-ping duration-1000"></span>
                   <div className={`w-3.5 h-3.5 rounded-full border-2 ${activeHotspot === "hotspot-teacher" ? 'bg-amber-400 border-white scale-110' : 'bg-[#C5A059] border-[#0A0D14]'} transition-all shadow-[0_0_12px_#C5A059] relative z-30 flex items-center justify-center`}>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                   </div>
                   
                   {/* Tooltip */}
                   <div className="absolute left-1/2 -translate-x-1/2 bottom-5 mb-1 w-52 bg-black/95 text-xs text-white p-2.5 rounded-xl border border-[#C5A059]/40 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 shadow-2xl z-40 text-center">
                      <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black border-r border-b border-[#C5A059]/40 rotate-45"></div>
                      <p className="font-extrabold text-[#C5A059] uppercase text-[9px] tracking-wider mb-0.5">Преподаватель (Tutor)</p>
                      <p className="text-[9px] text-slate-300 leading-normal">Журналы посещаемости, залы репетиций, домашние задания</p>
                      <p className="text-[8px] text-amber-500 font-mono mt-1 font-bold">Нажмите для автозаполнения</p>
                   </div>
                 </div>

                 {/* Hotspot 4: Student (Soloist) */}
                 <div 
                   className="absolute top-[68%] left-[51%] z-20 group cursor-pointer"
                   onClick={() => {
                     setDesktopEmail("solist@echogor.ru");
                     setDesktopPassword("soloist2026");
                     setActiveRole("student");
                     setActiveHotspot("hotspot-student");
                     setDesktopLoginError(null);
                     addAuditLog("Хотспот Автозаполнения", "Выбран профиль Солиста (solist@echogor.ru)");
                   }}
                 >
                   <span className="absolute -inset-2.5 rounded-full bg-amber-500/30 animate-ping duration-1000"></span>
                   <div className={`w-3.5 h-3.5 rounded-full border-2 ${activeHotspot === "hotspot-student" ? 'bg-amber-400 border-white scale-110' : 'bg-[#C5A059] border-[#0A0D14]'} transition-all shadow-[0_0_12px_#C5A059] relative z-30 flex items-center justify-center`}>
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                   </div>
                   
                   {/* Tooltip */}
                   <div className="absolute left-1/2 -translate-x-1/2 bottom-5 mb-1 w-52 bg-black/95 text-xs text-white p-2.5 rounded-xl border border-[#C5A059]/40 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 shadow-2xl z-40 text-center">
                      <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black border-r border-b border-[#C5A059]/40 rotate-45"></div>
                      <p className="font-extrabold text-[#C5A059] uppercase text-[9px] tracking-wider mb-0.5">Ученик (Штудирование)</p>
                      <p className="text-[9px] text-slate-300 leading-normal">Табель занятий, зачеты, кубки, участие в конкурсах</p>
                      <p className="text-[8px] text-amber-500 font-mono mt-1 font-bold">Нажмите для автозаполнения</p>
                   </div>
                 </div>

              </div>
            </div>

            {/* LOWER SLOGAN AREA */}
            <div className="relative z-10 text-left px-4 mt-auto">
              <h2 className="text-[26px] font-black tracking-normal uppercase leading-tight text-white mb-2 font-sans">
                ТАНЕЦ. <span className="text-[#9C784D]">ТРАДИЦИЯ.</span> ГОРДОСТЬ.
              </h2>
              
              {/* Golden dividing line exactly matching original image */}
              <div className="w-full h-[1.5px] bg-gradient-to-r from-white/10 via-[#9C784D]/40 to-transparent mb-3"></div>
              
              <p className="text-xs text-slate-400 font-medium">
                Добро пожаловать в студию кавказского танца
              </p>
            </div>

          </div>

          {/* RIGHT SIDE FORM COLUMN (58% width) */}
          <div className="relative flex-1 bg-[#090D14] flex items-center justify-center p-12 overflow-y-auto">
            
            {/* Ambient luxury glow spot */}
            <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] bg-[#9C784D]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
            
            {/* Floating bypass launcher to force open the Mobile version */}
            <div className="absolute top-6 right-6 z-10">
              <button
                onClick={() => {
                  setIsPlayingPromo(false);
                  setIsMobileSimulatorOpen(true);
                  setMobileAuthStep("welcome");
                  addAuditLog("Авторизация", "Демо-вход в мобильный симулятор из десктопного портала");
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[#C5A059] hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl border border-white/5 transition-all flex items-center gap-2"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Запустить мобильный кабинет</span>
              </button>
            </div>

            <div className="relative z-10 w-full max-w-[440px] space-y-8">
              
              {/* Welcome text block */}
              <div className="text-center space-y-1.5">
                <h3 className="text-3xl font-extrabold text-white tracking-tight font-sans">
                  Добро пожаловать!
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  Войдите в свой аккаунт, чтобы продолжить
                </p>
              </div>

              {/* Form container */}
              <form 
                onSubmit={handleDesktopLogin}
                className="space-y-5"
              >
                {desktopLoginError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-xl animate-shake font-medium">
                    {desktopLoginError}
                  </div>
                )}

                {/* Account Selection Toast Banner when clicking hotspots */}
                {activeHotspot && (
                  <div className="p-3 bg-[#9C784D]/10 border border-[#9C784D]/30 rounded-xl text-xs flex items-center justify-between animate-fade-in">
                    <span className="text-slate-300 font-medium">
                      Загружен демо-аккаунт: <strong className="text-white">{activeHotspot === "hotspot-director" ? "Владелец" : activeHotspot === "hotspot-teacher" ? "Хореограф" : "Солист"}</strong>
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        setActiveHotspot(null);
                        setDesktopEmail("");
                        setDesktopPassword("");
                      }}
                      className="text-[10px] text-[#C5A059] hover:underline font-bold uppercase"
                    >
                      Сброс
                    </button>
                  </div>
                )}

                {/* Input 1: Email */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="email"
                      required
                      value={desktopEmail}
                      onChange={(e) => {
                        setDesktopEmail(e.target.value);
                        setActiveHotspot(null);
                        setDesktopLoginError(null);
                      }}
                      placeholder="Электронная почта"
                      className="block w-full pl-11 pr-4 py-3.5 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-[#070A0F] border border-white/10 focus:border-[#9C784D] rounded-xl text-sm placeholder-slate-500 text-white focus:outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Input 2: Password */}
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type={desktopShowPassword ? "text" : "password"}
                      required
                      value={desktopPassword}
                      onChange={(e) => {
                        setDesktopPassword(e.target.value);
                        setActiveHotspot(null);
                        setDesktopLoginError(null);
                      }}
                      placeholder="Пароль"
                      className="block w-full pl-11 pr-11 py-3.5 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-[#070A0F] border border-white/10 focus:border-[#9C784D] rounded-xl text-sm placeholder-slate-500 text-white focus:outline-none transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setDesktopShowPassword(!desktopShowPassword)}
                        className="text-slate-500 hover:text-slate-300 focus:outline-none"
                      >
                        {desktopShowPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember and Forgot Password Option line */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2.5 text-slate-400 hover:text-white cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={desktopRememberMe}
                      onChange={() => setDesktopRememberMe(!desktopRememberMe)}
                      className="w-4 h-4 bg-[#0A0D14] border border-white/10 rounded focus:ring-0 focus:ring-offset-0 accent-[#9C784D]"
                    />
                    <span className="select-none font-medium text-slate-400 group-hover:text-slate-300">Запомнить меня</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      alert("Информационный зачет:\nДля входа по демо-паспорту Вы можете кликнуть на ЛЮБУЮ светящуюся точку («фото поинт») в левой части экрана на портрете учителя! Это мгновенно выберет готовую учетную запись.");
                    }}
                    className="text-[#9C784D] hover:text-[#b38a5a] font-semibold transition-all hover:underline"
                  >
                    Забыли пароль?
                  </button>
                </div>

                {/* Submit button: ВОЙТИ */}
                <div className="pt-4 space-y-4">
                  <button
                    type="submit"
                    className="w-full h-[52px] bg-[#9C784D] hover:bg-[#a98357] text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_25px_rgba(156,120,77,0.25)] hover:shadow-[0_4px_30px_rgba(156,120,77,0.4)] active:scale-[0.98] outline-none flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>Войти</span>
                    <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      alert("Регистрация Студийных Аккаунтов:\nДля пробы разных ролей просто тапните по интерактивным меткам на костюме учителя слева. Новых учеников директор и преподаватели могут зарегистрировать в разделе «Ученики» внутри CRM.");
                    }}
                    className="w-full h-[52px] border border-[#9C784D]/40 hover:bg-white/[0.03] text-[#9C784D] hover:text-[#C5A059] font-bold text-sm uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Регистрация
                  </button>
                </div>

              </form>

              {/* Or separator block */}
              <div className="flex items-center gap-4 select-none pt-2">
                <div className="flex-1 h-[1px] bg-white/10" />
                <span className="text-xs text-slate-500 uppercase font-black tracking-widest">или</span>
                <div className="flex-1 h-[1px] bg-white/10" />
              </div>

              {/* Google Log in action */}
              <button
                type="button"
                onClick={() => {
                  // Open bypass google account trigger
                  setIsLoggingInWithGoogle(true);
                }}
                className="w-full h-[52px] bg-[#141a24] hover:bg-[#1c2432] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-3 border border-white/5 transition-all outline-none cursor-pointer"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18 v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66-.78-1.01-1.68-1.01-2.72z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Войти через Google</span>
              </button>

              <div className="text-center pt-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  Студия Эхо Гор • Единый Шлюз Авторизации
                </span>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/5 bg-[#121212] flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Logo badge */}
          <img
            src={logoImg}
            alt="Эхо Гор Лого"
            className="w-11 h-11 object-contain rounded-lg flex-shrink-0 border border-white/5"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-sm md:text-base font-bold tracking-wider uppercase text-white leading-tight flex items-center gap-2">
              Эхо <span className="text-[#C5A059]">Гор</span>
              <button
                onClick={() => setIsPlayingPromo(true)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#C5A059]/15 hover:bg-[#C5A059]/30 text-[#C5A059] hover:text-[#D5B069] border border-[#C5A059]/25 hover:border-[#C5A059]/40 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
                title="Воспроизвести промо-видео"
              >
                <Video className="w-2.5 h-2.5 animate-pulse" />
                <span>Промо</span>
              </button>
            </h1>
            <p className="hidden md:block text-[10px] text-slate-500 uppercase tracking-widest leading-none">
              Студия кавказского танца
            </p>
          </div>
        </div>

        {/* Middle quick simulator bar */}
        <div className="mx-2 flex min-w-0 items-center space-x-2 overflow-x-auto bg-white/5 p-1 rounded-xl border border-white/10 max-h-11">
          <span className="hidden lg:inline text-[10px] text-slate-400 font-semibold px-2 uppercase tracking-wide whitespace-nowrap">
            Эмуляция роли:
          </span>
          <div className="flex space-x-1 flex-nowrap">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id)}
                  id={`role-btn-${r.id}`}
                  className={`shrink-0 px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                    isSelected
                      ? "bg-[#C5A059] text-black font-bold shadow-[0_2px_8px_rgba(197,160,89,0.3)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                  title={r.name}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline-block max-w-[120px] truncate text-[10px] uppercase">
                    {r.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Status */}
        <div className="hidden xl:flex items-center space-x-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsThemeMenuOpen((open) => !open)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all outline-none ${
                themeMode === "day"
                  ? "bg-sky-100 text-slate-900 border border-sky-200 shadow-sm"
                  : themeMode === "iman"
                  ? "bg-[#C9A861]/15 border border-[#C9A861]/40 text-[#D8BC7E]"
                  : "bg-white/5 border border-white/10 hover:bg-[#C5A059]/20 hover:text-[#C5A059] text-slate-300"
              }`}
              title="Выбрать тему оформления"
            >
              {themeMode === "day" ? <Sun className="w-3.5 h-3.5" /> : themeMode === "iman" ? <Sparkles className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{themeMode === "day" ? "Дневная" : themeMode === "iman" ? "Iman Ver 1.0" : "Ночная"}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isThemeMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {isThemeMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 z-50 rounded-xl border border-white/10 bg-[#141414] shadow-2xl shadow-black/50 overflow-hidden py-1">
                  {([
                    { id: "dark", label: "Ночная", Icon: Moon },
                    { id: "day", label: "Дневная", Icon: Sun },
                    { id: "iman", label: "Iman Ver 1.0", Icon: Sparkles },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setThemeMode(id); setIsThemeMenuOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-left transition-colors ${
                        themeMode === id ? "bg-[#C5A059]/15 text-[#C5A059]" : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{label}</span>
                      {themeMode === id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C5A059]" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setIsMobileSimulatorOpen(!isMobileSimulatorOpen);
              if (!isMobileSimulatorOpen) {
                setMobileAuthStep("welcome");
              }
              addAuditLog("Симулятор Мобилки", isMobileSimulatorOpen ? "Симулятор закрыт" : "Симулятор запущен");
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all outline-none ${
              isMobileSimulatorOpen 
                ? "bg-[#C5A059] text-black shadow-lg shadow-[#C5A059]/20" 
                : "bg-white/5 border border-white/10 hover:bg-[#C5A059]/20 hover:text-[#C5A059] text-slate-300"
            }`}
            title="Переключить в симулятор мобильного кабинета"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isMobileSimulatorOpen ? "Закрыть симулятор" : "Мобильная версия"}</span>
          </button>

          <div className="bg-white/5 px-3 py-1.5 rounded-full flex items-center space-x-2 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              Статус: Высокий приоритет
            </span>
          </div>
          {/* Active user dummy */}
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-xs font-bold text-white line-clamp-1">дияс.рф</p>
              <p className="text-[10px] text-[#C5A059] uppercase tracking-tighter">
                {roles.find((r) => r.id === activeRole)?.badge || "Сотрудник"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full border border-[#C5A059] bg-[#161616] flex items-center justify-center text-xs font-bold text-[#C5A059]">
              Д
            </div>
          </div>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 xl:hidden">
          <button
            type="button"
            onClick={() => setThemeMode((current) => current === "dark" ? "day" : current === "day" ? "iman" : "dark")}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 border border-white/10"
            title={`Тема: ${themeMode === "day" ? "Дневная" : themeMode === "iman" ? "Iman Ver 1.0" : "Ночная"} — нажмите, чтобы сменить`}
          >
            {themeMode === "day" ? <Sun className="w-5 h-5" /> : themeMode === "iman" ? <Sparkles className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Mobile Nav Drawer */}
        {isMobileMenuOpen && (
          <div className="absolute inset-0 bg-black/80 z-50 flex flex-col p-4 lg:hidden">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-[#C5A059] uppercase">Навигация по роли</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Закрыть меню"
                className="flex h-11 w-11 items-center justify-center text-slate-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            {/* Current user identity (hidden in header on mobile) */}
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#C5A059] bg-[#161616] text-sm font-bold text-[#C5A059]">
                Д
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">дияс.рф</p>
                <p className="truncate text-[10px] uppercase tracking-tighter text-[#C5A059]">
                  {roles.find((r) => r.id === activeRole)?.badge || "Сотрудник"}
                </p>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id)}
                  className={`p-3 rounded-xl flex items-center space-x-3 text-sm font-bold ${
                    activeRole === r.id ? "bg-[#C5A059]/15 text-[#C5A059]" : "hover:bg-white/5"
                  }`}
                >
                  <r.icon className="w-5 h-5" />
                  <span>{r.name} ({r.badge})</span>
                </button>
              ))}
            </div>
            <div className="mt-8 border-t border-white/5 pt-4">
              <button
                onClick={handleResetData}
                className="w-full py-2 bg-[#8B0000]/20 text-[#FF4D4D] border border-[#8B0000]/45 rounded-xl text-xs font-bold"
              >
                Сбросить демо-данные
              </button>
            </div>
          </div>
        )}

        {/* Sidebar Nav */}
        {activeRole !== "chart" && activeRole !== "teacher" && activeRole !== "branch" && activeRole !== "owner" && activeRole !== "admin" && (
        <aside className="hidden lg:flex w-64 bg-[#0F0F0F] border-r border-white/5 flex-col flex-shrink-0">
          <div className="border-b border-white/5 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C5A059] text-black">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C5A059]">Кабинет ученика</p>
                <h2 className="text-lg font-black leading-tight text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>ЭХО ГОР</h2>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest pl-2 mb-2">
                Кабинеты и экраны
              </p>
              
              {/* Role specific navigation tabs */}
              <nav className="flex flex-col space-y-1">
                {(activeRole === "owner" || activeRole === "branch" || activeRole === "admin") && (
                  <>
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all ${
                        activeTab === "overview"
                          ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      <span>Дашборд сети</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("groups")}
                      className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all ${
                        activeTab === "groups"
                          ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Группы и Расписание</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("students")}
                      className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all ${
                        activeTab === "students"
                          ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>CRM Учеников</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("billing")}
                      className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all ${
                        activeTab === "billing"
                          ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>Абонементы и Финансы</span>
                    </button>
                  </>
                )}

                {activeRole === "teacher" && (
                  <>
                    <button
                      onClick={() => setActiveTab("teacher-board")}
                      className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all ${
                        activeTab === "teacher-board"
                          ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Посещаемость и группы</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("students")}
                      className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all ${
                        activeTab === "students"
                          ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Прогресс учеников</span>
                    </button>
                  </>
                )}

                {activeRole === "student" && (
                  <button
                    onClick={() => setActiveTab("artist-way")}
                    className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>Путь Артиста (ЛК)</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("announcements")}
                  className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all ${
                    activeTab === "announcements"
                      ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>Объявления и Новости</span>
                </button>

                {(activeRole === "owner" || activeRole === "branch") && (
                  <button
                    onClick={() => setActiveTab("logs")}
                    className={`px-4 py-2.5 rounded-xl flex items-center space-x-3 text-xs font-bold transition-all ${
                      activeTab === "logs"
                        ? "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Аудит действий</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Quick stats panel */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">
                Филиалы сети
              </span>
              <div className="mt-2 space-y-1.5 text-xs text-slate-300">
                {branches.map(b => (
                  <div key={b.id} className="flex items-center justify-between">
                    <span className="truncate pr-1">• {b.city}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{b.name.includes("Флагман") ? "Фл-н" : "Фил"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 pt-4 space-y-4">
            {/* Gamified level bottom card */}
            <div className="bg-gradient-to-br from-[#8B0000] to-[#510000] rounded-2xl p-4 shadow-xl border border-white/10">
              <p className="text-[9px] text-white/70 uppercase tracking-widest font-bold mb-1">
                Концепция: Путь Артиста
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-serif italic text-white">Легенда Школы</span>
                <span className="text-[9px] bg-[#C5A059] text-black font-extrabold px-1.5 py-0.5 rounded uppercase">
                  Ранг 7
                </span>
              </div>
              <div className="w-full bg-black/40 h-1 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-[#C5A059] h-full w-[85%]"></div>
              </div>
            </div>

            {/* Demo recovery */}
            <button
              onClick={handleResetData}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors rounded-xl text-[10px] font-bold uppercase tracking-wider"
            >
              Сбросить демо-данные
            </button>
          </div>
          <div className="border-t border-white/5 px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]" style={{ fontFamily: "'Oswald', sans-serif" }}>Культура · Сила · Характер</div>
            <div className="mt-1.5 text-xs leading-relaxed text-slate-400">Казахстан · обучаем от 5 лет</div>
          </div>
        </aside>
        )}

        {/* Main Workspace Area */}
        <main className={`flex-1 flex flex-col p-4 md:p-6 space-y-6 overflow-y-auto min-w-0 ${activeRole === 'teacher' || activeRole === 'branch' || activeRole === 'owner' || activeRole === 'admin' ? 'p-0 md:p-0 space-y-0' : ''}`}>
          <div className="fixed right-4 top-4 z-[80] hidden max-w-md rounded-2xl border border-white/10 bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 backdrop-blur-xl md:block">
            <span className={mvpDataMode === "supabase" ? "text-emerald-400" : "text-[#C5A059]"}>
              {mvpDataMode === "supabase" ? "Supabase DB" : "Mock fallback"}
            </span>
            {mvpDataError && <span className="ml-2 text-rose-300">• {mvpDataError.slice(0, 80)}</span>}
          </div>

          {activeRole === "chart" ? (
            <AnimatedBarChartShowcase />
          ) : activeRole === "teacher" ? (
             <TeacherWorkspace
               groups={groups}
               students={students}
               competitions={competitions}
               announcements={announcements}
               addAuditLog={addAuditLog}
               scheduleItems={scheduleItems}
               scheduleLoading={scheduleLoading}
               onLoadSchedule={loadSchedule}
               onToggleAttendance={toggleAttendance}
               homeworks={teacherHomework}
               onAddNote={addTeacherNote}
               onAssignHomework={assignHomework}
               onUpdateHomework={updateHomework}
               onBulkAttendance={bulkMarkAttendance}
               journal={journalApi}
               onJournalTask={handleJournalTask}
               branches={branches}
               teachers={teachers}
               onGenerateLessonPlan={generateLessonPlan}
               onGenerateStudentPlan={generateStudentDevPlan}
               onSubmitReaction={submitReaction}
               onLoadReactions={loadReactionSummary}
             />
          ) : activeRole === "branch" ? (
            <BranchManagerWorkspace
              branchId={branches[0]?.id || "branch-magas"}
              branches={branches}
              groups={groups}
              students={students}
              teachers={teachers}
              payments={payments}
              onOpenPayment={openPaymentForStudent}
              onSellSubscription={handleSellSubscription}
              subscriptionPlans={subscriptionPlans}
              announcements={announcements}
              competitions={competitions}
              halls={halls}
              scheduleItems={scheduleItems}
              scheduleLoading={scheduleLoading}
              onLoadSchedule={loadSchedule}
              onCreateGroup={handleCreateGroup}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              archivedGroups={archivedGroups}
              onRestoreGroup={handleRestoreGroup}
              onDeleteGroupPermanent={handleDeleteGroupPermanent}
              onCreateLesson={handleCreateLesson}
              onUpdateLesson={handleUpdateLesson}
              onDeleteLesson={handleDeleteLesson}
              onCreateStudent={handleCreateStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onArchiveStudent={handleArchiveStudent}
              onUnarchiveStudent={handleUnarchiveStudent}
              onEditArchive={handleEditArchive}
              onBookTrial={handleBookTrial}
              studentArchive={studentArchive}
              waitlist={waitlist}
              onAddToWaitlist={handleAddToWaitlist}
              onRemoveFromWaitlist={handleRemoveFromWaitlist}
              onCreateAnnouncement={handleCreateAnnouncement}
              onToggleAttendance={toggleAttendance}
              onBulkAttendance={bulkMarkAttendance}
              journal={journalApi}
              onJournalTask={handleJournalTask}
            />
          ) : activeRole === "owner" ? (
            <OwnerExecutiveWorkspace
              branches={branches}
              groups={groups}
              students={students}
              teachers={teachers}
              payments={payments}
              announcements={announcements}
              competitions={competitions}
              metrics={metricsSummary}
              onCreateBranch={handleCreateBranch}
              onUpdateBranch={handleUpdateBranch}
              onDeleteBranch={handleDeleteBranch}
              onCreateStudent={handleCreateStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onOpenPayment={openPaymentForStudent}
              onSellSubscription={handleSellSubscription}
              subscriptionPlans={subscriptionPlans}
              onCreatePlan={handleCreatePlan}
              onUpdatePlan={handleUpdatePlan}
              onDeletePlan={handleDeletePlan}
              leadSources={leadSources}
              waitlist={waitlist}
              onAddToWaitlist={handleAddToWaitlist}
              onRemoveFromWaitlist={handleRemoveFromWaitlist}
              onCreateLeadSource={handleCreateLeadSource}
              onUpdateLeadSource={handleUpdateLeadSource}
              onDeleteLeadSource={handleDeleteLeadSource}
              studentTrash={studentTrash}
              onRestoreStudent={handleRestoreStudent}
              onConfirmDeleteStudent={handleConfirmDeleteStudent}
              studentArchive={studentArchive}
              onArchiveStudent={handleArchiveStudent}
              onUnarchiveStudent={handleUnarchiveStudent}
              onEditArchive={handleEditArchive}
              onBookTrial={handleBookTrial}
              onCreateTeacher={handleCreateTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onCreateAnnouncement={handleCreateAnnouncement}
              onUpdateAnnouncement={handleUpdateAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onCreateCompetition={handleOwnerCreateCompetition}
              onUpdateCompetition={handleOwnerUpdateCompetition}
              onDeleteCompetition={handleOwnerDeleteCompetition}
              aiResult={aiResult}
              aiGenerating={aiGenerating}
              onTriggerAiReport={triggerAiReport}
              halls={halls}
              scheduleItems={scheduleItems}
              scheduleLoading={scheduleLoading}
              onLoadSchedule={loadSchedule}
              onCreateGroup={handleCreateGroup}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              archivedGroups={archivedGroups}
              onRestoreGroup={handleRestoreGroup}
              onDeleteGroupPermanent={handleDeleteGroupPermanent}
              onCreateHall={handleCreateHall}
              onUpdateHall={handleUpdateHall}
              onDeleteHall={handleDeleteHall}
              onCreateLesson={handleCreateLesson}
              onUpdateLesson={handleUpdateLesson}
              onDeleteLesson={handleDeleteLesson}
              onToggleAttendance={toggleAttendance}
              onBulkAttendance={bulkMarkAttendance}
              journal={journalApi}
              onJournalTask={handleJournalTask}
            />
          ) : activeRole === "admin" ? (
            <AdminEduErpWorkspace
              branches={branches}
              groups={groups}
              students={students}
              teachers={teachers}
              payments={payments}
              announcements={announcements}
              auditLogs={auditLogs}
              halls={halls}
              scheduleItems={scheduleItems}
              scheduleLoading={scheduleLoading}
              onLoadSchedule={loadSchedule}
              onCreateGroup={handleCreateGroup}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              archivedGroups={archivedGroups}
              onRestoreGroup={handleRestoreGroup}
              onDeleteGroupPermanent={handleDeleteGroupPermanent}
              onCreateLesson={handleCreateLesson}
              onUpdateLesson={handleUpdateLesson}
              onDeleteLesson={handleDeleteLesson}
              onToggleAttendance={toggleAttendance}
              onBulkAttendance={bulkMarkAttendance}
              journal={journalApi}
              onJournalTask={handleJournalTask}
              onCreateStudent={handleCreateStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onArchiveStudent={handleArchiveStudent}
              onUnarchiveStudent={handleUnarchiveStudent}
              onEditArchive={handleEditArchive}
              onBookTrial={handleBookTrial}
              studentArchive={studentArchive}
              onCreateAnnouncement={handleCreateAnnouncement}
              onOpenPayment={openPaymentForStudent}
              onSellSubscription={handleSellSubscription}
              tasks={adminTasks}
              subscriptionPlans={subscriptionPlans}
              leadSources={leadSources}
              waitlist={waitlist}
              onAddToWaitlist={handleAddToWaitlist}
              onRemoveFromWaitlist={handleRemoveFromWaitlist}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onCreatePlan={handleCreatePlan}
              onUpdatePlan={handleUpdatePlan}
              onDeletePlan={handleDeletePlan}
              onCreateLeadSource={handleCreateLeadSource}
              onUpdateLeadSource={handleUpdateLeadSource}
              onDeleteLeadSource={handleDeleteLeadSource}
            />
          ) : (
            <>
              {activeRole === "student" && (() => {
                const currentStudent = students.find((std) => std.id === selectedStudentId) || students[0];
                if (!currentStudent) return null;
                return (
                  <StudentArtistCabinet
                    student={currentStudent}
                    group={groups.find((group) => group.id === currentStudent.groupId)}
                    allStudents={students}
                    groups={groups}
                    branches={branches}
                    teachers={teachers}
                    accessLevel={studentAccessLevel ?? undefined}
                    readOnlyPreview={!studentAccessLevel}
                  />
                );
              })()}

              {/* Metric Bar (For Admin/Branch/Owner views) */}
              {(activeRole === "owner" || activeRole === "branch" || activeRole === "admin") && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
              <div className="bg-[#161616] p-4 md:p-5 rounded-3xl border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                  Общая база учеников
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {metricsSummary.activeStudentsTotal}
                  </span>
                </div>
              </div>
              
              <div className="bg-[#161616] p-4 md:p-5 rounded-3xl border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                  Выручка сети (Месяц)
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl md:text-3xl font-bold text-[#C5A059] tracking-tight">
                    {metricsSummary.thisMonthRevenue.toLocaleString()} ₸
                  </span>
                  <span className="text-xs text-green-400">Стабильно</span>
                </div>
              </div>

              <div className="bg-[#161616] p-4 md:p-5 rounded-3xl border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                  Средняя посещаемость
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {metricsSummary.overallAttendanceRate}%
                  </span>
                  <span className="text-xs text-sky-400">Норма</span>
                </div>
              </div>

              <div className="bg-[#161616] p-4 md:p-5 rounded-3xl border border-[#C5A059]/20 flex flex-col justify-between shadow-[0_0_15px_rgba(197,160,89,0.05)]">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                  Касса сегодня
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {metricsSummary.todayRevenue.toLocaleString()} ₸
                  </span>
                  <span className="text-xs text-[#C5A059]">Высокая</span>
                </div>
              </div>
            </div>
          )}


          {/* VIEW: NET-OVERVIEW / DASHBOARD (Owner / Admin) */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              
              {/* Existing Analytics Grid */}
              <div className="grid grid-cols-12 gap-6 items-start">
                
                {/* Branch performances and analytical hub */}
                <div className="col-span-12 xl:col-span-8 bg-[#161616] rounded-3xl border border-white/5 p-4 md:p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold">Эффективность филиалов сети</h2>
                      <p className="text-xs text-slate-500">Сравнительный мониторинг заполняемости залов и выручки</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => addAuditLog("Экспорт отчета", "Экспортирован Excel отчет посещаемости филиалов")}
                        className="px-3 py-1.5 bg-white/5 rounded-lg text-xs hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Экспорт CSV
                      </button>
                      <button
                        onClick={triggerAiReport}
                        className="px-3 py-1.5 bg-[#C5A059] text-black font-extrabold rounded-lg text-xs tracking-wide shadow-md transition-all uppercase"
                      >
                        Обновить AI
                      </button>
                    </div>
                  </div>

                  {/* Branches comparative List */}
                  <div className="space-y-3">
                    {metricsSummary.branchMetrics.map((bm) => (
                      <div key={bm.branchId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 gap-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 text-[#C5A059] flex items-center justify-center font-bold text-sm">
                            {bm.branchName.charAt(bm.branchName.lastIndexOf(" ") + 1) || "Ф"}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{bm.branchName}</p>
                            <p className="text-[10px] text-slate-500">
                              Код филиала: {bm.branchId}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-8 text-center justify-between sm:justify-end">
                          <div className="text-left sm:text-center">
                            <p className="text-sm font-bold text-white">{bm.studentsCount}</p>
                            <p className="text-[9px] text-slate-500 uppercase">Учеников</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-400">
                              {bm.revenue.toLocaleString()} ₸
                            </p>
                            <p className="text-[9px] text-slate-500 uppercase">Сбор кассы</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#C5A059]">{bm.attendanceRate}%</p>
                            <p className="text-[9px] text-slate-500 uppercase">Посещ.</p>
                          </div>

                          {/* Progress bars indicator */}
                          <div className="w-24 hidden sm:block">
                            <p className="text-[9px] text-right text-slate-400 mb-1">Загрузка залов {bm.capacityRate}%</p>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, bm.capacityRate)}%` }}
                                className="h-full bg-[#C5A059]"
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5">
                    <h3 className="text-sm font-bold text-[#C5A059] uppercase tracking-wide mb-3">Эффективность преподавателей</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {metricsSummary.teacherPerformance.map((tp) => (
                        <div key={tp.teacherId} className="p-4 bg-black/30 rounded-2xl border border-white/5 space-y-2">
                          <p className="text-xs font-bold text-white">{tp.teacherName}</p>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Учеников: {tp.studentsCount}</span>
                            <span className="text-emerald-400">Удержание: {tp.retentionRate}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div
                              style={{ width: `${tp.retentionRate}%` }}
                              className="bg-emerald-500 h-full"
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>


                {/* OWNER AI INSIGHTS SIDEBAR */}
                <div className="col-span-12 xl:col-span-4 space-y-6">
                  <div className="bg-[#161616] rounded-3xl border border-[#C5A059]/20 p-5 md:p-6 flex flex-col justify-between shadow-[0_10px_35px_rgba(197,160,89,0.04)]">
                    <div className="flex items-center space-x-2.5 mb-4">
                      <div className="w-8 h-8 bg-[#C5A059] rounded-full flex items-center justify-center text-black">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#C5A059]">
                          Google AI Аналитика
                        </h3>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold leading-none">
                          модель gemini-3.5-flash
                        </p>
                      </div>
                    </div>

                    {aiGenerating ? (
                      <div className="py-8 text-center space-y-3">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-[#C5A059] animate-spin mx-auto"></div>
                        <p className="text-xs text-slate-400">Анализ кавказской танцевальной сети в облачном секторе...</p>
                      </div>
                    ) : aiResult ? (
                      <div className="space-y-4">
                        {/* Summary text */}
                        <div className="p-3.5 bg-[#C5A059]/5 rounded-2xl border-l-4 border-[#C5A059]">
                          <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">Сводка AI советника</p>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{aiResult.executiveSummary}</p>
                        </div>

                        {/* Warnings or risks */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                            Выявленные риски удержания:
                          </p>
                          {aiResult.branchRisks.map((r, idx) => (
                            <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                                  <AlertTriangle className={`w-3.5 h-3.5 ${r.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
                                  <span>{r.riskTitle}</span>
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  r.severity === "high" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-500"
                                }`}>
                                  {r.severity === "high" ? "Критично" : "Средний"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-normal">{r.description}</p>
                            </div>
                          ))}
                        </div>

                        {/* Growth advice */}
                        <div className="space-y-1.5 pt-2">
                          <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                            Рекомендации по росту:
                          </p>
                          <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                            {aiResult.growthRecommendations.map((rec, idx) => (
                              <li key={idx} className="leading-snug">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        Нет данных аналитики. Нажмите 'Сгенерировать резюме'.
                      </div>
                    )}

                    <button
                      onClick={triggerAiReport}
                      className="mt-6 w-full py-2.5 bg-[#C5A059]/10 text-[#C5A059] rounded-xl text-xs font-bold border border-[#C5A059]/20 hover:bg-[#C5A059] hover:text-black transition-all uppercase tracking-wider"
                    >
                      Сгенерировать Бизнес-Инсайты
                    </button>
                  </div>
                </div>

              </div>

              {/* INTERACTIVE NETWORK BRANCHES MAP MODULE */}
              <div id="branches-interactive-map" className="bg-[#161616] rounded-3xl border border-white/5 p-4 md:p-6 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#C5A059]/5 blur-[120px] -mr-40 -mt-40 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <Map className="w-5 h-5 text-[#C5A059]" />
                      <span>География присутствия танцевальной сети</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Интерактивная карта филиалов ЭХО ГОР в Казахстане: Алматы, Астана и Шымкент
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 bg-black/40 p-1.5 rounded-xl border border-white/5 self-start md:self-auto">
                    {branches.map(b => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedMapBranchId(b.id);
                          addAuditLog("Интерактивная Карта", `Выбран филиал на карте: ${b.name}`);
                        }}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          selectedMapBranchId === b.id
                            ? "bg-[#C5A059] text-black shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {b.city}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Side: Stunning Vector SVG Map (Col span 7) */}
                  <div className="lg:col-span-7 bg-black/50 rounded-2xl border border-white/5 p-4 flex flex-col justify-between relative overflow-hidden min-h-[320px]">
                    
                    {/* SVG Map Backdrop representing the Kazakhstan branch network */}
                    <svg viewBox="0 0 500 300" className="w-full h-full max-h-[300px] select-none text-white/5 opacity-80" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="kazakhstanLakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
                        </linearGradient>
                        <linearGradient id="steppeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#141414" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#213021" stopOpacity="0.3" />
                        </linearGradient>
                      </defs>

                      {/* Stylized Kazakhstan map silhouette */}
                      <path d="M 55,90 L 115,55 L 190,62 L 255,38 L 345,55 L 430,82 L 465,135 L 438,198 L 360,235 L 250,226 L 160,250 L 78,218 L 35,155 Z" fill="url(#steppeGrad)" stroke="rgba(197,160,89,0.16)" strokeWidth="1.5" />
                      <path d="M 58,170 Q 115,142 180,155 T 300,135 T 430,155" fill="none" stroke="rgba(197,160,89,0.08)" strokeWidth="1" strokeDasharray="4 5" />
                      <path d="M 90,215 Q 165,190 250,205 T 420,180" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3 4" />

                      {/* Regional landmarks */}
                      <ellipse cx="78" cy="135" rx="38" ry="76" fill="url(#kazakhstanLakeGrad)" stroke="#1e3a5f" strokeWidth="1" strokeOpacity="0.25" />
                      <text x="35" y="77" fill="#3b82f6" fillOpacity="0.28" className="text-[9px] font-bold font-mono tracking-widest uppercase">Каспий</text>
                      <path d="M 255,286 L 300,215 L 352,286 Z" fill="rgba(197,160,89,0.08)" stroke="rgba(197,160,89,0.09)" />
                      <path d="M 305,286 L 380,210 L 452,286 Z" fill="rgba(197,160,89,0.06)" stroke="rgba(197,160,89,0.08)" />
                      <text x="260" y="270" fill="rgba(197,160,89,0.18)" className="text-[10px] font-mono tracking-widest uppercase">Заилийский Алатау</text>
                      <text x="214" y="119" fill="rgba(255,255,255,0.14)" className="text-[10px] font-mono tracking-widest uppercase">Казахстан</text>

                      {/* Network route: Astana -> Shymkent -> Almaty */}
                      <path
                        d="M 255,92 Q 215,145 205,205 T 310,235"
                        fill="none"
                        stroke="rgba(197,160,89,0.2)"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                        className="animate-pulse"
                      />

                      {/* Connection status markers */}
                      <text x="220" y="176" fill="rgba(255,255,255,0.15)" className="text-[8px] font-mono font-bold">Сеть филиалов ЭХО ГОР</text>

                      {/* Interactive branch pins */}
                      {[
                        { id: "branch-almaty", label: "Алматы", sub: "Флагман", x: 310, y: 235, color: "#C5A059" },
                        { id: "branch-astana", label: "Астана", sub: "Жулдыз", x: 255, y: 92, color: "#C5A059" },
                        { id: "branch-shymkent", label: "Шымкент", sub: "Орда", x: 205, y: 205, color: "#10B981" }
                      ].map(pin => {
                        const isSelected = selectedMapBranchId === pin.id;
                        return (
                          <g
                            key={pin.id}
                            onClick={() => {
                              setSelectedMapBranchId(pin.id);
                              addAuditLog("Интерактивная Карта", `Клик по пину на карте: ${pin.label}`);
                            }}
                            className="cursor-pointer group/pin"
                          >
                            {/* Pulse glowing effect for selected branch */}
                            {isSelected && (
                              <circle cx={pin.x} cy={pin.y} r="18" fill={pin.color} fillOpacity="0.12" className="animate-ping" />
                            )}
                            <circle cx={pin.x} cy={pin.y} r={isSelected ? "11" : "7"} fill="black" stroke={pin.color} strokeWidth={isSelected ? "3" : "1.5"} className="transition-all duration-300" />
                            <circle cx={pin.x} cy={pin.y} r="3" fill={pin.color} />

                            {/* Label box */}
                            <rect
                              x={pin.x - 45}
                              y={pin.y - 32}
                              width="90"
                              height="20"
                              rx="6"
                              fill="#141414"
                              stroke={isSelected ? pin.color : "rgba(255,255,255,0.1)"}
                              strokeWidth={isSelected ? "1.5" : "1"}
                              fillOpacity="0.95"
                              className="transition-all duration-300"
                            />
                            <text
                              x={pin.x}
                              y={pin.y - 19}
                              textAnchor="middle"
                              fill="white"
                              className="text-[9px] font-extrabold tracking-tight"
                            >
                              {pin.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Quick map status notes */}
                    <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black/60 px-2.5 py-1 rounded-lg border border-white/5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Данные филиалов ЭХО ГОР синхронизированы (100%)</span>
                    </div>
                  </div>

                  {/* Right Side: Rich Branch Info Card Panel (Col span 5) */}
                  <div className="lg:col-span-5 bg-white/5 rounded-2xl border border-white/5 p-5 flex flex-col justify-between space-y-5">
                    {(() => {
                      const b = branches.find(x => x.id === selectedMapBranchId);
                      if (!b) return null;

                      const branchStudents = students.filter(s => s.branchId === b.id).length;
                      const branchGroups = groups.filter(g => g.branchId === b.id);
                      const branchHalls = halls.filter(h => h.branchId === b.id);

                      return (
                        <div className="space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-4">
                            
                            {/* Title & Status */}
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-[10px] text-[#C5A059] font-extrabold uppercase tracking-widest">{b.city}</span>
                                <h3 className="text-base font-bold text-white leading-tight mt-0.5">{b.name}</h3>
                              </div>
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Активен
                              </span>
                            </div>

                            {/* Brief specifics lists */}
                            <div className="space-y-2.5 bg-black/40 p-4 rounded-xl border border-white/5 text-xs text-slate-300">
                              <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-medium">Адрес:</span>
                                <span className="text-white text-right font-semibold">{b.address}</span>
                              </div>
                              <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-medium">Руководитель:</span>
                                <span className="text-[#C5A059] font-bold">{b.managerName}</span>
                              </div>
                              <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-slate-500 font-medium">Контакты:</span>
                                <span className="text-white font-mono flex items-center gap-1">
                                   <Phone className="w-3 h-3 text-[#C5A059]" />
                                   {b.phone}
                                </span>
                              </div>
                              <div className="flex justify-between pt-1">
                                <span className="text-slate-500 font-medium">Количество залов:</span>
                                <span className="text-white font-bold">{b.hallsCount} {b.hallsCount === 3 ? "зала" : "зала"}</span>
                              </div>
                            </div>

                            {/* Branch statistics and counters Grid */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">Всего учеников</p>
                                <p className="text-lg font-black text-white mt-1 font-mono">{branchStudents} чел.</p>
                              </div>
                              <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">Развернуто групп</p>
                                <p className="text-lg font-black text-white mt-1 font-mono">{branchGroups.length} анс.</p>
                              </div>
                            </div>

                            {/* Dedicated Halls checklist badges */}
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">Танцевальные залы филиала:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {branchHalls.map(h => (
                                  <span key={h.id} className="text-[10px] px-2.5 py-1 rounded bg-white/5 border border-white/5 text-slate-300 font-semibold">
                                    🏢 {h.name} <span className="text-slate-500 text-[9px]">({h.capacity} мест)</span>
                                  </span>
                                ))}
                              </div>
                            </div>

                          </div>

                          {/* Quick Inter-tab link */}
                          <div className="pt-3 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab("groups");
                                // Automatically pre-select first group in this branch if available
                                if (branchGroups.length > 0) {
                                  setSelectedGroupId(branchGroups[0].id);
                                }
                                addAuditLog("Переход по карте", `Переход в расписание филиала ${b.name}`);
                              }}
                              className="w-full py-2.5 bg-[#C5A059]/10 hover:bg-[#C5A059] text-[#C5A059] hover:text-black font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                            >
                              <span>Посмотреть группы в расписании ({branchGroups.length})</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>

              {/* BRAND NEW MODULE: COMPETITION & ENSEMBLE PLANNING CALENDAR */}
              <div id="competitions-calendar" className="bg-[#141414] rounded-3xl border border-white/5 p-4 md:p-6 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                
                {/* Header of section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-12 h-12 bg-[#C5A059]/10 rounded-2xl flex items-center justify-center text-[#C5A059] border border-[#C5A059]/30 shadow-[0_4px_12px_rgba(197,160,89,0.1)] flex-shrink-0">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base font-bold text-white uppercase tracking-wide">
                          Календарь смотров и планирования ансамблей
                        </h2>
                        <span className="hidden sm:inline bg-[#8B0000]/20 text-[#FF4D4D] border border-[#8B0000]/40 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Сетка 2026
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-snug">
                        Следите за планом региональных и республиканских конкурсов сети. Заявляйте ансамбли и составляйте репетиционный график.
                      </p>
                    </div>
                  </div>
                  
                  {/* Action button in owner panel */}
                  {activeRole === "owner" && (
                    <button
                      onClick={() => setShowAddCompModal(true)}
                      className="px-4 py-2 bg-[#C5A059] hover:bg-[#b08e4d] text-black font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Запланировать смотр</span>
                    </button>
                  )}
                </div>

                {/* Filters and Search Bar Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 gap-3">
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
                    <button
                      onClick={() => setCompScopeFilter("all")}
                      className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        compScopeFilter === "all"
                          ? "bg-[#C5A059] text-black shadow-md font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Масштаб: Все
                    </button>
                    <button
                      onClick={() => setCompScopeFilter("kazakhstan")}
                      className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        compScopeFilter === "kazakhstan"
                          ? "bg-[#C5A059] text-black shadow-md font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Казахстан
                    </button>
                    <button
                      onClick={() => setCompScopeFilter("cis")}
                      className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        compScopeFilter === "cis"
                          ? "bg-[#C5A059] text-black shadow-md font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      СНГ
                    </button>
                  </div>

                  {/* Search input field */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Поиск по событию, городу, залу..."
                      value={compSearchQuery}
                      onChange={(e) => setCompSearchQuery(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#C5A059] text-white"
                    />
                  </div>
                </div>

                {/* Main Splits Panel Block */}
                <div className="grid grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT: Live Contests List (Col span 7) */}
                  <div className="col-span-12 lg:col-span-7 space-y-3 max-h-[580px] overflow-y-auto pr-2 custom-scrollbar">
                    {competitions
                      .filter(c => {
                        const matchesScope = compScopeFilter === "all" || c.scope === compScopeFilter;
                        const matchesSearch = c.title.toLowerCase().includes(compSearchQuery.toLowerCase()) || 
                                              c.location.toLowerCase().includes(compSearchQuery.toLowerCase());
                        return matchesScope && matchesSearch;
                      })
                      .map((comp) => {
                        const isSelected = selectedCompId === comp.id;
                        const dateObj = new Date(comp.date);
                        const day = dateObj.getDate() || "—";
                        const monthsRu = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];
                        const month = monthsRu[dateObj.getMonth()] || "—";

                        return (
                          <div
                            key={comp.id}
                            onClick={() => {
                              setSelectedCompId(comp.id);
                              setAiCompAdviceResult(null); // Reset advice for selected competition
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                              isSelected
                                ? "bg-[#C5A059]/10 border-[#C5A059] shadow-[0_0_20px_rgba(197,160,89,0.15)] md:translate-x-1"
                                : "bg-black/35 border-white/5 hover:border-white/10 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center space-x-4 min-w-0">
                              {/* Date Block Design */}
                              <div className="w-12 h-14 bg-black/60 rounded-xl flex flex-col items-center justify-center border border-white/10 flex-shrink-0 shadow-inner">
                                <span className="text-[#C5A059] text-base font-extrabold font-mono tracking-tighter leading-none">{day}</span>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{month}</span>
                              </div>

                              {/* Text description */}
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {comp.scope === "kazakhstan" ? (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 flex items-center">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                                      Казахстан
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono tracking-wider bg-blue-950/40 text-blue-400 border border-blue-900/40 flex items-center">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1"></span>
                                      СНГ
                                    </span>
                                  )}
                                  
                                  {/* Status badges */}
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-widest ${
                                    comp.status === "rehearsals"
                                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  }`}>
                                    {comp.status === "rehearsals" ? "ПОДГОТОВКА" : "РЕГИСТРАЦИЯ"}
                                  </span>
                                </div>
                                <h3 className="text-xs md:text-sm font-bold text-white truncate leading-tight pr-2">
                                  {comp.title}
                                </h3>
                                <p className="text-[11px] text-slate-400 flex items-center pr-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500 flex-shrink-0" />
                                  <span>{comp.location}</span>
                                </p>
                              </div>
                            </div>

                            {/* Ensembles Count display */}
                            <div className="text-right flex-shrink-0">
                              <span className="text-amber-400 font-mono text-xs font-bold block">
                                {comp.registeredGroupIds.length} анс.
                              </span>
                              <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest leading-normal">
                                заявлено
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    {competitions.length === 0 && (
                      <div className="p-8 text-center bg-black/10 rounded-2xl">
                        <p className="text-xs text-slate-500">События не найдены по заданным критериям фильтрации.</p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Active selected competition planner details (Col span 5) */}
                  <div className="col-span-12 lg:col-span-5">
                    {(() => {
                      const selComp = competitions.find(c => c.id === selectedCompId);
                      if (!selComp) {
                        return (
                          <div className="p-6 bg-black/40 rounded-2xl border border-white/5 text-center text-slate-500 text-xs">
                            Пожалуйста, выберите конкурс из списка слева для просмотра графика репетиций и заявок.
                          </div>
                        );
                      }

                      return (
                        <div className="bg-[#181818] rounded-2xl border border-white/10 p-4 md:p-5 space-y-5 shadow-lg">
                          
                          {/* Selected Competition Header */}
                          <div className="border-b border-white/5 pb-3">
                            <span className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded font-extrabold uppercase tracking-widest border border-[#C5A059]/20">
                              {selComp.scope === "kazakhstan" ? "Национальный (РК)" : "Межгосударственный (СНГ)"} уровень
                            </span>
                            <h3 className="text-sm md:text-base font-bold text-white mt-1.5 leading-snug">{selComp.title}</h3>
                            <div className="mt-2.5 space-y-1.5 text-slate-400 text-xs">
                              <p className="flex items-center">
                                <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-slate-500 flex-shrink-0" />
                                <span>Дата смотра: <strong className="text-slate-200">{selComp.date}</strong></span>
                              </p>
                              <p className="flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-500 flex-shrink-0" />
                                <span className="truncate">Место проведения: <strong className="text-slate-200">{selComp.location}</strong></span>
                              </p>
                            </div>
                          </div>

                          {/* Prize info */}
                          {selComp.prizePool && (
                            <div className="p-3 bg-gradient-to-r from-[#C5A059]/5 to-transparent rounded-xl border-l-4 border-[#C5A059] flex items-center space-x-3">
                              <Award className="w-4.5 h-4.5 text-[#C5A059] flex-shrink-0" />
                              <div>
                                <p className="text-[9px] text-[#C5A059] uppercase font-extrabold tracking-widest leading-none">Награда и фонд</p>
                                <p className="text-xs text-white font-medium mt-0.5">{selComp.prizePool}</p>
                              </div>
                            </div>
                          )}

                          {/* PART 1: REGISTERED ENSEMBLES & REHEARSALS PLANNER */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-extrabold text-[#C5A059] uppercase tracking-wider flex items-center justify-between">
                              <span>Заявленные ансамбли сети</span>
                              <span className="text-[10px] text-slate-500 font-mono">({selComp.registeredGroupIds.length})</span>
                            </h4>

                            {selComp.registeredGroupIds.length === 0 ? (
                              <div className="p-4 rounded-xl border border-dashed border-white/5 text-center bg-black/20">
                                <p className="text-[11px] text-slate-500 leading-normal">На этот конкурс пока не заявлен ни один ансамбль нашей школы.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {selComp.registeredGroupIds.map(gId => {
                                  const grp = groups.find(g => g.id === gId);
                                  const rSlots = selComp.rehearsalSlots?.[gId] || [];

                                  return (
                                    <div key={gId} className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-xs font-bold text-white flex items-center gap-2">
                                            <span 
                                              className={`w-2 h-2 rounded-full inline-block ${
                                                grp && grp.studentCount >= 4 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                              }`}
                                              title={grp && grp.studentCount >= 4 ? 'Группа набрана' : 'Группа не доукомплектована'}
                                            />
                                            {grp?.name || "Ансамбль"}
                                          </p>
                                          <p className="text-[10px] text-[#C5A059] uppercase tracking-tighter leading-none mt-1.5 font-mono flex items-center gap-2">
                                            <span>{grp?.level} | {grp?.studentCount} джигитов</span>
                                            <span className={`text-[8px] px-1.5 py-0.2 rounded font-black tracking-widest ${
                                              grp && grp.studentCount >= 4 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                            }`}>
                                              {grp && grp.studentCount >= 4 ? 'НАБРАНА' : 'НЕ ДОУКОМПЛЕКТОВАНА'}
                                            </span>
                                          </p>
                                        </div>
                                        
                                        {/* Unregister btn in owner dashboard */}
                                        {activeRole === "owner" && (
                                          <button
                                            onClick={() => handleUnregisterGroupFromComp(selComp.id, gId)}
                                            className="p-1 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/25"
                                            title="Отозвать заявку"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                      {/* Rehearsal Scheduled times */}
                                      <div className="space-y-2 border-t border-white/5 pt-2">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                                          Выделенное репетиционное время:
                                        </p>
                                        
                                        {rSlots.length === 0 ? (
                                          <p className="text-[10px] italic text-slate-500 p-1 bg-white/5 rounded">Репетиционные часы не распределены.</p>
                                        ) : (
                                          <div className="space-y-1">
                                            {rSlots.map((slot, sIdx) => (
                                              <div key={sIdx} className="flex items-center justify-between py-1 px-2.5 bg-white/5 rounded-lg border border-white/5 text-[10px] font-mono text-slate-300">
                                                <span className="truncate">{slot}</span>
                                                {activeRole === "owner" && (
                                                  <button
                                                    onClick={() => handleDeleteRehearsalSlot(selComp.id, gId, sIdx)}
                                                    className="p-0.5 text-slate-500 hover:text-red-400 transition-colors ml-1.5"
                                                    title="Удалить слот"
                                                  >
                                                    <XCircle className="w-3 h-3" />
                                                  </button>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Dynamic Rehearsal Slot Form Inputs inside card */}
                                        {activeRole === "owner" && (
                                          <div className="pt-2.5 flex flex-col gap-2 bg-black/40 p-2.5 rounded-lg border border-white/5">
                                            <p className="text-[9px] text-amber-500/90 font-bold uppercase tracking-widest leading-none">
                                              Бронирование залов (Добавить репитицию):
                                            </p>
                                            <div className="grid grid-cols-3 gap-1.5">
                                              <select
                                                value={newRehearsalDay}
                                                onChange={(e) => setNewRehearsalDay(e.target.value)}
                                                className="bg-black text-[10px] rounded p-1 border border-white/10 text-slate-200 focus:outline-none"
                                              >
                                                <option value="Пн">Пн</option>
                                                <option value="Вт">Вт</option>
                                                <option value="Ср">Ср</option>
                                                <option value="Чт">Чт</option>
                                                <option value="Пт">Пт</option>
                                                <option value="Сб">Сб</option>
                                                <option value="Вс">Вс</option>
                                              </select>

                                              <select
                                                value={newRehearsalHall}
                                                onChange={(e) => setNewRehearsalHall(e.target.value)}
                                                className="bg-black text-[10px] rounded p-1 border border-white/10 text-slate-200 focus:outline-none truncate"
                                              >
                                                {halls.map(h => (
                                                  <option key={h.id} value={h.name}>{h.name}</option>
                                                ))}
                                              </select>

                                              <input
                                                type="text"
                                                placeholder="Время"
                                                value={newRehearsalTime}
                                                onChange={(e) => setNewRehearsalTime(e.target.value)}
                                                className="bg-black text-[10px] rounded p-1 border border-white/10 text-slate-200 focus:outline-none text-center font-mono"
                                              />
                                            </div>

                                            <button
                                              onClick={() => handleAddRehearsalSlot(selComp.id, gId)}
                                              className="w-full py-1 bg-[#C5A059]/10 hover:bg-[#C5A059] text-[#C5A059] hover:text-black border border-[#C5A059]/20 font-bold rounded text-[9px] uppercase tracking-wider transition-all"
                                            >
                                              Добавить бронь
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* PART 2: REGISTER GROUP FORM DROPDOWN */}
                          {activeRole === "owner" && (
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                              <p className="text-xs font-bold text-white uppercase tracking-wider leading-none">
                                Заявить коллектив на данный смотр
                              </p>
                              
                              <div className="flex space-x-2">
                                <select
                                  id="select-group-for-comp"
                                  className="flex-1 bg-black border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#C5A059]"
                                  defaultValue=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      handleRegisterGroupForComp(selComp.id, val);
                                      // Reset select element index
                                      e.target.value = "";
                                    }
                                  }}
                                >
                                  <option value="" disabled>-- Выберите ансамбль --</option>
                                  {groups
                                    .filter(g => !selComp.registeredGroupIds.includes(g.id))
                                    .map(g => (
                                      <option key={g.id} value={g.id}>
                                        {g.name} ({g.level})
                                      </option>
                                    ))
                                  }
                                </select>
                              </div>
                            </div>
                          )}

                          {/* PART 3: GEMINI AI ADVISOR COMPREHENSIVE PLAN */}
                          <div className="border-t border-white/5 pt-4">
                            <h4 className="text-xs font-extrabold text-[#C5A059] uppercase tracking-wider flex items-center mb-2">
                              <Sparkles className="w-4 h-4 mr-1.5" />
                              <span>AI Подготовка ансамбля от Устаза</span>
                            </h4>

                            {selComp.registeredGroupIds.length === 0 ? (
                              <p className="text-[10px] text-slate-500 italic">Зарегистрируйте коллектив школы, чтобы составить программу репетиций.</p>
                            ) : (
                              <div className="space-y-3">
                                <button
                                  onClick={() => handleGenerateCompAdvice(selComp)}
                                  disabled={aiCompAdviceGenerating}
                                  className="w-full py-2 bg-gradient-to-r from-[#C5A059]/20 to-[#C5A059]/5 hover:from-[#C5A059]/35 hover:to-[#C5A059]/10 text-[#C5A059] font-bold text-[11px] uppercase tracking-widest border border-[#C5A059]/30 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                                >
                                  {aiCompAdviceGenerating ? (
                                    <>
                                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#C5A059] border-t-transparent animate-spin"></div>
                                      <span>Генерация Сценического Плана...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                      <span>Спросить AI План Репетиций</span>
                                    </>
                                  )}
                                </button>

                                {/* AI response layout output if exists */}
                                {aiCompAdviceResult && (
                                  <div className="p-3 bg-[#C5A059]/5 border-l-4 border-[#C5A059] rounded-r-xl text-xs space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-[#C5A059]/20 pb-1">
                                      <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">Анализ Готовности:</span>
                                      <span className="text-xs font-extrabold text-white">{aiCompAdviceResult.readinessRating}</span>
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <p className="text-[10px] uppercase font-bold text-slate-400">Календарный план тренинга:</p>
                                      <p className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed">{aiCompAdviceResult.rehearsalPlan}</p>
                                    </div>

                                    <div className="space-y-1 border-t border-[#C5A059]/15 pt-2">
                                      <p className="text-[10px] uppercase font-bold text-[#C5A059]">Сценическая Этика & Костюм:</p>
                                      <p className="text-[11px] text-slate-300 italic leading-relaxed">{aiCompAdviceResult.stageCraftAdvice}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })()}
                  </div>

                </div>

              </div>

              {/* MODAL: ADD NEW COMPETITION (PLANNING BOARD) */}
              {showAddCompModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <div className="bg-[#121212] rounded-3xl border border-white/10 p-5 md:p-6 max-w-lg w-full space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
                    
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center space-x-2">
                        <Award className="w-5 h-5 text-[#C5A059]" />
                        <h3 className="text-base font-bold text-white uppercase tracking-wide">
                          Запланировать новый смотр / концерт
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowAddCompModal(false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>

                    <form onSubmit={handleAddCompetition} className="space-y-4 text-xs">
                      {/* Title */}
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase block text-[10px]">Название события / конкурса</label>
                        <input
                          type="text"
                          required
                          placeholder="например, Республиканский смотр-конкурс 'Торжество Симда'"
                          value={newCompTitle}
                          onChange={(e) => setNewCompTitle(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#C5A059] text-white"
                        />
                      </div>

                      {/* Scale / Level */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-slate-400 font-bold uppercase block text-[10px]">Регион проведения</label>
                          <select
                            value={newCompScope}
                            onChange={(e) => setNewCompScope(e.target.value as "kazakhstan" | "cis")}
                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C5A059] text-white"
                          >
                            <option value="kazakhstan">🇰🇿 Казахстан</option>
                            <option value="cis">🌍 СНГ</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-slate-400 font-bold uppercase block text-[10px]">Дата проведения</label>
                          <input
                            type="date"
                            required
                            value={newCompDate}
                            onChange={(e) => setNewCompDate(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-[#C5A059] text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Location */}
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase block text-[10px]">Место проведения (Город, ДК / Зал)</label>
                        <input
                          type="text"
                          required
                          placeholder="например, Грозный, Государственный концертный зал"
                          value={newCompLocation}
                          onChange={(e) => setNewCompLocation(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#C5A059] text-white"
                        />
                      </div>

                      {/* Prize description */}
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase block text-[10px]">Призовой фонд и кубки</label>
                        <input
                          type="text"
                          placeholder="например, Кубок Главы Вайнахов + Гран-При 150,000 ₸"
                          value={newCompPrize}
                          onChange={(e) => setNewCompPrize(e.target.value)}
                          className="w-full bg-black/40 border border-[#2d2d2d] focus:border-[#C5A059] rounded-xl px-3.5 py-2.5 focus:outline-none text-white"
                        />
                      </div>

                      {/* Pre-register ensemble */}
                      <div className="space-y-1">
                        <label className="text-slate-400 font-bold uppercase block text-[10px]">Заявить коллектив (Изначально)</label>
                        <select
                          value={newCompPreselGroup}
                          onChange={(e) => setNewCompPreselGroup(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C5A059] text-white"
                        >
                          <option value="">-- Без заявки (пустой смотр) --</option>
                          {groups.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.level})</option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-2 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowAddCompModal(false)}
                          className="px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-colors text-slate-400 hover:text-white"
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#b08e4d] text-black font-extrabold rounded-xl uppercase text-[10px] tracking-widest transition-colors shadow-lg"
                        >
                          Запланировать
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}


          {/* VIEW: GROUPS & SCHEDULING (Branches list with halls and timetables) */}
          {activeTab === "groups" && (
            <div className="bg-[#161616] rounded-3xl border border-white/5 p-4 md:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Расписание и управление залами</h2>
                  <p className="text-xs text-slate-500">
                    Управляйте танцевальными группами во всех филиалах сети
                  </p>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-black/40 border border-white/10 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="">Все филиалы</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group Schedule Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {groups
                  .filter((g) => !selectedBranchId || g.branchId === selectedBranchId)
                  .map((g) => {
                    const hall = halls.find((h) => h.id === g.hallId);
                    const teacher = teachers.find((t) => t.id === g.teacherId);
                    const branchOfGroup = branches.find((b) => b.id === g.branchId);

                    return (
                      <div
                        key={g.id}
                        className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/10 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/40 transition-all duration-300 space-y-4"
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] bg-[#C5A059]/20 text-[#C5A059] px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                              {g.level} | {g.ageGroup}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                              ID: {g.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                              <span 
                                className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${
                                  g.studentCount >= 4 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                }`}
                                title={g.studentCount >= 4 ? 'Группа набрана' : 'Группа не доукомплектована'}
                              />
                              {g.name}
                            </h3>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              g.studentCount >= 4 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {g.studentCount >= 4 ? 'набрана' : 'не доукомплектована'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#C5A059] flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {g.scheduleText}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-white/5 py-3">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase">Локация / Зал</p>
                            <p className="font-semibold text-slate-300 truncate">
                              {hall?.name || "Основной зал"}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {branchOfGroup?.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase">Преподаватель</p>
                            <p className="font-semibold text-slate-300 truncate">
                              {teacher?.name || "Аслан Плиев"}
                            </p>
                            <p className="text-[10px] text-slate-500">Заслуженный артист</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-slate-400">
                            Учеников в группе:{" "}
                            <strong className="text-white font-bold">{g.studentCount} чел.</strong>
                          </span>
                          
                          <button
                            onClick={() => {
                              setSelectedGroupId(g.id);
                              setActiveTab("teacher-board");
                              addAuditLog(
                                "Переход к посещаемости",
                                `Вход в журнал группы ${g.name}`
                              );
                            }}
                            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#C5A059] hover:text-white transition-all rounded-lg flex items-center space-x-1"
                          >
                            <span>Открыть журнал</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Halls Capacities overview */}
              <div className="border-t border-white/5 pt-6 space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Залы в сети</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {halls.map((h) => {
                    const br = branches.find((b) => b.id === h.branchId);
                    return (
                      <div key={h.id} className="p-4 bg-black/30 rounded-2xl border border-white/5">
                        <p className="text-xs font-bold text-white">{h.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{br?.city}</p>
                        <p className="text-[10px] text-slate-400 mt-2">Резервная емкость: {h.capacity} артистов</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}


          {/* VIEW: STUDENTS CRM */}
          {activeTab === "students" && (
            <div className="grid grid-cols-12 gap-6 items-start">
              
              {/* Summary Chart Card */}
              <div className="col-span-12 bg-[#161616] rounded-3xl border border-white/5 p-6 animate-fade-in mb-2 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059]/5 blur-[100px] -mr-32 -mt-32"></div>
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-[#C5A059]" />
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          {pieBranchFilter === "all" ? "Распределение учеников" : `Группы: ${branches.find(b => b.id === pieBranchFilter)?.name || ""}`}
                        </h2>
                      </div>
                      
                      {/* Branch Filter Dropdown */}
                      <div className="relative group">
                        <select
                          value={pieBranchFilter}
                          onChange={(e) => setPieBranchFilter(e.target.value)}
                          className="appearance-none bg-black/40 border border-white/10 rounded-xl px-4 py-2 pr-10 text-[10px] font-bold uppercase tracking-wider text-[#C5A059] focus:outline-none focus:border-[#C5A059]/50 transition-all cursor-pointer"
                        >
                          <option value="all">Все филиалы</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <Layers className="w-3 h-3 text-slate-500" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-md font-sans">
                      {pieBranchFilter === "all" 
                        ? "Количественный анализ состава танцевальной сети: распределение активного потока учеников по функционирующим залам и филиалам."
                        : `Детальный разбор активного состава учеников по группам внутри выбранного филиала. Всего групп с активными учениками: ${pieChartData.length}.`}
                    </p>
                    <div className="flex gap-6 pt-4">
                      <div className="bg-black/40 p-3 px-5 rounded-2xl border border-white/10">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">
                          {pieBranchFilter === "all" ? "Всего в сети" : "Всего в филиале"}
                        </p>
                        <p className="text-2xl font-black text-[#C5A059]">{pieChartTotal}</p>
                      </div>
                      <div className="bg-black/40 p-3 px-5 rounded-2xl border border-white/10">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">
                          {pieBranchFilter === "all" ? "Занятость залов" : "Средняя группа"}
                        </p>
                        <p className="text-2xl font-black text-white">
                          {pieBranchFilter === "all" 
                            ? branches.filter(b => students.some(s => s.branchId === b.id)).length 
                            : Math.round(pieChartTotal / (pieChartData.length || 1))}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-[400px] h-[240px] bg-black/40 rounded-2xl border border-white/5 p-4 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="40%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieChartData.map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={["#C5A059", "#9C784D", "#D4AF37", "#8B4513", "#510000", "#1A1A1A"][index % 6]} 
                              className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-[#161616] border border-white/10 p-3 rounded-2xl shadow-2xl">
                                  <p className="text-[10px] text-slate-500 uppercase font-black mb-1">{pieBranchFilter === 'all' ? 'Филиал' : 'Группа'}</p>
                                  <p className="text-xs font-bold text-white mb-1.5">{data.fullName}</p>
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"></div>
                                    <p className="text-sm font-black text-[#C5A059]">{data.value} <span className="text-[10px] font-bold text-slate-400">артистов</span></p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                           verticalAlign="middle" 
                           align="right" 
                           layout="vertical"
                           iconType="circle"
                           iconSize={8}
                           formatter={(value) => <span className="text-[10px] text-slate-400 font-bold uppercase ml-2 tracking-tighter">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-[130px] md:pr-[150px]">
                       <div className="text-center">
                          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Артисты</p>
                          <p className="text-lg font-black text-white">{pieChartTotal}</p>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Compact Branch Statistics Table */}
                <div className="mt-8 border-t border-white/5 pt-6 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <LayoutGrid className="w-3.5 h-3.5 text-[#C5A059]" />
                       Детализация по филиалам
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">Обновлено: в реальном времени</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold border-b border-white/5">
                          <th className="pb-3 px-2">Филиал</th>
                          <th className="pb-3 px-2">Активных учеников</th>
                          <th className="pb-3 px-2">Количество групп</th>
                          <th className="pb-3 px-2 text-right">Загруженность залов</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branches.map((b) => {
                          const branchStudents = students.filter(s => s.branchId === b.id).length;
                          const branchGroups = groups.filter(g => g.branchId === b.id).length;
                          // Simulated occupancy calculation (nominal capacity 60)
                          const occupancy = Math.min(Math.round((branchStudents / 60) * 100), 100);
                          
                          if (branchStudents === 0 && branchGroups === 0) return null;

                          return (
                            <tr key={b.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                              <td className="py-4 px-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-[#C5A059] shadow-[0_0_8px_rgba(197,160,89,0.4)]"></div>
                                  <span className="text-sm font-bold text-white group-hover:text-[#C5A059] transition-colors">{b.name}</span>
                                </div>
                              </td>
                              <td className="py-4 px-2">
                                <div className="flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="text-sm font-mono font-bold text-slate-200">{branchStudents}</span>
                                </div>
                              </td>
                              <td className="py-4 px-2">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="text-sm font-mono font-bold text-slate-300">{branchGroups}</span>
                                </div>
                              </td>
                              <td className="py-4 px-2 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                    <div 
                                      className="h-full bg-gradient-to-r from-[#C5A059] to-amber-600 transition-all duration-1000" 
                                      style={{ width: `${occupancy}%` }}
                                    ></div>
                                  </div>
                                  <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded ${
                                    occupancy > 80 ? 'text-red-400 bg-red-400/10' : 'text-emerald-400 bg-emerald-400/10'
                                  }`}>
                                    {occupancy}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Left Column: List select */}
              <div className="col-span-12 lg:col-span-4 bg-[#161616] rounded-3xl border border-white/5 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Список учеников</h2>
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="p-1 text-[#C5A059] hover:text-white flex items-center space-x-1 text-xs font-bold uppercase transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Новый</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Поиск по ФИО, родителю..."
                    value={crmSearchQuery}
                    onChange={(e) => setCrmSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                {/* Filter branch select */}
                <div className="flex space-x-2">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="">Все филиалы</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.city} ({b.name.split(" ")[1] || "Танцы"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* List Container */}
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((stud) => {
                      const isSelected = selectedStudentId === stud.id;
                      const hasDebt = stud.balance < 0;
                      return (
                        <button
                          key={stud.id}
                          onClick={() => {
                            setSelectedStudentId(stud.id);
                            // Clear analysis state for new student switch
                          }}
                          className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all border ${
                            isSelected
                              ? "bg-[#C5A059]/10 border-[#C5A059]/35"
                              : "bg-[#0A0A0A]/40 border-transparent hover:border-white/5"
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <img
                              src={stud.photoUrl}
                              alt={stud.name}
                              className="w-8 h-8 rounded-full border border-white/10 object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{stud.name}</p>
                              <p className="text-[9px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap">
                                <span>{stud.artistLevel}</span>
                                {(stud.paymentStatus === "В ожидании оплаты" || stud.balance < 0) && (
                                  <span className="text-[7.5px] px-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded font-black tracking-normal leading-none my-0.5 uppercase">
                                    ОЖИДАЕТ ОПЛАТУ
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              hasDebt ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}>
                              {stud.balance.toLocaleString()} ₸
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs text-sans">
                      Ученики не найдены
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Detailed CRM Profile Card */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                {(() => {
                  const stud = students.find((s) => s.id === selectedStudentId);
                  if (!stud) {
                    return (
                      <div className="bg-[#161616] rounded-3xl border border-white/5 p-8 text-center text-slate-500 text-xs">
                        Выберите ученика из списка слева, чтобы открыть подробную CRM-карточку.
                      </div>
                    );
                  }

                  const activeSub = stud.subscriptions[0];
                  const associatedGroup = groups.find(g => g.id === stud.groupId);

                  return (
                    <div className="bg-[#161616] rounded-3xl border border-white/5 p-4 md:p-6 space-y-6">
                      
                      {/* Top profile banner with picture */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                        <div className="flex items-center space-x-4">
                          <img
                            src={stud.photoUrl}
                            alt={stud.name}
                            className="w-16 h-16 rounded-full border-2 border-[#C5A059] object-cover flex-shrink-0"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h2 className="text-lg font-bold text-white">{stud.name}</h2>
                              <span className="text-xs text-slate-500">({stud.age} лет)</span>
                            </div>
                            <p className="text-xs text-[#C5A059] font-serif italic mt-0.5">
                              Уровень: {stud.artistLevel}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                              Родитель: {stud.parentName} ({stud.parentPhone})
                            </p>
                          </div>
                        </div>

                        {/* Interactive simulation actions inside profile */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => addLevelPoint(stud.id)}
                            className="px-3 py-1.5 bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 hover:bg-[#C5A059] hover:text-black rounded-xl text-xs font-bold transition-all uppercase"
                          >
                            +45 Очков Артисту
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBranchId(stud.branchId);
                              setShowAddPaymentModal(true);
                            }}
                            className="px-3 py-1.5 bg-[#8B0000]/10 hover:bg-[#8B0000]/20 text-[#FF4D4D] border border-[#8B0000]/30 rounded-xl text-xs font-bold transition-all uppercase"
                          >
                            Пополнить Баланс
                          </button>
                        </div>
                      </div>

                      {/* Уведомление об успешной быстрой отправке сообщения */}
                      {successNotifText && (
                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 font-medium flex items-center justify-between animate-shake">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{successNotifText}</span>
                          </div>
                          <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">ОПОВЕЩЕНО</span>
                        </div>
                      )}

                      {/* Статус оплаты и быстрая рассылка родителям в 1 клик */}
                      <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1 w-full md:w-auto">
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block">Категория Оплаты</span>
                          <div className="flex items-center space-x-2.5">
                            {/* Селектор статуса */}
                            <select
                              value={stud.paymentStatus || (stud.balance < 0 ? "В ожидании оплаты" : "Оплачено")}
                              onChange={(e) => handleTogglePaymentStatus(stud.id, e.target.value)}
                              className={`bg-black/40 border text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none transition-all cursor-pointer ${
                                (stud.paymentStatus || (stud.balance < 0 ? "В ожидании оплаты" : "Оплачено")) === "В ожидании оплаты"
                                  ? "border-amber-500/40 text-amber-500 bg-amber-500/5 focus:border-amber-500"
                                  : "border-emerald-500/40 text-emerald-400 bg-emerald-500/5 focus:border-emerald-500"
                              }`}
                            >
                              <option value="Оплачено" className="bg-[#121212] text-emerald-400">✅ Оплачено</option>
                              <option value="В ожидании оплаты" className="bg-[#121212] text-amber-500">⏳ В ожидании оплаты</option>
                            </select>

                            {/* Красивый пульсирующий маячок */}
                            <span className="flex h-2.5 w-2.5 relative">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${
                                (stud.paymentStatus || (stud.balance < 0 ? "В ожидании оплаты" : "Оплачено")) === "В ожидании оплаты" ? "bg-amber-400" : "bg-emerald-400"
                              }`} />
                              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                (stud.paymentStatus || (stud.balance < 0 ? "В ожидании оплаты" : "Оплачено")) === "В ожидании оплаты" ? "bg-amber-500" : "bg-emerald-500"
                              }`} />
                            </span>
                          </div>
                        </div>

                        {/* Кнопки пресета и быстрой отправки в 1 клик */}
                        <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto justify-end">
                          <button
                            onClick={() => {
                              setConfirmSendStudentId(stud.id);
                              setShowConfirmSendModal(true);
                            }}
                            className="flex-1 md:flex-initial px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:translate-y-0.5 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase transition-all shadow-md hover:shadow-amber-500/20 flex items-center justify-center gap-2"
                            title="Отправить готовое СМС-напоминание родителю в один клик"
                          >
                            <Send className="w-3.5 h-3.5 text-white animate-pulse" />
                            <span>Напомнить (1 клик)</span>
                          </button>

                          <button
                            onClick={() => {
                              setQuickMsgStudentId(stud.id);
                              setQuickMsgText(`Здравствуйте, ${stud.parentName}! Напоминаем о необходимости оплатить обучение ${stud.name} в Академии танца «Эхо Гор». Пожалуйста, пополните личный счет. Баланс: ${stud.balance} ₸. Спасибо!`);
                              setShowQuickMsgModal(true);
                            }}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/5 hover:border-white/10 text-xs transition-all font-semibold"
                            title="Редактировать шаблон сообщения перед отправкой"
                          >
                            ✍️ Изменить
                          </button>
                        </div>
                      </div>

                      {/* Path of Artist motivation progress tracker */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Прогресс до следующего уровня</span>
                          <span className="text-[#C5A059] font-bold font-mono">
                            {stud.artistLevelPoints}/1000 очков
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-white/5">
                          <div
                            style={{ width: `${Math.min(100, (stud.artistLevelPoints / 1000) * 100)}%` }}
                            className="bg-gradient-to-r from-[#8B0000] to-[#C5A059] h-full rounded-full transition-all"
                          ></div>
                        </div>
                      </div>

                      {/* Quick financial specs card */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Личный счет</span>
                          <p className={`text-lg font-bold mt-1 ${stud.balance < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {stud.balance.toLocaleString()} ₸
                          </p>
                          <p className="text-[9px] text-slate-500 mt-1 uppercase">
                            {stud.balance < 0 ? "Имеется задолженность!" : "Средства активны"}
                          </p>
                        </div>

                        <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Абонемент</span>
                          <p className="text-sm font-bold mt-1 text-white truncate">
                            {activeSub ? activeSub.name : "Нет подписки"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Осталось: <strong className="text-[#C5A059]">{activeSub ? activeSub.lessonsLeft : 0} зан.</strong>
                          </p>
                        </div>

                        <div className="p-4 bg-black/30 rounded-2xl border border-white/5">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Группа обучения</span>
                          <p className="text-sm font-bold mt-1 text-white truncate">
                            {associatedGroup ? associatedGroup.name : "Не зачислен"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {associatedGroup ? associatedGroup.scheduleText : "Расписание отсутствует"}
                          </p>
                        </div>
                      </div>

                      {/* AI Counselor generated from note records */}
                      <div className="p-4 bg-gradient-to-br from-[#1c1c1a] to-[#0f0f0c] rounded-2xl border border-[#C5A059]/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-[#C5A059]" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">
                              AI Мотивационный анализ ученика
                            </h3>
                          </div>
                          <button
                            onClick={() => analyzeStudentProgressWithAi(stud)}
                            disabled={isAnalyzingStudent}
                            className="px-2 py-1 bg-[#C5A059]/15 text-[#C5A059] hover:bg-[#C5A059] hover:text-black rounded-lg text-[9px] font-extrabold uppercase transition-all"
                          >
                            {isAnalyzingStudent ? "Генерируем..." : "Рассчитать веху"}
                          </button>
                        </div>

                        {studentAiAnalyses[stud.id] ? (
                          <div className="space-y-2 text-xs text-sans font-sans">
                            <p className="text-slate-300 leading-relaxed italic border-l border-[#C5A059] pl-3">
                              "{studentAiAnalyses[stud.id].praise}"
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                              <div>
                                <span className="text-[#C5A059] font-bold">Зона развития:</span>
                                <p className="text-slate-400 mt-0.5">{studentAiAnalyses[stud.id].focusArea}</p>
                              </div>
                              <div>
                                <span className="text-[#C5A059] font-bold">Рекомендация для вехи:</span>
                                <p className="text-slate-400 mt-0.5">{studentAiAnalyses[stud.id].nextMilestoneAdvice}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 leading-normal">
                            Нажмите "Рассчитать веху", чтобы AI-художественный руководитель проанализировал достижения и составил персональное кавказское напутствие по Лезгинке.
                          </p>
                        )}
                      </div>

                      {/* Teacher Notes List Inside Profile */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            Дневник наставника (Заметки)
                          </h3>
                        </div>

                        {/* Note Entry form */}
                        <form onSubmit={handleAddNote} className="space-y-2">
                          <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Добавьте рекомендацию преподавателя по технике, осанке или подготовке..."
                            rows={2}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-[#C5A059] text-white"
                          />
                          <div className="flex justify-between items-center">
                            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newNotePrivate}
                                onChange={(e) => setNewNotePrivate(e.target.checked)}
                                className="rounded border-white/10 bg-black text-[#C5A059] focus:ring-0"
                              />
                              <span>Приватная (скрыть от родителя в кабинете)</span>
                            </label>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-[#C5A059] text-black font-extrabold text-xs rounded-xl tracking-wide uppercase transition-all"
                            >
                              Отправить
                            </button>
                          </div>
                        </form>

                        <div className="space-y-3">
                          {stud.notes.map((n) => (
                            <div
                              key={n.id}
                              className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 relative"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">
                                  {n.teacherName}
                                </span>
                                <div className="flex items-center space-x-2">
                                  {n.isPrivate && (
                                    <span className="text-[9px] bg-[#8B0000]/20 text-red-400 font-bold px-1.5 py-0.5 rounded uppercase uppercase">
                                      Для администрации
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500 pl-1">{n.date}</span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-350 leading-relaxed font-sans">{n.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Achievements and Competitions List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Достижения</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {stud.achievements.map((ach) => (
                              <div key={ach.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                                <p className="text-xs font-bold text-white leading-tight flex items-center space-x-1">
                                  <Award className="w-3.5 h-3.5 text-[#C5A059]" />
                                  <span className="truncate">{ach.title}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">{ach.description}</p>
                                <p className="text-[9px] text-[#C5A059] uppercase tracking-wide font-semibold mt-1">ОТКРЫТО</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Выступления и конкурсы</h4>
                          <div className="space-y-2">
                            {stud.performances.length > 0 ? (
                              stud.performances.map((p) => (
                                <div key={p.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex space-x-3 items-center">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                                    <img src={p.mediaUrl} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{p.eventName}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{p.role}</p>
                                    <span className="text-[9px] text-[#C5A059] font-bold">{p.achievedRank || "Участник"}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 italic">Пока не принимал участия в концертах</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* История платежей */}
                      <div className="space-y-3 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-[#C5A059]" />
                            История платежей ученика
                          </h4>
                          <span className="text-[10px] text-[#C5A059] font-mono font-bold bg-[#C5A059]/10 px-2 py-0.5 rounded-full">
                            Всего транзакций: {payments.filter((p) => p.studentId === stud.id).length}
                          </span>
                        </div>

                        <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                          {payments.filter((p) => p.studentId === stud.id).length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-slate-350">
                                <thead>
                                  <tr className="border-b border-white/5 bg-white/[0.02] text-slate-500 uppercase text-[9px] tracking-widest font-extrabold">
                                    <th className="py-2.5 px-4 font-bold">Дата</th>
                                    <th className="py-2.5 px-2 font-bold">Назначение</th>
                                    <th className="py-2.5 px-2 font-bold">Метод</th>
                                    <th className="py-2.5 px-2 font-bold text-right">Сумма</th>
                                    <th className="py-2.5 px-4 font-bold text-center">Статус</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-sans">
                                  {payments
                                    .filter((p) => p.studentId === stud.id)
                                    .map((p) => (
                                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{p.date}</td>
                                        <td className="py-3 px-2">
                                          <div className="font-semibold text-slate-200">{p.description}</div>
                                          <div className="text-[9px] text-[#C5A059] uppercase font-bold mt-0.5 tracking-wider">
                                            {p.type === 'subscription' ? 'Абонемент' : p.type === 'uniform' ? 'Форма' : p.type === 'concert' ? 'Концерт/Взнос' : 'Разовое'}
                                          </div>
                                        </td>
                                        <td className="py-3 px-2 text-[10px] uppercase text-slate-400 font-mono">
                                          {p.method === 'card' ? 'Карта' : p.method === 'cash' ? 'Наличные' : 'Перевод'}
                                        </td>
                                        <td className="py-3 px-2 text-right font-extrabold text-white">
                                          {p.amount.toLocaleString()} ₸
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                            {p.status === "paid" ? "Проведено" : "В обработке"}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-6 text-center text-slate-500 text-xs">
                              Транзакций для данного ученика пока не зафиксировано
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>

            </div>
          )}


          {/* VIEW: BILLING & FINANCES */}
          {activeTab === "billing" && (
            <div className="bg-[#161616] rounded-3xl border border-white/5 p-4 md:p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Финансы, Касса и Абонементы</h2>
                  <p className="text-xs text-slate-500">Учет оплат, продлений и кассовые операции филиалов</p>
                </div>
                <div>
                  <button
                    onClick={() => {
                      setSelectedStudentId("stud-alan");
                      setShowAddPaymentModal(true);
                    }}
                    className="px-4 py-2 bg-[#C5A059] text-black font-extrabold rounded-xl text-xs tracking-wide uppercase transition-all shadow-md"
                  >
                    Зарегистрировать платеж
                  </button>
                </div>
              </div>

              {/* Outstanding debits alerts */}
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 text-center md:text-left">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Внимание: Задолженность по абонементам!</h4>
                    <p className="text-[11px] text-slate-400">Ученик Алан Дзагоев имеет просроченную подписку на сумму 4,500 ₸.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudentId("stud-alan");
                    setPaymentAmount(4500);
                    setPaymentDesc("Погашение долга: Старший ансамбль");
                    setPaymentType("subscription");
                    setShowAddPaymentModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#8B0000] text-white hover:bg-red-700 rounded-xl text-xs font-bold tracking-wide uppercase transition-all"
                >
                  Погасить долг ₸
                </button>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Последние поступления</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                        <th className="py-2.5">Ученик</th>
                        <th>Назначение</th>
                        <th>Дата оплаты</th>
                        <th>Способ</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {payments.map((p) => {
                        const s = students.find((std) => std.id === p.studentId);
                        return (
                          <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 font-bold text-white">{s ? s.name : "Ученик удален"}</td>
                            <td>{p.description}</td>
                            <td>{p.date}</td>
                            <td className="uppercase font-mono text-slate-405">{p.method}</td>
                            <td className="font-extrabold text-white">{p.amount.toLocaleString()} ₸</td>
                            <td>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider">
                                {p.status === "paid" ? "Проведено" : "В обработке"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* VIEW: TEACHER WORKSPACE */}
          {activeTab === "teacher-board" && (
            <div className="bg-[#161616] rounded-3xl border border-white/5 p-4 md:p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Журнал посещаемости и Прогресса</h2>
                  <p className="text-xs text-slate-500">Авторизован как: Преподаватель Аслан Плиев</p>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#C5A059]"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Attendance dynamic checklist */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-2 ml-1">
                  <span className="text-xs font-bold text-[#C5A059] uppercase tracking-wider">
                    Отметки на занятие: {new Date().toISOString().split("T")[0]} (Сегодня)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Каждый клик мгновенно обновляет облачную посещаемость
                  </span>
                </div>

                <div className="space-y-2">
                  {filteredStudents.map((stud) => {
                    const todayDate = new Date().toISOString().slice(0, 10);
                    const att = stud.attendance[todayDate] || { status: "unmarked" };

                    return (
                      <div
                        key={stud.id}
                        className="p-4 bg-[#0A0A0A]/60 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={stud.photoUrl}
                            alt={stud.name}
                            className="w-10 h-10 rounded-full border border-white/10 object-cover flex-shrink-0"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{stud.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                              Уровень: {stud.artistLevel}
                            </p>
                          </div>
                        </div>

                        {/* Status buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleAttendance(stud.id, todayDate, "present")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              att.status === "present"
                                ? "bg-emerald-500 text-black font-extrabold shadow-md"
                                : "bg-white/5 text-slate-400 hover:bg-white/10"
                            }`}
                          >
                            Присутствовал
                          </button>
                          <button
                            onClick={() => toggleAttendance(stud.id, todayDate, "absent")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              att.status === "absent"
                                ? "bg-[#8B0000] text-white font-extrabold"
                                : "bg-white/5 text-slate-400 hover:bg-white/10"
                            }`}
                          >
                            Н/Я
                          </button>
                          <button
                            onClick={() => toggleAttendance(stud.id, todayDate, "sick")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              att.status === "sick"
                                ? "bg-amber-500 text-black font-extrabold"
                                : "bg-white/5 text-slate-400 hover:bg-white/10"
                            }`}
                          >
                            Болен
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* Teacher helper guidelines */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <NotebookText className="w-4 h-4 text-[#C5A059]" />
                  <span>Педагогический кодекс ансамбля:</span>
                </span>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Следите, чтобы каждый джигит вовремя разминал голеностоп перед прыжками. Перед
                  каждым крупным турниром замеряйте уровень 'Путь Артиста' у кандидатов на сольные
                  партии.
                </p>
              </div>

            </div>
          )}


          {/* VIEW: ANNOUNCEMENTS & SCHOOL UPDATES */}
          {activeTab === "announcements" && (() => {
            const isManager = activeRole === "owner" || activeRole === "branch" || activeRole === "admin";
            const currentTargets = getNotificationTargets(notifFilterType, notifSelectedBranchId, notifSelectedGroupId);

            // Preset templates tailored for traditional Caucasian dance academy
            const NOTIF_PRESETS = [
              {
                title: "⚠️ Экстренный сдвиг расписания репетиций к летнему концерту",
                content: "Внимание руководителей всех ансамблей и родителей! В связи с подготовкой сводных номеров Симд и Хонга, тренировка переносится на 30 минут позже на эти две недели. Ичиги и тренировочная черкеска обязательны!",
                label: "📅 Сдвиг расписания"
              },
              {
                title: "🏆 Важная репетиция Старшего Ансамбля перед конкурсом",
                content: "Уважаемые артисты! Просим подойти в зал Эльбрус за 45 минут до основного занятия. Будем проводить замеры концертных черкесок и репетировать трюковую технику с кинжалами (муляжами).",
                label: "🕺 Генеральная тренировка"
              },
              {
                title: "🌨️ Отмена тренировок из-за штормового предупреждения",
                content: "Уважаемые родители! Из-за сильного снегопада и порывистого ветра в регионе, все очные занятия в филиалах сегодня КАТЕГОРИЧЕСКИ переносятся во избежание обледенения дорог. Берегите детей!",
                label: "⛈️ Метео/Оледенение"
              },
              {
                title: "💳 Закрытие оплаты абонементов к 10 числу",
                content: "Уважаемые родители! Напоминаем о необходимости закрытия платежей в личном кабинете. Своевременный взнос критически важен для бронирования выездных автобусов на республиканский конкурс.",
                label: "💰 Напоминание оплаты"
              }
            ];

            return (
              <div className="bg-[#161616] rounded-3xl border border-white/5 p-4 md:p-6 space-y-6">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-white/5 gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                      <Bell className="w-5 h-5 text-[#C5A059]" />
                      <span>Официальные объявления и новости сети</span>
                    </h2>
                    <p className="text-xs text-slate-500">
                       {isManager 
                        ? "Интегрированный центр управления коммуникацией с родителями и учениками" 
                        : "Официальный дашборд объявлений и срочных уведомлений для родителей и учеников"
                      }
                    </p>
                  </div>

                  {/* Manager Sub-tabs options */}
                  {isManager && (
                    <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 self-stretch md:self-auto justify-center">
                      <button
                        onClick={() => setAnnSubTab("feed")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          annSubTab === "feed"
                            ? "bg-[#C5A059] text-black shadow-lg"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        📢 Лента ({announcements.length})
                      </button>
                      <button
                        onClick={() => setAnnSubTab("dispatch")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                          annSubTab === "dispatch"
                            ? "bg-gradient-to-r from-amber-500 to-[#C5A059] text-black shadow-lg"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="relative flex h-2 w-2 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span>⚡ Экспресс-Рассылка</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* TAB 1: SUBSECTION DISPATCH CENTER FOR MANAGER */}
                {isManager && annSubTab === "dispatch" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Configuration form left-side (7 cols) */}
                      <div className="lg:col-span-7 bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                        <span className="text-xs font-bold text-[#C5A059] uppercase tracking-wider block">
                          🏗️ Шаг 1: Подготовка контента объявления
                        </span>

                        {/* Presets template speed bar */}
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold mb-2 block">
                            Шаблоны быстрого автозаполнения (Caucasian Dance Templates):
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {NOTIF_PRESETS.map((p, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setNotifFormTitle(p.title);
                                  setNotifFormContent(p.content);
                                  addAuditLog("Выбран шаблон рассылки", `Загружен пресет "${p.label}"`);
                                }}
                                className="p-2 text-left bg-black/30 hover:bg-[#C5A059]/10 rounded-xl border border-white/5 hover:border-[#C5A059]/30 transition-all text-[11px] text-slate-300 hover:text-white"
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Тема оповещения</label>
                          <input
                            type="text"
                            placeholder="Например: Изменение в расписании Старшего Ансамбля"
                            value={notifFormTitle}
                            onChange={(e) => setNotifFormTitle(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#C5A059]"
                          />
                        </div>

                        {/* Content text */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Текст официального сообщения</label>
                          <textarea
                            rows={4}
                            placeholder="Напишите обращение к родителям и джигитам..."
                            value={notifFormContent}
                            onChange={(e) => setNotifFormContent(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#C5A059] font-sans"
                          />
                        </div>

                        {/* Important badge check */}
                        <div className="flex items-center space-x-2.5 bg-black/25 p-3 rounded-xl border border-white/5">
                          <input
                            type="checkbox"
                            id="notifIsImportant"
                            checked={notifIsImportant}
                            onChange={(e) => setNotifIsImportant(e.target.checked)}
                            className="rounded border-white/10 bg-black text-[#C5A059] focus:ring-[#C5A059]"
                          />
                          <label htmlFor="notifIsImportant" className="text-xs text-slate-300 font-bold select-none cursor-pointer">
                            ⚠️ Отметить красной меткой как 'Важная новость' (высокий приоритет)
                          </label>
                        </div>
                      </div>

                      {/* Filters and Delivery Channels on the Right (5 cols) */}
                      <div className="lg:col-span-5 bg-white/5 p-5 rounded-2xl border border-white/5 space-y-5 flex flex-col justify-between">
                        <div className="space-y-4">
                          <span className="text-xs font-bold text-[#C5A059] uppercase tracking-wider block">
                            🎯 Шаг 2: Сегментация & Каналы связи
                          </span>

                          {/* Filtering selection */}
                          <div className="space-y-2">
                            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Целевая аудитория (Кому)</label>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                              <button
                                type="button"
                                onClick={() => setNotifFilterType("all")}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                                  notifFilterType === "all" ? "bg-white/10 text-[#C5A059]" : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Всем
                              </button>
                              <button
                                type="button"
                                onClick={() => setNotifFilterType("branch")}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                                  notifFilterType === "branch" ? "bg-white/10 text-[#C5A059]" : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Филиал
                              </button>
                              <button
                                type="button"
                                onClick={() => setNotifFilterType("group")}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                                  notifFilterType === "group" ? "bg-white/10 text-[#C5A059]" : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Группа
                              </button>
                            </div>

                            {/* Conditional filter settings */}
                            {notifFilterType === "branch" && (
                              <select
                                value={notifSelectedBranchId}
                                onChange={(e) => setNotifSelectedBranchId(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                              >
                                {branches.map(b => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                            )}

                            {notifFilterType === "group" && (
                              <select
                                value={notifSelectedGroupId}
                                onChange={(e) => setNotifSelectedGroupId(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                              >
                                {groups.map(g => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Channel selection */}
                          <div className="space-y-2">
                            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Интеграционные шлюзы доставки</label>
                            <div className="space-y-2 bg-black/25 p-3 rounded-xl border border-white/5">
                              <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer">
                                <span className="flex items-center space-x-2">
                                  <span>📧 Email-рассылка</span>
                                  <span className="text-[9px] text-[#C5A059] bg-[#C5A059]/10 px-1 py-0.2 rounded">SMTP Active</span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={notifChannels.email}
                                  onChange={(e) => setNotifChannels(prev => ({ ...prev, email: e.target.checked }))}
                                  className="rounded border-white/10 bg-black text-[#C5A059] focus:ring-[#C5A059]"
                                />
                              </label>

                              <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer pt-2 border-t border-white/5">
                                <span className="flex items-center space-x-2">
                                  <span>📱 Push-уведомление</span>
                                  <span className="text-[9px] text-cyan-400 bg-cyan-400/10 px-1 py-0.2 rounded">In-App Live</span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={notifChannels.push}
                                  onChange={(e) => setNotifChannels(prev => ({ ...prev, push: e.target.checked }))}
                                  className="rounded border-white/10 bg-black text-[#C5A059] focus:ring-[#C5A059]"
                                />
                              </label>

                              <label className="flex items-center justify-between text-xs text-slate-300 font-medium cursor-pointer pt-2 border-t border-white/5">
                                <span className="flex items-center space-x-2">
                                  <span>💬 SMS & WhatsApp шлюз</span>
                                  <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded">Simulated</span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={notifChannels.sms}
                                  onChange={(e) => setNotifChannels(prev => ({ ...prev, sms: e.target.checked }))}
                                  className="rounded border-white/10 bg-black text-[#C5A059] focus:ring-[#C5A059]"
                                />
                              </label>
                            </div>
                          </div>

                          {/* Calculated Target summary indicator */}
                          <div className="p-3 bg-white/5 rounded-xl border-l-2 border-[#C5A059] flex justify-between items-center">
                            <div>
                              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold">Получатели по данному фильтру:</p>
                              <p className="text-xs font-bold text-white mt-0.5">
                                {currentTargets.parents.length} родителей & {currentTargets.students.length} учеников
                              </p>
                            </div>
                            <span className="text-sm font-extrabold text-[#C5A059]">{currentTargets.totalCount}</span>
                          </div>
                        </div>

                        {/* Dispatch trigger button */}
                        <button
                          type="button"
                          onClick={handleTriggerMassNotification}
                          disabled={simDispatchState?.status === "sending"}
                          className="w-full py-3 bg-gradient-to-r from-[#C5A059] to-amber-600 hover:from-[#d1ab63] hover:to-amber-500 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          <span>⚡ НАЖАТЬ И ОПОВЕСТИТЬ ВСЕХ МГНОВЕННО</span>
                        </button>
                      </div>
                    </div>

                    {/* LIVE SIMULATOR SYSTEM STATUS OVERLAY OR ACCORDION (TELEMETRY DISPATCH FEED) */}
                    {simDispatchState && (
                      <div className="bg-[#0c0c0c] p-5 rounded-2xl border border-white/10 space-y-4 animate-fade-in shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-1 bg-[#C5A059] transition-all duration-300" style={{ width: `${simDispatchState.progress}%` }}></div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${simDispatchState.status === "sending" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {simDispatchState.status === "preparing" && "Инициализация серверов связи..."}
                              {simDispatchState.status === "sending" && "Идет массовая рассылка пакетов данных..."}
                              {simDispatchState.status === "complete" && "🎉 Рассылка успешно завершена!"}
                            </span>
                          </div>
                          
                          <div className="text-xs text-slate-400">
                            Прогресс: <span className="font-mono font-extrabold text-[#C5A059]">{simDispatchState.progress}%</span>
                          </div>
                        </div>

                        {/* Progress slider view */}
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                          <div className="bg-gradient-to-r from-[#C5A059] to-amber-500 h-full transition-all duration-300" style={{ width: `${simDispatchState.progress}%` }}></div>
                        </div>

                        {/* Server telemetry stats grid */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Email доставлено</p>
                            <p className="text-base font-extrabold text-white mt-1">{simDispatchState.sentEmailsCount}</p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Push доставлено</p>
                            <p className="text-base font-extrabold text-cyan-400 mt-1">{simDispatchState.sentPushCount}</p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">SMS шлюзы (OK)</p>
                            <p className="text-base font-extrabold text-amber-500 mt-1">{simDispatchState.sentSmsCount}</p>
                          </div>
                        </div>

                        {/* Recent sending lines (Log) */}
                        <div className="space-y-1 bg-black p-3.5 rounded-xl border border-white/5 max-h-[160px] overflow-y-auto font-mono text-[11px] text-slate-400">
                          <div className="text-slate-500 uppercase text-[9px] tracking-widest pb-1 border-b border-white/5 mb-1.5 font-sans font-bold">
                            Серверное логирование в реальном времени:
                          </div>
                          <div className="space-y-1">
                            {simDispatchState.recipientList.filter(item => item.status === "sent").map((rec, index) => (
                              <div key={index} className="flex items-center justify-between text-emerald-400">
                                <span className="text-white">✓ Доставлено: {rec.name}</span>
                                <span className="text-[10px] uppercase text-emerald-500/80">
                                  {notifChannels.email && notifChannels.push ? "Email+Push OK" : notifChannels.email ? "Email SMTP" : "In-App Push"}
                                </span>
                              </div>
                            ))}
                            {simDispatchState.status === "sending" && (
                              <div className="text-amber-400 animate-pulse flex items-center justify-between">
                                <span>⚡ Отправка: {simDispatchState.currentRecipientName}...</span>
                                <span className="text-[10px]">В обработке</span>
                              </div>
                            )}
                            {simDispatchState.status === "complete" && (
                              <div className="text-[#C5A059] font-bold">
                                --- ОЧЕРЕДЬ СФОРМИРОВАНА НА 100%. ВСЕ ОПОВЕЩЕНИЯ ДОСТАВЛЕНЫ АДРЕСАТАМ ---
                              </div>
                            )}
                          </div>
                        </div>

                        {simDispatchState.status === "complete" && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSimDispatchState(null)}
                              className="px-4 py-2 bg-emerald-500 text-black font-extrabold text-[11px] uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-colors"
                            >
                              ОК, Закрыть Telemetry HUD
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* HISTORY OF BULK DISPATCHES */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">📜 Лог истории отправки массовых рассылок</h3>
                      
                      <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/5 text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                                <th className="p-3">Тема оповещения</th>
                                <th className="p-3">Сегмент рассылки</th>
                                <th className="p-3">Каналы связи</th>
                                <th className="p-3">Общий охват</th>
                                <th className="p-3">Дата отправки</th>
                                <th className="p-3 text-right">Ответственный</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                              {notificationHistory.map((hist) => (
                                <tr key={hist.id} className="hover:bg-white/5 transition-colors">
                                  <td className="p-3">
                                    <div className="font-bold text-white">{hist.title}</div>
                                    <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{hist.content}</div>
                                  </td>
                                  <td className="p-3">
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-extrabold font-mono">
                                      {hist.filterName}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex space-x-1.5">
                                      {hist.channels.map((chan: string) => (
                                        <span key={chan} className="text-[9px] px-1.5 py-0.5 uppercase tracking-wide font-bold rounded bg-cyan-400/15 text-cyan-400">
                                          {chan}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className="font-bold text-white">{hist.recipients.parents + hist.recipients.students} чел.</span>
                                    <span className="text-[10px] text-slate-500 block">({hist.recipients.parents} род. / {hist.recipients.students} уч.)</span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-400">
                                    {new Date(hist.sentAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </td>
                                  <td className="p-3 text-right font-semibold text-slate-400">
                                    {hist.authorName}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 2 / MAIN VIEW: PUBLIC ANNOUNCEMENTS TIMELINE */}
                {(!isManager || annSubTab === "feed") && (
                  <div className="space-y-4">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className={`p-5 rounded-2xl border-l-4 space-y-2.5 transition-all hover:scale-[1.005] ${
                          ann.isImportant
                            ? "bg-[#8B0000]/10 border-[#8B0000] border-t border-b border-r border-[#8B0000]/20"
                            : "bg-white/5 border-l-[#C5A059] border-t border-b border-r border-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {ann.isImportant && (
                              <span className="text-[9px] bg-[#8B0000] text-white px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                                Важно!
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-bold">
                              {ann.authorName} ({ann.authorRole})
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">{ann.date}</span>
                        </div>

                        <h3 className="text-base font-bold text-white font-sans">{ann.title}</h3>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{ann.content}</p>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => {
                              setAnnouncements((prev) =>
                                prev.map((a) => (a.id === ann.id ? { ...a, likes: a.likes + 1 } : a))
                              );
                              addAuditLog("Реакция на новость", `Лайк новости: ${ann.title}`);
                            }}
                            className="text-xs text-slate-400 hover:text-[#C5A059] flex items-center space-x-1.5 transition-colors bg-white/5 px-2.5 py-1 rounded-lg border border-white/10"
                          >
                            <span>❤️ {ann.likes}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })()}


          {/* VIEW: AUDIT LOGS */}
          {activeTab === "logs" && (
            <div className="bg-[#161616] rounded-2xl border border-white/5 p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">Регистр системных событий (Audit Log)</h2>
                <p className="text-xs text-slate-500">Мониторинг безопасности, финансовых зачислений и смен расписания</p>
              </div>

              <div className="space-y-1.5 max-h-[420px] overflow-y-auto font-mono text-xs pr-1">
                {auditLogs.map((l) => (
                  <div key={l.id} className="p-3 bg-black/40 rounded-lg border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] bg-[#C5A059]/15 text-[#C5A059] px-1.5 py-0.5 rounded uppercase font-bold text-bold">
                          {l.userRole}
                        </span>
                        <span className="text-white font-bold">{l.action}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{l.details}</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      <span>{l.timestamp.replace("T", " ").substring(0, 19)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}




          {/* VIEW: STUDENT CAMPAIGN (Path of Artist) */}
          {false && activeTab === "artist-way" && (
            <div className="space-y-6">

              {/* URGENT MASSOVYE UPADOMLENIYA STUDENT */}
              {unreadSimulatedAlerts.length > 0 && (
                <div className="bg-gradient-to-r from-amber-600/25 to-red-600/20 border border-[#C5A059]/40 p-5 rounded-3xl space-y-3 relative overflow-hidden animate-pulse shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Bell className="w-5 h-5 text-[#C5A059]" />
                      <span className="text-xs font-serif font-extrabold text-white uppercase tracking-wider">
                        🚨 СРОЧНОЕ УВЕДОМЛЕНИЕ ОТ ХУДОЖЕСТВЕННОГО РУКОВОДИТЕЛЯ
                      </span>
                    </div>
                    <button 
                      onClick={() => setUnreadSimulatedAlerts([])}
                      className="text-[10px] uppercase font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      Скрыть
                    </button>
                  </div>
                  
                  {unreadSimulatedAlerts.map((alert) => (
                    <div key={alert.id} className="space-y-1.5 p-3.5 bg-black/40 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{alert.title}</h4>
                        <span className="text-[10px] text-[#C5A059] font-bold">Push-оповещение</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-normal font-sans">{alert.content}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                        <span>Руководитель: {alert.authorName}</span>
                        <span>{new Date(alert.sentAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setUnreadSimulatedAlerts([]);
                        addAuditLog("Студент ознакомился", "Джигит/Горка подтвердил получение распоряжения руководства");
                      }}
                      className="px-4 py-2 bg-[#C5A059] text-black text-[11px] uppercase tracking-wider font-extrabold rounded-xl hover:bg-amber-400 transition-all shadow-md"
                    >
                      ✓ Принять к сведению (Распоряжение подтверждено)
                    </button>
                  </div>
                </div>
              )}
              
              {/* Huge status banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-[#8B0000] to-[#510000] rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Background design glow */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-[#C5A059]/10 rounded-full filter blur-3xl transform translate-x-12 -translate-y-12"></div>
                
                {(() => {
                  const s = students.find((std) => std.id === selectedStudentId) || students[0];
                  return (
                    <>
                      <div className="space-y-3 relative z-10 text-center md:text-left">
                        <span className="text-[10px] bg-black/40 text-[#C5A059] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-widest">
                          ЛИЧНЫЙ ПРОФИЛЬ: ПУТЬ АРТИСТА
                        </span>
                        <h2 className="text-2xl md:text-3xl font-serif italic text-white tracking-wide">
                          Сослан Болотаев
                        </h2>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          <span className="text-xs text-white bg-white/15 px-3 py-1 rounded-full font-semibold">
                            Уровень: {s.artistLevel}
                          </span>
                          <span className="text-xs text-[#C5A050] bg-[#C5A050]/10 px-3 py-1 rounded-full font-bold">
                            Ученик Ансамбля №1
                          </span>
                        </div>
                      </div>

                      <div className="text-center md:text-right relative z-10 space-y-1 flex-shrink-0">
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest leading-none font-bold">Копилка Силы Артиста</p>
                        <p className="text-4xl font-black font-sans text-white leading-none">
                          {s.artistLevelPoints} <span className="text-lg text-[#C5A059]">очков</span>
                        </p>
                        <p className="text-[10px] text-slate-400">До ранга "Легенда Академии" осталось 150 очков!</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Artist levels visual timeline */}
              <div className="bg-[#161616] rounded-3xl border border-white/5 p-4 md:p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-center md:text-left">
                  Дорожная карта Вашего Величия (Семь ступеней Лезгинки)
                </h3>
                
                <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 text-center">
                  {[
                    { lvl: ArtistLevel.FIRST_STEP, desc: "Первый Шаг", pt: "0+" },
                    { lvl: ArtistLevel.ENSEMBLE_STUDENT, desc: "Ученик Ансамбля", pt: "100+" },
                    { lvl: ArtistLevel.PERFORMANCE_MEMBER, desc: "Участник Выступлений", pt: "200+" },
                    { lvl: ArtistLevel.SCHOOL_REPRESENTATIVE, desc: "Представитель Школы", pt: "350+" },
                    { lvl: ArtistLevel.SOLOIST, desc: "Солист Ансамбля", pt: "500+" },
                    { lvl: ArtistLevel.SENIOR_STUDENT, desc: "Старший Ученик", pt: "700+" },
                    { lvl: ArtistLevel.ACADEMY_LEGEND, desc: "Легенда Школы", pt: "900+" },
                  ].map((tier, idx) => {
                    // Check if student has unlocked this level
                    const s = students.find((std) => std.id === selectedStudentId) || students[0];
                    const activeLvlIdx = [
                      ArtistLevel.FIRST_STEP,
                      ArtistLevel.ENSEMBLE_STUDENT,
                      ArtistLevel.PERFORMANCE_MEMBER,
                      ArtistLevel.SCHOOL_REPRESENTATIVE,
                      ArtistLevel.SOLOIST,
                      ArtistLevel.SENIOR_STUDENT,
                      ArtistLevel.ACADEMY_LEGEND
                    ].indexOf(s.artistLevel);

                    const isUnlocked = idx <= activeLvlIdx;
                    
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 ${
                          isUnlocked
                            ? "bg-[#C5A059]/10 border-[#C5A059]/40 text-white"
                            : "bg-black/30 border-white/5 text-slate-500"
                        }`}
                      >
                        <span className={`text-[9px] font-bold uppercase tracking-wider mx-auto px-1.5 py-0.5 rounded ${
                          isUnlocked ? "bg-[#C5A059] text-black" : "bg-white/5"
                        }`}>
                          Ступень {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold leading-tight">{tier.desc}</p>
                          <p className="text-[10px] font-mono mt-1">{tier.pt} XP</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Achievements medallions & Video media portfolio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Unlocked trophies */}
                <div className="bg-[#161616] p-4 md:p-6 rounded-3xl border border-white/5 space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Гербы за усердие и дух</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getAvailableAchievements().map((ach) => (
                      <div key={ach.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-0.5">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{ach.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{ach.description}</p>
                          {ach.unlockedAt ? (
                            <span className="text-[9px] text-[#C5A059] font-bold block mt-1 uppercase">Разблокировано</span>
                          ) : (
                            <span className="text-[9px] text-slate-500 font-bold block mt-1 uppercase">В процессе</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video reel of concerts */}
                <div className="bg-[#161616] p-4 md:p-6 rounded-3xl border border-white/5 space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Видеохроника Ваших Танцев</h4>
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                      <img
                        src="https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=600&fit=crop&q=85"
                        className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-300"
                        alt="Лезгинка концерт"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#C5A059] text-black flex items-center justify-center font-bold shadow-xl">
                          <Video className="w-5 h-5 scale-110" />
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1 rounded-lg">
                        <p className="text-[10px] text-[#C5A059] font-bold">Кубок Кавказа 2026 - Гран-При</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">
                      Видео репетиций и конкурсов автоматически подгружаются художественным руководителем. Покажите их родственникам, чтобы они гордились Вашей осанкой и ритмом!
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

            </>
          )}

        </main>
      </div>

      {/* Bottom Context Bar */}
      <footer className="h-12 bg-[#0F0F0F] border-t border-white/5 px-4 md:px-6 flex items-center justify-between flex-shrink-0 select-none">
        <div className="flex space-x-4 md:space-x-8 text-[9px] md:text-[10px] uppercase tracking-widest text-slate-500">
          <span>Версия 1.1.2 - "Lezginka Edition"</span>
          <span className="hidden md:inline">Облачная синхронизация активна</span>
          <span className="hidden lg:inline">Безопасность: Ролевой протокол</span>
        </div>
        <div className="flex space-x-3 items-center">
          <span className="text-[9px] md:text-[10px] text-[#C5A059] uppercase tracking-wider font-bold">
            100% Локальный демо-режим
          </span>
          <div className="w-2 h-2 rounded-full bg-[#C5A059]"></div>
        </div>
      </footer>


      {/* FORM MODAL: REGISTER NEW STUDENT */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-55 p-4">
          <div className="bg-[#121212] rounded-3xl border border-[#C5A059]/30 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Регистрация ученика</h3>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={registerNewStudent} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">ФИО ученика</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Инал Плиев"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Возраст</label>
                  <input
                    type="number"
                    required
                    value={newStudentAge}
                    onChange={(e) => setNewStudentAge(parseInt(e.target.value) || 12)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Филиал школы</label>
                  <select
                    value={newStudentBranch}
                    onChange={(e) => setNewStudentBranch(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Группа обучения</label>
                <select
                  value={newStudentGroup}
                  onChange={(e) => setNewStudentGroup(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2 text-xs text-white"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Родитель ФИО</label>
                  <input
                    type="text"
                    value={newStudentParent}
                    onChange={(e) => setNewStudentParent(e.target.value)}
                    placeholder="Аслан Плиев ст."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Телефон контакта</label>
                  <input
                    type="tel"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    placeholder="+7 (928) 001-11-22"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#C5A059] text-black font-extrabold text-xs rounded-xl tracking-widest uppercase transition-all"
                >
                  Зарегистрировать джигита
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* FORM MODAL: POST PAYMENT */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-55 p-4">
          <div className="bg-[#121212] rounded-3xl border border-[#C5A059]/30 p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Прием оплаты</h3>
              <button
                type="button"
                onClick={() => setShowAddPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={processPayment} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Сумма платежа (тг)</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Описание назначения</label>
                <input
                  type="text"
                  required
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Тип платежа</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="subscription">Абонемент 12зан.</option>
                    <option value="single">Разовое зан.</option>
                    <option value="uniform">Форма / Обувь</option>
                    <option value="concert">Концертный сбор</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Способ оплаты</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="card">Карта</option>
                    <option value="cash">Наличные</option>
                    <option value="transfer">Перевод СБП</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#C5A059] text-black font-extrabold text-xs rounded-xl tracking-widest uppercase transition-all"
                >
                  Провести платеж в кассу
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* QUICK PAYMENT REMINDER MESSAGE MODAL */}
      {showQuickMsgModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99] p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#121212] rounded-3xl border border-[#C5A059]/40 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-[#C5A059]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Отправка напоминания</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickMsgModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5 animate-pulse" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-normal">
                Отредактируйте или подтвердите отправку СМС / WhatsApp сообщения родителю. Напоминание мгновенно отобразится в кабинете родителя.
              </p>

              <div>
                <label className="text-[10px] text-[#C5A059] uppercase font-bold block mb-1">
                  Текст сообщения для родителя:
                </label>
                <textarea
                  value={quickMsgText}
                  onChange={(e) => setQuickMsgText(e.target.value)}
                  rows={5}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-[#C5A059] text-white leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickMsgModal(false)}
                className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl uppercase tracking-wider transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  if (quickMsgStudentId) {
                    handleSendQuickPaymentNotification(quickMsgStudentId, quickMsgText);
                  }
                  setShowQuickMsgModal(false);
                }}
                className="py-2.5 bg-[#C5A059] hover:bg-[#C5A059]/90 active:translate-y-0.5 text-black font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all"
              >
                Отправить (1 клик)
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ONE-CLICK PAYMENT REMINDER CONFIRMATION MODAL */}
      {showConfirmSendModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[99] p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-[#121212] rounded-3xl border border-[#C5A059]/40 p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 pb-2 border-b border-white/5 text-amber-500">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Подтверждение отправки
              </h3>
            </div>

            {confirmSendStudentId && (
              (() => {
                const s = students.find((st) => st.id === confirmSendStudentId);
                if (!s) return null;
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Вы уверены, что хотите отправить быстрое уведомление родителю{" "}
                      <strong className="text-white">{s.parentName}</strong> для ученика{" "}
                      <strong className="text-white">{s.name}</strong>?
                    </p>

                    <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 space-y-2">
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Предпросмотр сообщения</p>
                      <p className="text-[11px] text-slate-400 font-sans italic leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                        "Здравствуйте, {s.parentName}! Напоминаем о необходимости произвести оплату обучения {s.name} в Академии народного танца «Эхо Гор» по причине отсутствия активного абонемента. Баланс: {s.balance} ₸. Спасибо!"
                      </p>
                    </div>

                    <div className="p-2.5 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[10px] text-amber-400/90 leading-normal">
                      💡 Сообщение будет доставлено родителю мгновенно в личный кабинет, а также продублировано по дополнительным каналам связи.
                    </div>
                  </div>
                );
              })()
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmSendModal(false);
                  setConfirmSendStudentId(null);
                }}
                className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl uppercase tracking-wider transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmSendStudentId) {
                    handleSendQuickPaymentNotification(confirmSendStudentId);
                  }
                  setShowConfirmSendModal(false);
                  setConfirmSendStudentId(null);
                }}
                className="py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all shadow-md active:translate-y-0.5"
              >
                Да, отправить
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MOBILE APPLICATION VIEW & PORTRAIT SMARTPHONE SIMULATOR */}
      {isMobileSimulatorOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center z-[99999] p-4 select-none animate-fade-in font-sans">
          
          {/* Dynamic Caucasus Mountains starry sky backdrop */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#020305" />
              {/* Star dots */}
              <circle cx="10%" cy="15%" r="1" fill="#fff" opacity="0.6" stroke="none" />
              <circle cx="25%" cy="8%" r="1.5" fill="#fff" opacity="0.8" stroke="none" />
              <circle cx="45%" cy="20%" r="1" fill="#fff" opacity="0.5" stroke="none" />
              <circle cx="65%" cy="12%" r="1" fill="#fff" opacity="0.4" stroke="none" />
              <circle cx="85%" cy="18%" r="1.5" fill="#fff" opacity="0.9" stroke="none" />
              <circle cx="95%" cy="5%" r="1" fill="#fff" opacity="0.7" stroke="none" />
              
              {/* Silhouette Peaks background */}
              <path d="M 0,100 L 150,40 L 320,80 L 480,20 L 680,90 L 850,30 L 1000,100 Z" fill="rgba(197,160,89,0.03)" transform="matrix(1, 0, 0, 10, 0, 100)" />
            </svg>
          </div>

          {/* Desktop simulator controller pane (floating next to browser window mockup) */}
          <div className="absolute top-4 right-4 z-[100000] flex items-center space-x-2">
            <button
              onClick={() => {
                setIsMobileSimulatorOpen(false);
                addAuditLog("Выход из Симулятора", "Пользователь вернулся в десктопную версию");
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-all flex items-center gap-2 shadow-2xl cursor-pointer"
            >
              <span>← На десктоп</span>
            </button>
          </div>

          {/* SMARTPHONE HARDWARE SHELL FRAME */}
          <div className="relative w-[385px] h-[812px] bg-[#0c1015] rounded-[52px] border-[11px] border-[#1f262e] shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden select-none transition-all duration-300">
            
            {/* Camera / Notch Assembly (Dynamic Island style) */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-[1000] flex items-center justify-between px-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-900/60"></span>
              <span className="w-1 h-1 rounded-full bg-neutral-900"></span>
            </div>

            {/* Mobile Status Bar */}
            <div className="h-10 pt-4 px-6 flex justify-between items-center text-[10px] font-bold text-white/90 z-40 select-none bg-black/10">
              <span className="font-sans">09:41</span>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.13 19.58 10.53 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
                </svg>
                <div className="w-5 h-2.5 border border-white/50 rounded-sm p-0.5 flex items-center">
                  <div className="h-full w-3.5 bg-white rounded-2xs"></div>
                </div>
              </div>
            </div>

            {/* MAIN MOBILE SCREEN VIEWPORT */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0A0D14] text-slate-100">
              
              {/* STAGE A: WELCOME SPLASH GATEWAY (supplied mobile mockup plus transparent hotspots) */}
              {mobileAuthStep === "welcome" && (
                <div className="relative flex-1 overflow-hidden animate-fade-in bg-[#0A0D14]">
                  <img
                    src={mobileLoginBg}
                    alt="Мобильный экран входа Эхогор"
                    className="absolute inset-0 h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />

                  <button
                    type="button"
                    aria-label="Войти"
                    onClick={() => {
                      setMobileAuthStep("login");
                      addAuditLog("Авторизация", "Ученик открыл экран ввода номера телефона на мобилке");
                    }}
                    onPointerDown={primeLoginVideoAudio}
                    className="absolute left-[8.2%] top-[77.6%] h-[5.1%] w-[83.6%] rounded-[24px] appearance-none bg-transparent border-0 outline-none focus:ring-2 focus:ring-white/80 active:bg-white/5"
                  />
                  <button
                    type="button"
                    aria-label="Регистрация"
                    onClick={() => {
                      setMobileAuthStep("login");
                    }}
                    className="absolute left-[8.2%] top-[83.7%] h-[5.0%] w-[83.6%] rounded-[22px] appearance-none bg-transparent border-0 outline-none focus:ring-2 focus:ring-[#C5A059]/80 active:bg-white/5"
                  />
                  <button
                    type="button"
                    aria-label="Войти через Google"
                    onClick={() => {
                      setIsLoggingInWithGoogle(true);
                    }}
                    className="absolute left-[8.2%] top-[92.5%] h-[5.0%] w-[83.6%] rounded-[22px] appearance-none bg-transparent border-0 outline-none focus:ring-2 focus:ring-white/80 active:bg-white/5"
                  />
                </div>
              )}

              {/* Old assembled mobile welcome kept disabled while the supplied mockup drives the visible UI. */}
              {false && mobileAuthStep === "welcome" && (
                <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden animate-fade-in bg-gradient-to-b from-[#141d26] to-[#0A0D14]">
                  
                  {/* Glowing diagonal streak background decorative vectors */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-60"></div>
                    {/* Golden luxury motion line indicators */}
                    <div className="absolute top-10 right-10 w-[2px] h-[300px] bg-gradient-to-b from-[#C5A059]/30 to-transparent rotate-[35deg] transform origin-top"></div>
                    <div className="absolute top-24 right-24 w-[1px] h-[250px] bg-gradient-to-b from-[#C5A059]/20 to-transparent rotate-[35deg] transform origin-top"></div>
                    <div className="absolute top-5 right-36 w-[1.5px] h-[200px] bg-gradient-to-b from-white/10 to-transparent rotate-[35deg] transform origin-top"></div>
                  </div>

                  {/* 1. Brand Logo Block at top */}
                  <div className="relative z-10 flex flex-col items-center mt-4">
                    {/* Glowing mountain peak logo graphic styled manually matching design */}
                    <div className="flex flex-col items-center">
                      <h1 className="text-4xl font-black text-white tracking-[0.16em] uppercase select-none font-sans drop-shadow-[0_5px_15px_rgba(255,255,255,0.05)] leading-none text-center">
                        ЭХО<span className="text-white">ГОР</span>
                      </h1>
                      
                      {/* Mount Peaks Graphic underneath the name */}
                      <svg viewBox="0 0 160 30" className="w-36 h-8 text-[#99764d] fill-current" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="10,25 45,10 70,18 105,5 150,25" />
                        {/* Peak Snow cap highlights */}
                        <polygon points="35,14 45,10 50,15 45,17" fill="#fff" />
                        <polygon points="95,9 105,5 112,11 105,12" fill="#fff" />
                        <line x1="0" y1="26" x2="160" y2="26" stroke="#99764d" strokeWidth="2" />
                      </svg>

                      <p className="text-[9px] text-[#C5A059] uppercase tracking-[0.38em] font-bold text-center leading-normal mt-1">
                        СТУДИЯ КАВКАЗСКОГО ТАНЦА
                      </p>
                    </div>
                  </div>

                  {/* 2. Beautiful Portrait of Choregraphed Coach in the custom mountains container */}
                  <div className="relative z-10 flex-1 flex items-center justify-center -my-4">
                    <div className="relative w-full max-w-[280px] h-[340px] flex items-center justify-center">
                       {/* Mount peak graphics framing him back inside */}
                       <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141d26]/40 to-[#0A0D14] z-10 rounded-b-3xl"></div>
                       <img
                         src={trainerLoginImg}
                         alt="Элегантный учитель Эхогор"
                         className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-0"
                         referrerPolicy="no-referrer"
                       />
                       {/* Golden custom crest lines matching app theme */}
                       <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-32 h-[1.5px] bg-[#C5A059]/40 z-20"></div>
                       {/* Floating glowing particle effect */}
                       <div className="absolute top-20 left-10 w-1.5 h-1.5 rounded-full bg-[#C5A059] opacity-40 blur-[1px] animate-pulse"></div>
                       <div className="absolute top-1/2 right-6 w-1 h-1 rounded-full bg-white opacity-30 blur-[0.5px] animate-ping"></div>
                    </div>
                  </div>

                  {/* 3. Text & Interaction Buttons Section */}
                  <div className="relative z-10 space-y-5 text-center px-2 mb-4">
                    <div className="space-y-1.5">
                      <h2 className="text-white text-lg font-bold tracking-normal uppercase leading-tight font-sans">
                        ТАHЕЦ. <span className="text-[#9C784D]">ТРАДИЦИЯ.</span> ГОРДОСТЬ.
                      </h2>
                      <p className="text-[11px] text-slate-400 font-sans tracking-tight">
                        Добро пожаловать в студию кавказского танца
                      </p>
                    </div>

                    {/* Button Pack matching perfectly */}
                    <div className="space-y-3 pt-2">
                      <button
                        onClick={() => {
                          setMobileAuthStep("login");
                          addAuditLog("Авторизация", "Ученик открыл экран ввода номера телефона на мобилке");
                        }}
                        className="w-full h-11 bg-[#9C784D] hover:bg-[#b0885a] rounded-xl flex items-center justify-center gap-2 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(156,120,77,0.3)] active:scale-95 outline-none cursor-pointer"
                      >
                        <span>Войти</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setMobileAuthStep("login");
                        }}
                        className="w-full h-11 border border-[#9C784D]/40 hover:bg-white/[0.03] rounded-xl flex items-center justify-center text-slate-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 outline-none cursor-pointer"
                      >
                        Регистрация
                      </button>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-[1px] bg-white/10" />
                        <span className="text-[9px] text-slate-500 uppercase font-black">или</span>
                        <div className="flex-1 h-[1px] bg-white/10" />
                      </div>

                      {/* Google Button */}
                      <button
                        onClick={() => {
                          // Directly show google bypass chooser modal
                          setIsLoggingInWithGoogle(true);
                        }}
                        className="w-full h-11 bg-[#141a24] hover:bg-[#1b2331] text-white font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2.5 border border-white/5 transition-all outline-none cursor-pointer"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18 v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66-.78-1.01-1.68-1.01-2.72z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        Войти через Google
                      </button>
                    </div>

                  </div>

                </div>
              )}

              {/* STAGE B: PHONE INPUT VIEW */}
              {mobileAuthStep === "login" && (
                <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in">
                  <div className="space-y-6">
                    {/* Header back button */}
                    <button
                      onClick={() => setMobileAuthStep("welcome")}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 uppercase font-extrabold tracking-wider cursor-pointer"
                    >
                      <span>← Назад</span>
                    </button>

                    <div className="space-y-2 mt-4">
                      <span className="text-[10px] text-[#C5A059] font-extrabold uppercase tracking-widest block font-mono">Авторизация по SMS</span>
                      <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Введите номер телефона</h2>
                      <p className="text-xs text-slate-400 font-sans">Мы отправим вам код подтверждения входа через SMS</p>
                    </div>

                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-black block mb-1.5 tracking-wider">Введите Телефон контакта</label>
                        <input
                          type="tel"
                          value={mobilePhone}
                          onChange={(e) => setMobilePhone(e.target.value)}
                          placeholder="+7 (928) 123-45-67"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#C5A059] font-mono"
                        />
                      </div>

                      {/* Demo picker helpers */}
                      <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-2">
                        <p className="text-[9px] text-[#C5A059] font-extrabold uppercase tracking-wide">Демо-аккаунты учеников из сети:</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {students.slice(0, 4).map(st => (
                            <button
                              key={st.id}
                              onClick={() => {
                                setMobilePhone(st.parentPhone);
                                addAuditLog("Автозаполнение", `Выбран ученик: ${st.name}`);
                              }}
                              className="text-[10px] p-2 rounded bg-black/30 text-slate-300 hover:text-white hover:bg-[#C5A059]/10 border border-white/5 text-left truncate font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Users className="w-3 h-3 text-[#C5A059]" />
                              <span>{st.name.split(" ")[0]} ({st.parentPhone.slice(-4)})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        if (!mobilePhone) {
                          // Default to first student's phone
                          setMobilePhone(students[0].parentPhone);
                        }
                        setMobileAuthStep("otp");
                        setMobileSms("");
                      }}
                      className="w-full h-11 bg-[#C5A059] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 outline-none cursor-pointer"
                    >
                      Получить код
                    </button>
                    <p className="text-[9px] text-slate-500 text-center font-sans">
                      Нажимая кнопку, Вы соглашаетесь на получение SMS-уведомлений
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE C: OTP SMS CONFIRMATION CODE */}
              {mobileAuthStep === "otp" && (
                <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in">
                  <div className="space-y-6">
                    <button
                      onClick={() => setMobileAuthStep("login")}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 uppercase font-extrabold tracking-wider cursor-pointer"
                    >
                      <span>← Изменить номер</span>
                    </button>

                    <div className="space-y-2 mt-4">
                      <span className="text-[10px] text-[#C5A059] font-extrabold uppercase tracking-widest block font-mono">Проверка шлюза оповещений</span>
                      <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Код отправлен!</h2>
                      <p className="text-xs text-slate-400 font-sans">Мы отправили код подтверждения на номер <span className="text-white font-bold font-mono">{mobilePhone}</span></p>
                    </div>

                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Код из СМС (попробуйте 2026)</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={mobileSms}
                          onChange={(e) => setMobileSms(e.target.value)}
                          placeholder="••••"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg text-center font-black tracking-[0.6em] text-white focus:outline-none focus:border-[#C5A059] font-mono"
                        />
                      </div>

                      <div className="text-center pt-2">
                        <button
                          onClick={() => {
                            setMobileSms("2026");
                          }}
                          className="text-[10px] text-[#C5A059] underline tracking-widest uppercase font-extrabold cursor-pointer"
                        >
                          Подставить рабочий демо-код (2026)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        // Match student parentPhone
                        const matched = students.find(s => s.parentPhone.replace(/\D/g, '').includes(mobilePhone.replace(/\D/g, ''))) || students[0];
                        setMobileLoggedInUser(matched);
                        setMobileActiveTab("home");
                        addAuditLog("Авторизация", `Ученик ${matched.name} успешно вошел в мобильную версию`);
                        startLoginVideo("mobile");
                      }}
                      onPointerDown={primeLoginVideoAudio}
                      className="w-full h-11 bg-[#C5A059] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 outline-none cursor-pointer"
                    >
                      Подтвердить вход
                    </button>
                    <p className="text-[9px] text-slate-500 text-center font-sans">
                      Не пришел код? Отправить повторно можно будет через 59 сек
                    </p>
                  </div>
                </div>
              )}

              {/* STAGE D: MAIN MOBILE DASHBOARD CONTEXT */}
              {mobileAuthStep === "main" && mobileLoggedInUser && (
                <div className="flex-1 flex flex-col justify-between relative overflow-hidden animate-fade-in bg-[#080d14]">
                  
                  {/* Internal Mobile Top Scrollable viewport */}
                  <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
                    
                    {/* Welcome message with quick logout */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#9C784D] to-amber-500 flex items-center justify-center text-xs font-black text-black">
                          {mobileLoggedInUser.name[0]}
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold">Мой кабинет</p>
                          <h4 className="text-xs font-bold text-white tracking-tight">{mobileLoggedInUser.name}</h4>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setMobileAuthStep("welcome");
                          setMobileLoggedInUser(null);
                        }}
                        className="text-[9px] bg-white/5 border border-white/5 hover:bg-red-500/10 hover:text-red-400 px-2 py-1 rounded text-slate-400 transition-all font-bold uppercase cursor-pointer"
                      >
                        Выйти
                      </button>
                    </div>

                    {/* TAB CONTENT: HOME */}
                    {mobileActiveTab === "home" && (
                      <div className="space-y-4 animate-fade-in">
                        
                        {/* 1. FLIPPABLE DIGITAL PASS QR CARD */}
                        <div 
                          onClick={() => setFlippedQr(!flippedQr)}
                          className="bg-gradient-to-br from-[#111e2f] via-[#090f19] to-[#040810] rounded-3xl p-5 border border-white/10 shadow-xl cursor-pointer relative overflow-hidden transition-all duration-500 h-[175px] group select-none hover:border-[#C5A059]/30"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 blur-[40px] -mr-10 -mt-10 pointer-events-none" />
                          
                          {!flippedQr ? (
                            <div className="space-y-4 flex flex-col justify-between h-full">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <span className="text-[8px] text-[#C5A059] uppercase tracking-widest font-extrabold font-mono">ЭЛЕКТРОННЫЙ ПРОПУСК СЕТИ</span>
                                    <h4 className="text-sm font-sans font-black text-white uppercase mt-0.5 tracking-tight">Семейный ID-пропуск</h4>
                                 </div>
                                 <div className="bg-[#C5A059]/10 p-2 rounded-xl border border-[#C5A059]/20">
                                   <QrCode className="w-5 h-5 text-[#C5A059]" />
                                 </div>
                              </div>
                              
                              <div className="flex justify-between items-end border-t border-white/5 pt-3">
                                 <div>
                                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">ГРУППОВОЙ АБОНЕМЕНТ</p>
                                    <p className="text-xs font-black text-emerald-400">Активен (8 из 12 занятий)</p>
                                 </div>
                                 <span className="text-[9px] text-[#C5A059] font-mono border border-[#C5A059]/20 px-2 py-1 rounded-lg bg-[#C5A059]/5 animate-pulse font-extrabold">ПОКАЗАТЬ QR</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full space-y-2 animate-fade-in">
                              <div className="w-20 h-20 bg-white p-1 rounded-lg border-2 border-[#C5A059]">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                                  <rect x="0" y="0" width="22" height="22" fill="black" />
                                  <rect x="4" y="4" width="14" height="14" fill="white" />
                                  <rect x="7" y="7" width="8" height="8" fill="black" />
                                  
                                  <rect x="78" y="0" width="22" height="22" fill="black" />
                                  <rect x="82" y="4" width="14" height="14" fill="white" />
                                  <rect x="85" y="7" width="8" height="8" fill="black" />
                                  
                                  <rect x="0" y="78" width="22" height="22" fill="black" />
                                  <rect x="4" y="82" width="14" height="14" fill="white" />
                                  <rect x="7" y="85" width="8" height="8" fill="black" />
                                  
                                  <rect x="30" y="5" width="10" height="10" fill="black" />
                                  <rect x="50" y="15" width="20" height="8" fill="black" />
                                  <rect x="35" y="35" width="25" height="25" fill="black" />
                                  <rect x="15" y="45" width="10" height="20" fill="black" />
                                  <rect x="70" y="42" width="15" height="10" fill="black" />
                                  <rect x="75" y="65" width="15" height="15" fill="black" />
                                  <rect x="45" y="72" width="12" height="18" fill="black" />
                                </svg>
                              </div>
                              <p className="text-[8px] text-[#C5A059] uppercase font-mono font-extrabold tracking-widest text-center animate-pulse">Сканер Стойки Регистрации</p>
                            </div>
                          )}
                        </div>

                        {/* 2. NEXT LESSON CARD */}
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                          <h5 className="text-[9px] text-[#C5A059] uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                             <Clock className="w-3.5 h-3.5" />
                             Следующая репетиция
                          </h5>
                          
                          <div className="space-y-2">
                             <div className="flex justify-between items-start">
                                <div>
                                   <p className="text-xs font-extrabold text-white">Ансамбль «Вайнах»</p>
                                   <p className="text-[10px] text-slate-400 mt-0.5">Владение трюками и прыжками на коленях</p>
                                </div>
                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded">СЕГОДНЯ</span>
                             </div>

                             <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono text-slate-400">
                                <div className="bg-black/30 p-2 rounded-lg flex items-center gap-1">
                                   <Calendar className="w-3 h-3 text-[#C5A059]" />
                                   <span>19:00 - 20:30</span>
                                </div>
                                <div className="bg-black/30 p-2 rounded-lg flex items-center gap-1">
                                   <MapPin className="w-3 h-3 text-[#C5A059]" />
                                   <span className="truncate">Зал Эльбрус</span>
                                </div>
                             </div>
                          </div>
                        </div>

                        {/* 3. HOMEWORK FROM DANCER INSTRUCTOR */}
                        <div className="bg-amber-500/5 p-4 rounded-xl border border-[#C5A059]/20 space-y-2 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-1 bg-[#C5A059]/10 text-[#C5A059] rounded-bl text-[8px] font-mono tracking-tighter uppercase font-bold">ЗАДАНИЕ</div>
                           <h5 className="text-[9px] text-[#C5A059] uppercase tracking-widest font-extrabold">Указание художественного руководителя:</h5>
                           <p className="text-[11px] text-slate-300 leading-relaxed italic">
                             "К следующему зачету закрепить поворот плеч «бештовка» и плавность движений в женском выходе. Будем проверять каждого индивидуально."
                           </p>
                        </div>

                      </div>
                    )}

                    {/* TAB CONTENT: SCHEDULE */}
                    {mobileActiveTab === "schedule" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-1">
                          <h3 className="text-sm font-extrabold text-white tracking-tight">Расписание занятий</h3>
                          <p className="text-[10px] text-slate-400">Расписание репетиций на текущую учебную неделю</p>
                        </div>

                        <div className="space-y-2.5">
                          {[
                            { day: "Понедельник", time: "19:00", subject: "Художественная осанка и выход", room: "Зал Казбек", check: true, recruited: false },
                            { day: "Среда", time: "19:00", subject: "Трюковая база кавказского танца", room: "Зал Эльбрус", check: true, recruited: false },
                            { day: "Пятница", time: "18:30", subject: "Групповая синхронность ансамбля", room: "Зал Машук", check: false, recruited: true },
                            { day: "Суббота", time: "12:00", subject: "Индивидуальный зачет по ритмике", room: "Малый залец", check: false, recruited: true },
                          ].map((sch, sIdx) => (
                            <div key={sIdx} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-normal">{sch.day}</span>
                                  <span className="text-[9px] text-slate-500 font-mono font-bold">({sch.time})</span>
                                </div>
                                <p className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                                  <span 
                                    className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                                      sch.recruited ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                    }`}
                                    title={sch.recruited ? 'Группа набрана' : 'Группа не доукомплектована'}
                                  />
                                  {sch.subject}
                                </p>
                                <p className="text-[9px] text-slate-500 font-mono italic">🏢 {sch.room}</p>
                              </div>
                              <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                sch.check ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                              }`}>
                                {sch.check ? "Проведено" : "Ожидает"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT: PROFILE */}
                    {mobileActiveTab === "profile" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-1">
                          <h3 className="text-sm font-extrabold text-white tracking-tight">Электронный паспорт</h3>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[#C5A059]/30 bg-black/40 shadow-xl shadow-black/30">
                          <div className="relative aspect-[4/5] bg-[#05090B]">
                            <img
                              src={studentArtistCard}
                              alt="Карта ученика: путь танцора"
                              className="h-full w-full object-cover object-top"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent p-4">
                              <p className="text-[8px] font-black uppercase tracking-[0.26em] text-[#C5A059]">Карта ученика</p>
                              <h4 className="mt-1 text-lg font-black text-white">Путь танцора</h4>
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-2 text-center">
                                  <p className="text-sm font-black text-white">{mobileLoggedInUser.artistLevelPoints || 0}</p>
                                  <p className="mt-0.5 text-[7px] font-bold uppercase tracking-wider text-slate-400">очков</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-2 text-center">
                                  <p className="text-sm font-black text-white">{mobileLoggedInUser.achievements?.length || 0}</p>
                                  <p className="mt-0.5 text-[7px] font-bold uppercase tracking-wider text-slate-400">наград</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-2 text-center">
                                  <p className="text-sm font-black text-[#C5A059]">{mobileLoggedInUser.performances?.length || 0}</p>
                                  <p className="mt-0.5 text-[7px] font-bold uppercase tracking-wider text-slate-400">сцен</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Profile Meta Info Row */}
                        <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-2 text-xs">
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-500">Номер пропуска:</span>
                            <span className="text-white font-mono font-bold">EG-88402</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-500">Возрастная группа:</span>
                            <span className="text-[#C5A059] font-bold">Молодежная группа</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-500">Уровень навыков:</span>
                            <span className="text-white font-bold">{mobileLoggedInUser.level}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-slate-500">Дата поступления:</span>
                            <span className="text-white font-mono font-bold">14.12.2024</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-400 font-bold">Преподаватель:</span>
                            <span className="text-white font-extrabold">Мурат Плиев</span>
                          </div>
                        </div>

                        {/* Visual Achievements section */}
                        <div className="space-y-2">
                           <h4 className="text-[10px] text-[#C5A059] uppercase tracking-widest font-extrabold">Мои достижения и награды:</h4>
                           <div className="grid grid-cols-2 gap-2">
                             <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-3 rounded-lg border border-yellow-500/20 text-center space-y-1">
                               <p className="text-lg">🏆</p>
                               <p className="text-[9px] font-extrabold text-white uppercase">Кубок Горного Кавказа</p>
                               <p className="text-[8px] text-slate-400 font-mono">1 место (Грозный, 2025)</p>
                             </div>
                             <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-3 rounded-lg border border-white/5 text-center space-y-1">
                               <p className="text-lg">🎖️</p>
                               <p className="text-[9px] font-extrabold text-white uppercase">Папаха мастерства</p>
                               <p className="text-[8px] text-slate-400 font-mono">Отличие за трюки (2026)</p>
                             </div>
                           </div>
                        </div>

                        {/* Balance Stats */}
                        <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 text-center">
                          <p className="text-[9px] text-[#C5A059] uppercase tracking-widest font-black">Финансовый баланс</p>
                          <p className="text-sm font-mono font-black text-white mt-1">Оплачено до: 15.06.2026</p>
                          <p className="text-[9px] text-emerald-400 mt-1 font-bold">Задолженностей по абонементу нет</p>
                        </div>

                      </div>
                    )}

                  </div>

                  {/* Dynamic Mobile Bottom Bar */}
                  <div className="h-14 bg-[#05080c] border-t border-white/5 px-6 flex justify-between items-center z-40 relative">
                    {[
                      { id: "home", label: "Главная" },
                      { id: "schedule", label: "Расписание" },
                      { id: "profile", label: "Кабинет" }
                    ].map(tb => (
                      <button
                        key={tb.id}
                        onClick={() => setMobileActiveTab(tb.id)}
                        className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          mobileActiveTab === tb.id ? 'text-[#C5A059]' : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        <div className={`p-1 rounded-full transition-all ${
                          mobileActiveTab === tb.id ? 'bg-[#C5A059]/10' : ''
                        }`}>
                          {tb.id === "home" && <Globe className="w-4.5 h-4.5" />}
                          {tb.id === "schedule" && <Calendar className="w-4.5 h-4.5" />}
                          {tb.id === "profile" && <User className="w-4.5 h-4.5" />}
                        </div>
                        <span className="text-[9px] font-bold tracking-tight uppercase">{tb.label}</span>
                      </button>
                    ))}
                  </div>

                </div>
              )}

            </div>

          </div>

          {/* Interactive bypass picker modal for Google Login selection */}
          {isLoggingInWithGoogle && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[999999] p-4">
              <div className="bg-[#12141c] rounded-3xl border border-[#C5A059]/40 p-6 max-w-sm w-full space-y-4 shadow-3xl text-center">
                 <h4 className="text-sm font-bold text-white uppercase tracking-wider">Вход через аккаунт Google</h4>
                 <p className="text-xs text-slate-400">Выберите учетную запись для входа в кабинет студии:</p>

                 <div className="space-y-2 pt-2 text-left">
                   {students.slice(0, 4).map(st => (
                     <button
                       key={st.id}
                       onClick={() => {
                         setMobileLoggedInUser(st);
                         setMobileAuthStep("main");
                         setMobileActiveTab("home");
                         setIsLoggingInWithGoogle(false);
                         addAuditLog("Авторизация Google", `Выбран Google-аккаунт ученика: ${st.name}`);
                       }}
                       className="w-full p-3 bg-white/5 hover:bg-[#C5A059]/10 border border-white/5 rounded-xl flex items-center justify-between text-xs text-white transition-all hover:border-[#C5A059]/30 cursor-pointer"
                     >
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[#C5A059]">{st.name[0]}</div>
                         <div className="truncate">
                           <p className="font-bold">{st.name}</p>
                           <p className="text-[9px] text-slate-500 font-mono leading-none">{st.parentPhone}</p>
                         </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-500" />
                     </button>
                   ))}
                 </div>

                 <button
                   onClick={() => setIsLoggingInWithGoogle(false)}
                   className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-slate-400 hover:text-white uppercase font-bold cursor-pointer"
                 >
                   Отменить
                 </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ИИ-помощник «Магомед» — только в рабочих кабинетах после входа */}
      {!isPlayingPromo &&
        ["owner", "branch", "admin", "teacher"].includes(activeRole) && (
          <MagomedAssistant
            roleHeader={getMvpRoleHeader()}
            roleLabel={roles.find((r) => r.id === activeRole)?.name}
          />
        )}

    </div>
  );
}

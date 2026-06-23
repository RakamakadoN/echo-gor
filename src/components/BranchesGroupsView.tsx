/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Раздел «Филиалы и группы» (ТЗ от 23 июня).
 * Три вкладки: Филиалы · Группы · Залы.
 * Каждая со сворачиваемым дашбордом (состояние запоминается в localStorage),
 * таблицей, модалками создания/редактирования и карточками-деталями.
 */
import { useMemo, useState } from "react";
import {
  Building2, Users, UserCog, DoorOpen, CalendarDays, Plus, Pencil, Trash2, X,
  Eye, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Coins, Percent,
  Sparkles, MapPin, Clock, Layers,
} from "lucide-react";
import type { Branch, Group, Student, Teacher, Payment } from "../types";

/* ─────────────────────────── helpers ─────────────────────────── */

const money = (value: number) =>
  `${Math.round(value || 0).toLocaleString("ru-RU")} ₸`;

const isActiveStudent = (s: Student) =>
  !["left", "archived"].includes(String(s.status || "active"));

const hasActiveSub = (s: Student) =>
  (s.subscriptions || []).some((sub) => sub.status === "active");

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
const LEVELS_DEFAULT = ["Начинающая", "Продолжающая", "Ансамбль", "Индивидуальная", "Мини-группа", "Другое"];

type AiRating = { grade: string; label: string; tone: string; ring: string; note: string };

// ТЗ §2.8 — общая оценка филиала/группы по заполненности и удержанию.
function aiRating(fill: number, retention: number, freeSeats: number, revenue: number): AiRating {
  const score = fill * 0.5 + retention * 0.5;
  let grade = "D", label = "Риск", tone = "text-rose-400", ring = "border-rose-500/40 text-rose-400";
  if (score >= 85) { grade = "A"; label = "Отлично"; tone = "text-emerald-400"; ring = "border-emerald-500/40 text-emerald-400"; }
  else if (score >= 70) { grade = "B"; label = "Стабильно"; tone = "text-[#C5A059]"; ring = "border-[#C5A059]/50 text-[#C5A059]"; }
  else if (score >= 50) { grade = "C"; label = "Требует внимания"; tone = "text-amber-400"; ring = "border-amber-400/40 text-amber-400"; }

  const bits: string[] = [];
  if (revenue > 0) bits.push(retention >= 75 ? "стабильную выручку и хорошее удержание" : "выручку, но удержание ниже нормы");
  else bits.push("выручка ещё не набрана");
  if (freeSeats > 0) bits.push(`есть ${freeSeats} свободных мест`);
  else bits.push("мест почти не осталось");
  const note = `Показывает ${bits[0]}; ${bits[1]}.`;
  return { grade, label, tone, ring, note };
}

const round = (n: number) => Math.round(n);

/* ─────────────────────────── small UI ─────────────────────────── */

function FillBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-[#C5A059]" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right text-xs font-bold text-white">{round(pct)}%</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  if (!value) return <span className="text-[11px] text-slate-500">—</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function AiBadge({ rating }: { rating: AiRating }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black ${rating.ring}`}>{rating.grade}</span>
      <span className={`text-xs font-bold ${rating.tone}`}>{rating.label}</span>
    </div>
  );
}

function DashCard({ icon: Icon, label, value, sub, delta, accent }: {
  icon: any; label: string; value: string; sub?: string; delta?: number; accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121212] p-4">
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent || "bg-[#C5A059]/15 text-[#C5A059]"}`}>
          <Icon className="h-4 w-4" />
        </span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function CollapsibleDash({ title, subtitle, storageKey, children }: {
  title: string; subtitle: string; storageKey: string; children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };
  return (
    <section className="mb-6 rounded-[2rem] border border-white/10 bg-[#0F0F0F] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black text-white">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <button onClick={toggle} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-[#C5A059]/40 hover:text-[#C5A059]">
          {collapsed ? <>Развернуть <ChevronDown className="h-4 w-4" /></> : <>Свернуть <ChevronUp className="h-4 w-4" /></>}
        </button>
      </div>
      {!collapsed && <div className="mt-5">{children}</div>}
    </section>
  );
}

const inputCls = "mt-1 w-full rounded-xl border border-white/10 bg-[#0C0C0C] px-3 py-2 text-sm text-white outline-none focus:border-[#C5A059]/50";
const kic = "text-[11px] font-bold uppercase tracking-wider text-slate-500";

/* ─────────────────────────── props ─────────────────────────── */

interface Props {
  branches: any[];          // branchScorecards (метрики)
  rawBranches: Branch[];
  students: Student[];
  groups: Group[];
  teachers: Teacher[];
  halls: any[];
  payments?: Payment[];
  onCreateBranch?: (data: any) => Promise<boolean>;
  onUpdateBranch?: (id: string, data: any) => Promise<boolean>;
  onDeleteBranch?: (id: string) => Promise<boolean>;
  onCreateGroup?: (data: any) => Promise<boolean>;
  onUpdateGroup?: (id: string, data: any) => Promise<boolean>;
  onDeleteGroup?: (id: string) => Promise<boolean>;
  onCreateHall?: (data: any) => Promise<boolean>;
  onUpdateHall?: (id: string, data: any) => Promise<boolean>;
  onDeleteHall?: (id: string) => Promise<boolean>;
  onOpenStudents?: (preset: any) => void;
}

type Tab = "branches" | "groups" | "halls";

/* ─────────────────────────── root ─────────────────────────── */

export function BranchesGroupsView(props: Props) {
  const [tab, setTab] = useState<Tab>("branches");
  const canManage = Boolean(props.onCreateBranch || props.onCreateGroup);

  // ── Производные метрики на филиал ──────────────────────────────────────────
  const avgSubPrice = useMemo(() => {
    const prices: number[] = [];
    props.students.forEach((s) => (s.subscriptions || []).forEach((sub) => { if (sub.price) prices.push(sub.price); }));
    return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 4500;
  }, [props.students]);

  const branchData = useMemo(() => {
    const networkRetention = props.branches.length
      ? props.branches.reduce((a, b) => a + (b.retention || 0), 0) / props.branches.length
      : 0;
    return props.rawBranches.map((b) => {
      const score = props.branches.find((x) => x.branchId === b.id) || {};
      const grps = props.groups.filter((g) => g.branchId === b.id);
      const capacity = grps.reduce((sum, g) => sum + (g.capacity || 0), 0);
      const active = props.students.filter((s) => s.branchId === b.id && isActiveStudent(s)).length;
      const freeSeats = Math.max(0, capacity - active);
      const teachersCount = new Set(grps.map((g) => g.teacherId).filter(Boolean)).size;
      const fill = capacity > 0 ? (active / capacity) * 100 : 0;
      const retention = score.retention ?? 0;
      const revenue = score.revenue ?? 0;
      const potential = capacity * avgSubPrice;
      const rating = aiRating(fill, retention, freeSeats, revenue);
      return {
        raw: b, capacity, active, freeSeats, teachersCount, fill, retention, revenue, potential, rating,
        groupsCount: grps.length,
        retentionDelta: round((retention - networkRetention) * 10) / 10,
      };
    });
  }, [props.rawBranches, props.branches, props.groups, props.students, avgSubPrice]);

  // ── Производные метрики на группу ──────────────────────────────────────────
  const groupData = useMemo(() => {
    return props.groups.map((g) => {
      const inGroup = props.students.filter((s) => (s.groupIds || []).includes(g.id));
      const active = inGroup.filter(isActiveStudent).length;
      const capacity = g.capacity || 0;
      const freeSeats = Math.max(0, capacity - active);
      const fill = capacity > 0 ? (active / capacity) * 100 : 0;
      const retention = inGroup.length ? round((inGroup.filter(hasActiveSub).length / inGroup.length) * 100) : 0;
      return { g, inGroup, active, capacity, freeSeats, fill, retention };
    });
  }, [props.groups, props.students]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "branches", label: "Филиалы", icon: Building2 },
    { id: "groups", label: "Группы", icon: Users },
    { id: "halls", label: "Залы", icon: DoorOpen },
  ];

  return (
    <div className="min-h-full">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Филиалы и группы</h1>
          <p className="text-sm text-slate-500">Структура сети: филиалы, группы, педагоги, залы, расписание и загрузка.</p>
        </div>
      </div>

      {/* Вкладки */}
      <div className="my-5 inline-flex rounded-2xl border border-white/10 bg-[#121212] p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${tab === t.id ? "bg-[#C5A059] text-black" : "text-slate-400 hover:text-white"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "branches" && (
        <BranchesTab data={branchData} avgSubPrice={avgSubPrice} canManage={canManage}
          allTeachers={props.teachers}
          onCreate={props.onCreateBranch} onUpdate={props.onUpdateBranch} onDelete={props.onDeleteBranch}
          onOpenStudents={props.onOpenStudents}
          students={props.students} groups={props.groups} teachers={props.teachers} halls={props.halls} />
      )}
      {tab === "groups" && (
        <GroupsTab groupData={groupData} canManage={canManage}
          rawBranches={props.rawBranches} teachers={props.teachers} halls={props.halls} students={props.students}
          onCreate={props.onCreateGroup} onUpdate={props.onUpdateGroup} onDelete={props.onDeleteGroup}
          onOpenStudents={props.onOpenStudents} />
      )}
      {tab === "halls" && (
        <HallsTab halls={props.halls} rawBranches={props.rawBranches} groups={props.groups} canManage={Boolean(props.onCreateHall)}
          onCreate={props.onCreateHall} onUpdate={props.onUpdateHall} onDelete={props.onDeleteHall} />
      )}
    </div>
  );
}

/* ═══════════════════════════ ФИЛИАЛЫ ═══════════════════════════ */

function BranchesTab({ data, avgSubPrice, canManage, onCreate, onUpdate, onDelete, onOpenStudents, students, groups, teachers, halls }: any) {
  const [modal, setModal] = useState<{ mode: "add" | "edit"; id?: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Сводный дашборд по сети
  const totCapacity = data.reduce((a: number, d: any) => a + d.capacity, 0);
  const totActive = data.reduce((a: number, d: any) => a + d.active, 0);
  const totFree = data.reduce((a: number, d: any) => a + d.freeSeats, 0);
  const totTeachers = new Set(groups.map((g: Group) => g.teacherId).filter(Boolean)).size;
  const totRevenue = data.reduce((a: number, d: any) => a + d.revenue, 0);
  const totPotential = data.reduce((a: number, d: any) => a + d.potential, 0);
  const netFill = totCapacity ? (totActive / totCapacity) * 100 : 0;
  const netRetention = data.length ? data.reduce((a: number, d: any) => a + d.retention, 0) / data.length : 0;
  const netRating = aiRating(netFill, netRetention, totFree, totRevenue);
  const occupiedPct = totCapacity ? round((totActive / totCapacity) * 100) : 0;

  return (
    <div>
      <CollapsibleDash title="Дашборд филиалов" subtitle="Основные показатели по всем филиалам" storageKey="echogor.dash.branches">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <DashCard icon={DoorOpen} label="Свободные места" value={String(totFree)} sub={`из ${totCapacity}`} accent="bg-emerald-500/15 text-emerald-400" />
          <DashCard icon={Users} label="Действующие ученики" value={String(totActive)} sub={`${occupiedPct}% занятости`} accent="bg-sky-500/15 text-sky-400" />
          <DashCard icon={UserCog} label="Педагогов" value={String(totTeachers)} sub="человек" accent="bg-violet-500/15 text-violet-400" />
          <DashCard icon={Percent} label="Заполненность" value={`${round(netFill)}%`} accent="bg-[#C5A059]/15 text-[#C5A059]" />
          <DashCard icon={TrendingUp} label="Удержание (тек. мес.)" value={`${round(netRetention)}%`} accent="bg-emerald-500/15 text-emerald-400" />
          <DashCard icon={Coins} label="Выручка (тек. мес.)" value={money(totRevenue)} accent="bg-[#C5A059]/15 text-[#C5A059]" />
          <DashCard icon={Sparkles} label="Потенциальная выручка" value={money(totPotential)} sub="при 100% заполненности" accent="bg-amber-500/15 text-amber-400" />
          <div className="rounded-2xl border border-white/10 bg-[#121212] p-4">
            <p className={kic}>Оценка сети (AI)</p>
            <div className="mt-3"><AiBadge rating={netRating} /></div>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">{netRating.note}</p>
          </div>
        </div>
      </CollapsibleDash>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-white">Список филиалов <span className="text-slate-500">({data.length})</span></p>
        {canManage && (
          <button onClick={() => setModal({ mode: "add" })} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
            <Plus className="h-4 w-4" /> Добавить филиал
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-[#0F0F0F]">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-3">№</th>
              <th className="p-3">Филиал</th>
              <th className="p-3">Своб. места</th>
              <th className="p-3">Ученики</th>
              <th className="p-3">Педагоги</th>
              <th className="p-3 w-40">Заполненность</th>
              <th className="p-3">Удержание</th>
              <th className="p-3">Выручка</th>
              <th className="p-3">Потенциал</th>
              <th className="p-3">AI-оценка</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d: any, i: number) => (
              <tr key={d.raw.id} className="border-b border-white/5 text-slate-300 transition hover:bg-white/[0.02]">
                <td className="p-3 text-slate-500">{i + 1}</td>
                <td className="p-3">
                  <p className="font-bold text-white">{d.raw.name}</p>
                  <p className="text-xs text-slate-500">{d.raw.city} · {d.raw.managerName}</p>
                </td>
                <td className="p-3"><span className="font-bold text-white">{d.freeSeats}</span> <span className="text-xs text-slate-500">из {d.capacity}</span></td>
                <td className="p-3 font-bold text-white">{d.active}</td>
                <td className="p-3">{d.teachersCount}</td>
                <td className="p-3"><FillBar pct={d.fill} /></td>
                <td className="p-3"><span className="font-bold text-white">{round(d.retention)}%</span> <Delta value={d.retentionDelta} /></td>
                <td className="p-3 font-bold text-white">{money(d.revenue)}</td>
                <td className="p-3 text-slate-400">{money(d.potential)}</td>
                <td className="p-3"><AiBadge rating={d.rating} /></td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Просмотр" onClick={() => setDetailId(d.raw.id)}><Eye className="h-4 w-4" /></IconBtn>
                    {canManage && <IconBtn title="Редактировать" onClick={() => setModal({ mode: "edit", id: d.raw.id })}><Pencil className="h-4 w-4" /></IconBtn>}
                    {canManage && onDelete && <IconBtn title="Архивировать" danger onClick={async () => { if (window.confirm(`Архивировать филиал «${d.raw.name}»? Ученики и группы сохранятся.`)) await onDelete(d.raw.id); }}><Trash2 className="h-4 w-4" /></IconBtn>}
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={11} className="p-8 text-center text-slate-500">Филиалов пока нет.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-600">Показано 1–{data.length} из {data.length} филиалов</p>

      {modal && (
        <BranchModal
          mode={modal.mode}
          branch={modal.id ? data.find((d: any) => d.raw.id === modal.id)?.raw : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            const ok = modal.mode === "add" ? await onCreate?.(payload) : await onUpdate?.(modal.id, payload);
            if (ok) setModal(null);
            return Boolean(ok);
          }}
        />
      )}

      {detailId && (() => {
        const d = data.find((x: any) => x.raw.id === detailId);
        if (!d) return null;
        return <BranchDetail d={d} students={students} groups={groups} teachers={teachers} halls={halls}
          onClose={() => setDetailId(null)}
          onOpenStudents={onOpenStudents} />;
      })()}
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: any) {
  return (
    <button onClick={onClick} title={title}
      className={`rounded-xl border border-white/10 p-2 text-slate-300 transition ${danger ? "hover:border-red-500/40 hover:text-red-400" : "hover:border-[#C5A059]/40 hover:text-[#C5A059]"}`}>
      {children}
    </button>
  );
}

function BranchModal({ mode, branch, onClose, onSubmit }: {
  mode: "add" | "edit"; branch?: Branch; onClose: () => void; onSubmit: (p: any) => Promise<boolean>;
}) {
  const [form, setForm] = useState({
    name: branch?.name || "", city: branch?.city || "", address: branch?.address || "",
    managerName: branch?.managerName || "", phone: branch?.phone || "",
    comment: branch?.comment || "", status: branch?.status || "active",
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.name.trim() || !form.city.trim()) return;
    setBusy(true); await onSubmit(form); setBusy(false);
  };
  return (
    <Modal title={mode === "add" ? "Добавить филиал" : "Редактировать филиал"} onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Название филиала *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Эхо Гор · Чокина 109/1" className={inputCls} /></Field>
        <Field label="Город"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Алматы" className={inputCls} /></Field>
        <Field label="Адрес"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="ул. Чокина 109/1" className={inputCls} /></Field>
        <Field label="Ответственный / руководитель"><input value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} placeholder="ФИО" className={inputCls} /></Field>
        <Field label="Телефон филиала"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (___) ___-__-__" className={inputCls} /></Field>
        <Field label="Статус">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
            <option value="active">Активный</option>
            <option value="archived">Архивный</option>
          </select>
        </Field>
        <div className="md:col-span-2"><Field label="Комментарий"><textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={2} className={inputCls} /></Field></div>
      </div>
      <ModalActions busy={busy} disabled={!form.name.trim() || !form.city.trim()} onCancel={onClose} onSubmit={submit} />
    </Modal>
  );
}

function BranchDetail({ d, students, groups, teachers, halls, onClose, onOpenStudents }: any) {
  const branchGroups = groups.filter((g: Group) => g.branchId === d.raw.id);
  const branchHalls = halls.filter((h: any) => h.branchId === d.raw.id);
  const branchStudents = students.filter((s: Student) => s.branchId === d.raw.id);
  const branchTeachers = teachers.filter((t: Teacher) => branchGroups.some((g: Group) => g.teacherId === t.id));
  const teacherName = (id: string) => teachers.find((t: Teacher) => t.id === id)?.name || "—";
  return (
    <Modal title={d.raw.name} subtitle={`${d.raw.city} · ${d.raw.managerName} · ${d.raw.phone || "—"}`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Группы" value={String(d.groupsCount)} />
        <MiniStat label="Педагоги" value={String(d.teachersCount)} />
        <MiniStat label="Ученики" value={String(d.active)} />
        <MiniStat label="Своб. места" value={String(d.freeSeats)} />
        <MiniStat label="Заполненность" value={`${round(d.fill)}%`} />
        <MiniStat label="Удержание" value={`${round(d.retention)}%`} />
        <MiniStat label="Выручка" value={money(d.revenue)} />
        <MiniStat label="Потенциал" value={money(d.potential)} />
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#121212] p-4">
        <div className="flex items-center justify-between"><AiBadge rating={d.rating} /><span className={kic}>AI-оценка</span></div>
        <p className="mt-2 text-sm text-slate-400">{d.rating.note}</p>
      </div>

      <DetailList title={`Группы филиала (${branchGroups.length})`} icon={Users}
        rows={branchGroups.map((g: Group) => `${g.name} · ${teacherName(g.teacherId)} · ${(g.days || []).join(", ")} ${g.time || ""}`)} />
      <DetailList title={`Залы филиала (${branchHalls.length})`} icon={DoorOpen}
        rows={branchHalls.map((h: any) => `${h.name} · вместимость ${h.capacity}`)} />
      <DetailList title={`Педагоги филиала (${branchTeachers.length})`} icon={UserCog}
        rows={branchTeachers.map((t: Teacher) => t.name)} />

      {onOpenStudents && (
        <button onClick={() => { onOpenStudents({ branchFilter: d.raw.id, label: `Филиал: ${d.raw.name}` }); onClose(); }}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#C5A059]/40 px-4 py-2 text-sm font-bold text-[#C5A059] transition hover:bg-[#C5A059]/10">
          <Users className="h-4 w-4" /> Показать учеников филиала ({branchStudents.length})
        </button>
      )}
    </Modal>
  );
}

/* ═══════════════════════════ ГРУППЫ ═══════════════════════════ */

function GroupsTab({ groupData, canManage, rawBranches, teachers, halls, students, onCreate, onUpdate, onDelete, onOpenStudents }: any) {
  const [modal, setModal] = useState<{ mode: "add" | "edit"; id?: string } | null>(null);
  const [studentsOf, setStudentsOf] = useState<string | null>(null);
  const [fBranch, setFBranch] = useState("");
  const [fTeacher, setFTeacher] = useState("");
  const [fHall, setFHall] = useState("");
  const [fLevel, setFLevel] = useState("");
  const [fFill, setFFill] = useState("");

  const levels = useMemo(() => Array.from(new Set([...LEVELS_DEFAULT, ...groupData.map((x: any) => x.g.level).filter(Boolean)])), [groupData]);

  const filtered = groupData.filter(({ g, fill }: any) => {
    if (fBranch && g.branchId !== fBranch) return false;
    if (fTeacher && g.teacherId !== fTeacher) return false;
    if (fHall && g.hallId !== fHall) return false;
    if (fLevel && g.level !== fLevel) return false;
    if (fFill === "free" && fill >= 100) return false;
    if (fFill === "full" && fill < 100) return false;
    if (fFill === "low" && fill >= 50) return false;
    return true;
  });

  const branchName = (id: string) => rawBranches.find((b: Branch) => b.id === id)?.name || "—";
  const teacherName = (id: string) => teachers.find((t: Teacher) => t.id === id)?.name || "Не назначен";
  const hallName = (id: string) => halls.find((h: any) => h.id === id)?.name || "—";

  // Дашборд групп
  const totCap = filtered.reduce((a: number, d: any) => a + d.capacity, 0);
  const totActive = filtered.reduce((a: number, d: any) => a + d.active, 0);
  const totFree = filtered.reduce((a: number, d: any) => a + d.freeSeats, 0);
  const fill = totCap ? (totActive / totCap) * 100 : 0;
  const retention = filtered.length ? filtered.reduce((a: number, d: any) => a + d.retention, 0) / filtered.length : 0;
  const teachersCount = new Set(filtered.map((d: any) => d.g.teacherId).filter(Boolean)).size;

  return (
    <div>
      <CollapsibleDash title="Дашборд групп" subtitle="Сводная информация по группам" storageKey="echogor.dash.groups">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <DashCard icon={Layers} label="Групп" value={String(filtered.length)} accent="bg-sky-500/15 text-sky-400" />
          <DashCard icon={DoorOpen} label="Своб. места" value={String(totFree)} sub={`из ${totCap}`} accent="bg-emerald-500/15 text-emerald-400" />
          <DashCard icon={Users} label="Ученики" value={String(totActive)} accent="bg-violet-500/15 text-violet-400" />
          <DashCard icon={Percent} label="Заполненность" value={`${round(fill)}%`} accent="bg-[#C5A059]/15 text-[#C5A059]" />
          <DashCard icon={TrendingUp} label="Удержание" value={`${round(retention)}%`} accent="bg-emerald-500/15 text-emerald-400" />
          <DashCard icon={UserCog} label="Педагоги" value={String(teachersCount)} accent="bg-amber-500/15 text-amber-400" />
        </div>
      </CollapsibleDash>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-white">Группы <span className="text-slate-500">({filtered.length})</span></p>
        {canManage && (
          <button onClick={() => setModal({ mode: "add" })} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
            <Plus className="h-4 w-4" /> Добавить группу
          </button>
        )}
      </div>

      {/* Фильтры */}
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <FilterSelect value={fBranch} onChange={setFBranch} all="Все филиалы" options={rawBranches.map((b: Branch) => ({ v: b.id, l: b.name }))} />
        <FilterSelect value={fTeacher} onChange={setFTeacher} all="Все педагоги" options={teachers.map((t: Teacher) => ({ v: t.id, l: t.name }))} />
        <FilterSelect value={fHall} onChange={setFHall} all="Все залы" options={halls.map((h: any) => ({ v: h.id, l: h.name }))} />
        <FilterSelect value={fLevel} onChange={setFLevel} all="Все уровни" options={levels.map((l: string) => ({ v: l, l }))} />
        <FilterSelect value={fFill} onChange={setFFill} all="Любая заполненность" options={[{ v: "free", l: "Есть места" }, { v: "full", l: "Заполнена" }, { v: "low", l: "Низкая (<50%)" }]} />
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-[#0F0F0F]">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-3">№</th>
              <th className="p-3">Группа</th>
              <th className="p-3">Филиал</th>
              <th className="p-3">Педагог</th>
              <th className="p-3">Зал</th>
              <th className="p-3">Уровень</th>
              <th className="p-3">Возраст</th>
              <th className="p-3">Вмест.</th>
              <th className="p-3">Ученики</th>
              <th className="p-3">Своб.</th>
              <th className="p-3 w-36">Заполн.</th>
              <th className="p-3">Расписание</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ g, active, capacity, freeSeats, fill }: any, i: number) => (
              <tr key={g.id} className="border-b border-white/5 text-slate-300 transition hover:bg-white/[0.02]">
                <td className="p-3 text-slate-500">{i + 1}</td>
                <td className="p-3 font-bold text-white">{g.name}</td>
                <td className="p-3 text-slate-400">{branchName(g.branchId)}</td>
                <td className="p-3 text-slate-400">{teacherName(g.teacherId)}</td>
                <td className="p-3 text-slate-400">{hallName(g.hallId)}</td>
                <td className="p-3 text-slate-400">{g.level || "—"}</td>
                <td className="p-3 text-slate-400">{g.ageGroup || "—"}</td>
                <td className="p-3">{capacity || "—"}</td>
                <td className="p-3 font-bold text-white">{active}</td>
                <td className="p-3">{freeSeats}</td>
                <td className="p-3"><FillBar pct={fill} /></td>
                <td className="p-3 text-xs text-slate-400">{(g.days || []).join(", ")} {g.time || ""}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Ученики группы" onClick={() => setStudentsOf(g.id)}><Users className="h-4 w-4" /></IconBtn>
                    {canManage && <IconBtn title="Редактировать" onClick={() => setModal({ mode: "edit", id: g.id })}><Pencil className="h-4 w-4" /></IconBtn>}
                    {canManage && onDelete && <IconBtn title="Архивировать" danger onClick={async () => { if (window.confirm(`Архивировать группу «${g.name}»? Ученики сохранятся.`)) await onDelete(g.id); }}><Trash2 className="h-4 w-4" /></IconBtn>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={13} className="p-8 text-center text-slate-500">Группы не найдены.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <GroupModal
          mode={modal.mode}
          group={modal.id ? groupData.find((x: any) => x.g.id === modal.id)?.g : undefined}
          rawBranches={rawBranches} teachers={teachers} halls={halls} levels={levels}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            const ok = modal.mode === "add" ? await onCreate?.(payload) : await onUpdate?.(modal.id, payload);
            if (ok) setModal(null);
            return Boolean(ok);
          }}
        />
      )}

      {studentsOf && (() => {
        const gd = groupData.find((x: any) => x.g.id === studentsOf);
        if (!gd) return null;
        return (
          <Modal title={`Ученики · ${gd.g.name}`} subtitle={`${gd.inGroup.length} учеников`} onClose={() => setStudentsOf(null)}>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {gd.inGroup.map((s: Student) => (
                <div key={s.id} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm">
                  <div><p className="font-bold text-white">{s.name}</p><p className="text-xs text-slate-500">{s.parentName} · {s.parentPhone || "—"}</p></div>
                  {hasActiveSub(s)
                    ? <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">активен</span>
                    : <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-400">нет абон.</span>}
                </div>
              ))}
              {gd.inGroup.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">В группе пока нет учеников.</p>}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

function FilterSelect({ value, onChange, all, options }: { value: string; onChange: (v: string) => void; all: string; options: { v: string; l: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#C5A059]/50">
      <option value="">{all}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function GroupModal({ mode, group, rawBranches, teachers, halls, levels, onClose, onSubmit }: any) {
  const initDays: Record<string, { on: boolean; start: string; end: string }> = {};
  DAYS.forEach((day) => {
    const on = (group?.days || []).includes(day);
    const time = group?.time || "18:30";
    initDays[day] = { on, start: time, end: "20:00" };
  });
  const [form, setForm] = useState({
    name: group?.name || "", branchId: group?.branchId || "", teacherId: group?.teacherId || "",
    hallId: group?.hallId || "", level: group?.level || "Начинающая",
    ageFrom: group?.ageFrom != null ? String(group.ageFrom) : "", ageTo: group?.ageTo != null ? String(group.ageTo) : "",
    capacity: group?.capacity != null ? String(group.capacity) : "",
  });
  const [days, setDays] = useState(initDays);
  const [busy, setBusy] = useState(false);

  const branchTeachers = form.branchId ? teachers.filter((t: Teacher) => !t.branchId || t.branchId === form.branchId) : teachers;
  const branchHalls = halls.filter((h: any) => !form.branchId || h.branchId === form.branchId);

  const toggleDay = (day: string) => setDays((d) => ({ ...d, [day]: { ...d[day], on: !d[day].on } }));
  const setTime = (day: string, key: "start" | "end", v: string) => setDays((d) => ({ ...d, [day]: { ...d[day], [key]: v } }));

  const submit = async () => {
    if (!form.name.trim() || !form.branchId) return;
    const enabled = DAYS.filter((day) => days[day].on);
    const scheduleDays = enabled.join(", ");
    const first = enabled[0];
    const scheduleTime = first ? `${days[first].start}–${days[first].end}` : "";
    const payload = {
      name: form.name.trim(), branchId: form.branchId,
      teacherId: form.teacherId || undefined, hallId: form.hallId || undefined,
      level: form.level,
      ageFrom: form.ageFrom ? Number(form.ageFrom) : undefined,
      ageTo: form.ageTo ? Number(form.ageTo) : undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      scheduleDays: scheduleDays || undefined, scheduleTime: scheduleTime || undefined,
    };
    setBusy(true); await onSubmit(payload); setBusy(false);
  };

  return (
    <Modal title={mode === "add" ? "Добавить группу" : "Редактировать группу"} onClose={onClose} wide>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Название группы *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Детская 5–12" className={inputCls} /></Field>
        <Field label="Филиал *">
          <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value, teacherId: "", hallId: "" })} className={inputCls}>
            <option value="">Выберите филиал</option>
            {rawBranches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Педагог">
          <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className={inputCls}>
            <option value="">Выберите педагога</option>
            {branchTeachers.map((t: Teacher) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Зал">
          <select value={form.hallId} onChange={(e) => setForm({ ...form, hallId: e.target.value })} className={inputCls}>
            <option value="">Выберите зал</option>
            {branchHalls.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </Field>
        <Field label="Уровень">
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputCls}>
            {levels.map((l: string) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Возраст от"><input type="number" min={3} value={form.ageFrom} onChange={(e) => setForm({ ...form, ageFrom: e.target.value })} placeholder="5" className={inputCls} /></Field>
          <Field label="до"><input type="number" min={3} value={form.ageTo} onChange={(e) => setForm({ ...form, ageTo: e.target.value })} placeholder="12" className={inputCls} /></Field>
          <Field label="Вмест."><input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="30" className={inputCls} /></Field>
        </div>
      </div>

      {/* Блок «Дни занятий и время» (ТЗ §5) */}
      <div className="mt-5">
        <p className={kic}><CalendarDays className="mr-1 inline h-3.5 w-3.5" /> Дни занятий и время *</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DAYS.map((day) => (
            <div key={day} className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${days[day].on ? "border-[#C5A059]/50 bg-[#C5A059]/5" : "border-white/10 bg-[#0C0C0C]"}`}>
              <label className="flex w-12 cursor-pointer items-center gap-2 text-sm font-bold text-white">
                <input type="checkbox" checked={days[day].on} onChange={() => toggleDay(day)} className="accent-[#C5A059]" /> {day}
              </label>
              <input type="time" value={days[day].start} disabled={!days[day].on} onChange={(e) => setTime(day, "start", e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-[#0C0C0C] px-2 py-1 text-xs text-white outline-none focus:border-[#C5A059]/50 disabled:opacity-40" />
              <span className="text-slate-600">–</span>
              <input type="time" value={days[day].end} disabled={!days[day].on} onChange={(e) => setTime(day, "end", e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-[#0C0C0C] px-2 py-1 text-xs text-white outline-none focus:border-[#C5A059]/50 disabled:opacity-40" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Расписание автоматически используется в продаже абонемента, журнале посещаемости и расчёте загрузки.</p>
      </div>

      <ModalActions busy={busy} disabled={!form.name.trim() || !form.branchId} onCancel={onClose} onSubmit={submit} submitLabel="Сохранить группу" />
    </Modal>
  );
}

/* ═══════════════════════════ ЗАЛЫ ═══════════════════════════ */

function HallsTab({ halls, rawBranches, groups, canManage, onCreate, onUpdate, onDelete }: any) {
  const [modal, setModal] = useState<{ mode: "add" | "edit"; id?: string } | null>(null);
  const branchName = (id: string) => rawBranches.find((b: Branch) => b.id === id)?.name || "—";
  const groupsInHall = (id: string) => groups.filter((g: Group) => g.hallId === id).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-white">Управление залами <span className="text-slate-500">({halls.length})</span></p>
        {canManage && (
          <button onClick={() => setModal({ mode: "add" })} className="inline-flex items-center gap-2 rounded-2xl bg-[#C5A059] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a]">
            <Plus className="h-4 w-4" /> Добавить зал
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-[#0F0F0F]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-3">№</th>
              <th className="p-3">Зал</th>
              <th className="p-3">Филиал</th>
              <th className="p-3">Вместимость</th>
              <th className="p-3">Групп</th>
              <th className="p-3">Описание</th>
              <th className="p-3">Статус</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {halls.map((h: any, i: number) => (
              <tr key={h.id} className="border-b border-white/5 text-slate-300 transition hover:bg-white/[0.02]">
                <td className="p-3 text-slate-500">{i + 1}</td>
                <td className="p-3 font-bold text-white">{h.name}</td>
                <td className="p-3 text-slate-400">{branchName(h.branchId)}</td>
                <td className="p-3">{h.capacity}</td>
                <td className="p-3">{groupsInHall(h.id)}</td>
                <td className="p-3 text-slate-400">{h.description || "—"}</td>
                <td className="p-3">
                  {String(h.status || "active") === "active"
                    ? <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">Активен</span>
                    : <span className="rounded-lg bg-slate-500/15 px-2 py-1 text-xs font-bold text-slate-400">Архив</span>}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    {canManage && <IconBtn title="Редактировать" onClick={() => setModal({ mode: "edit", id: h.id })}><Pencil className="h-4 w-4" /></IconBtn>}
                    {canManage && onDelete && <IconBtn title="Архивировать" danger onClick={async () => { if (window.confirm(`Архивировать зал «${h.name}»?`)) await onDelete(h.id); }}><Trash2 className="h-4 w-4" /></IconBtn>}
                  </div>
                </td>
              </tr>
            ))}
            {halls.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Залов пока нет.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <HallModal
          mode={modal.mode}
          hall={modal.id ? halls.find((h: any) => h.id === modal.id) : undefined}
          rawBranches={rawBranches}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            const ok = modal.mode === "add" ? await onCreate?.(payload) : await onUpdate?.(modal.id, payload);
            if (ok) setModal(null);
            return Boolean(ok);
          }}
        />
      )}
    </div>
  );
}

function HallModal({ mode, hall, rawBranches, onClose, onSubmit }: any) {
  const [form, setForm] = useState({
    name: hall?.name || "", branchId: hall?.branchId || "", capacity: hall?.capacity != null ? String(hall.capacity) : "",
    description: hall?.description || "", status: hall?.status || "active",
  });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.name.trim() || !form.branchId) return;
    setBusy(true);
    await onSubmit({ name: form.name.trim(), branchId: form.branchId, capacity: form.capacity ? Number(form.capacity) : 0, description: form.description || undefined, status: form.status });
    setBusy(false);
  };
  return (
    <Modal title={mode === "add" ? "Добавить зал" : "Редактировать зал"} onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Название зала *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Главный зал" className={inputCls} /></Field>
        <Field label="Филиал *">
          <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className={inputCls}>
            <option value="">Выберите филиал</option>
            {rawBranches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Вместимость"><input type="number" min={0} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="50" className={inputCls} /></Field>
        <Field label="Статус">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
            <option value="active">Активный</option>
            <option value="archived">Архивный</option>
          </select>
        </Field>
        <div className="md:col-span-2"><Field label="Описание"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Большой зал с зеркалами" className={inputCls} /></Field></div>
      </div>
      <ModalActions busy={busy} disabled={!form.name.trim() || !form.branchId} onCancel={onClose} onSubmit={submit} submitLabel="Сохранить зал" />
    </Modal>
  );
}

/* ─────────────────────────── shared modal bits ─────────────────────────── */

function Modal({ title, subtitle, children, onClose, wide }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`my-8 w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-[2rem] border border-[#C5A059]/30 bg-[#141414] p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-black text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={kic}>{label}</span>{children}</label>;
}

function ModalActions({ busy, disabled, onCancel, onSubmit, submitLabel }: { busy: boolean; disabled?: boolean; onCancel: () => void; onSubmit: () => void; submitLabel?: string }) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button onClick={onCancel} className="rounded-2xl border border-white/10 px-5 py-2 text-sm font-bold text-slate-300 transition hover:text-white">Отмена</button>
      <button onClick={onSubmit} disabled={busy || disabled} className="rounded-2xl bg-[#C5A059] px-5 py-2 text-sm font-bold text-black transition hover:bg-[#d4b06a] disabled:opacity-50">
        {busy ? "Сохранение…" : submitLabel || "Сохранить"}
      </button>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121212] p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className={kic}>{label}</p>
    </div>
  );
}

function DetailList({ title, icon: Icon, rows }: { title: string; icon: any; rows: string[] }) {
  return (
    <div className="mt-4">
      <p className={`${kic} flex items-center gap-1.5`}><Icon className="h-3.5 w-3.5" /> {title}</p>
      <div className="mt-2 space-y-1">
        {rows.length === 0 && <p className="text-sm text-slate-500">—</p>}
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-[#121212] px-3 py-2 text-sm text-slate-300">{r}</div>
        ))}
      </div>
    </div>
  );
}

export default BranchesGroupsView;

import React, { useEffect, useMemo, useState } from "react";
import {
  Settings, X, Eye, EyeOff, ArrowUp, ArrowDown, Pin, PinOff,
  RotateCcw, Check, Palette, Users2, Pencil, GripVertical
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Настройки раздела от Владельца.
// Каждый раздел кабинета Владельца получает собственную панель настроек,
// в которой владелец без кода может: переименовать пункт меню, скрыть/показать
// его, изменить порядок, задать цвет-акцент, закрепить в мобильном меню,
// указать роли, которым раздел доступен, и добавить описание.
// Настройки сохраняются в localStorage (по организации/пользователю не гонимся —
// это персональная раскладка владельца на устройстве).
// ─────────────────────────────────────────────────────────────────────────────

export type SectionRoleKey = "owner" | "branch" | "admin" | "teacher" | "student";

export const SECTION_ROLE_LABELS: { id: SectionRoleKey; label: string }[] = [
  { id: "owner", label: "Владелец" },
  { id: "branch", label: "Управляющий" },
  { id: "admin", label: "Администратор" },
  { id: "teacher", label: "Педагог" },
  { id: "student", label: "Ученик" },
];

export const SECTION_ACCENTS: { id: string; label: string; value: string }[] = [
  { id: "gold", label: "Золото", value: "#C5A059" },
  { id: "emerald", label: "Изумруд", value: "#34D399" },
  { id: "sky", label: "Небо", value: "#38BDF8" },
  { id: "violet", label: "Фиолет", value: "#A78BFA" },
  { id: "rose", label: "Роза", value: "#FB7185" },
  { id: "amber", label: "Янтарь", value: "#FBBF24" },
  { id: "slate", label: "Графит", value: "#94A3B8" },
];

export interface SectionSetting {
  id: string;
  label?: string;          // переопределение названия
  hidden?: boolean;        // скрыт в меню владельца
  order?: number;          // явный порядок сортировки
  accent?: string;         // hex-акцент
  pinned?: boolean;        // закреплён в нижнем мобильном меню
  roles?: SectionRoleKey[];// роли, которым раздел доступен
  note?: string;           // описание/памятка
}

export type SectionSettingsMap = Record<string, SectionSetting>;

export interface BaseTab {
  id: string;
  label: string;
  short?: string;
  icon?: React.ElementType;
}

export interface ResolvedTab extends BaseTab {
  effectiveLabel: string;
  accent: string;
  hidden: boolean;
  pinned: boolean;
  roles: SectionRoleKey[];
  note: string;
}

const STORAGE_KEY = "echogor:owner-section-settings:v1";
const DEFAULT_ACCENT = "#C5A059";
const DEFAULT_ROLES: SectionRoleKey[] = ["owner"];

function loadMap(): SectionSettingsMap {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as SectionSettingsMap) : {};
  } catch {
    return {};
  }
}

export interface OwnerSectionSettingsApi {
  map: SectionSettingsMap;
  /** Все вкладки с применёнными настройками, отсортированные по порядку. */
  resolvedTabs: ResolvedTab[];
  /** Только видимые вкладки (для меню). */
  visibleTabs: ResolvedTab[];
  /** Закреплённые для нижнего мобильного меню (fallback — первые видимые). */
  mobileTabs: ResolvedTab[];
  update: (id: string, patch: Partial<SectionSetting>) => void;
  move: (id: string, dir: "up" | "down") => void;
  reset: (id: string) => void;
  resetAll: () => void;
  get: (id: string) => SectionSetting | undefined;
}

export function useOwnerSectionSettings(baseTabs: BaseTab[]): OwnerSectionSettingsApi {
  const [map, setMap] = useState<SectionSettingsMap>(() => loadMap());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* noop */
    }
  }, [map]);

  const resolvedTabs = useMemo<ResolvedTab[]>(() => {
    return baseTabs
      .map((tab, index) => {
        const s = map[tab.id] || {};
        return {
          ...tab,
          effectiveLabel: (s.label && s.label.trim()) || tab.label,
          accent: s.accent || DEFAULT_ACCENT,
          hidden: s.hidden === true,
          pinned: s.pinned === true,
          roles: s.roles && s.roles.length ? s.roles : DEFAULT_ROLES,
          note: s.note || "",
          _order: typeof s.order === "number" ? s.order : index,
          _index: index,
        } as ResolvedTab & { _order: number; _index: number };
      })
      .sort((a: any, b: any) => (a._order - b._order) || (a._index - b._index));
  }, [baseTabs, map]);

  const visibleTabs = useMemo(() => resolvedTabs.filter((t) => !t.hidden), [resolvedTabs]);

  const mobileTabs = useMemo(() => {
    const pinned = visibleTabs.filter((t) => t.pinned);
    return (pinned.length ? pinned : visibleTabs).slice(0, 5);
  }, [visibleTabs]);

  const update = (id: string, patch: Partial<SectionSetting>) =>
    setMap((m) => ({ ...m, [id]: { ...m[id], id, ...patch } }));

  const reset = (id: string) =>
    setMap((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });

  const resetAll = () => setMap({});

  const move = (id: string, dir: "up" | "down") =>
    setMap((m) => {
      // Текущий видимый/полный порядок берём из resolvedTabs, чтобы перестановка
      // выглядела естественно, даже если явные order ещё не проставлены.
      const order = resolvedTabs.map((t) => t.id);
      const from = order.indexOf(id);
      if (from < 0) return m;
      const to = dir === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= order.length) return m;
      const reordered = [...order];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      const next = { ...m };
      reordered.forEach((tabId, idx) => {
        next[tabId] = { ...next[tabId], id: tabId, order: idx };
      });
      return next;
    });

  const get = (id: string) => map[id];

  return { map, resolvedTabs, visibleTabs, mobileTabs, update, move, reset, resetAll, get };
}

// ─────────────────────────────────────────────────────────────────────────────
// Кнопка-шестерёнка (открывает панель настроек раздела).
// ─────────────────────────────────────────────────────────────────────────────
export function SectionGearButton({
  onClick,
  title = "Настройки раздела",
  className = "",
}: {
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-[#C5A059]/40 hover:text-[#C5A059] ${className}`}
    >
      <Settings className="h-3.5 w-3.5" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Панель настроек одного раздела.
// ─────────────────────────────────────────────────────────────────────────────
export function SectionSettingsDrawer({
  tab,
  api,
  onClose,
}: {
  tab: ResolvedTab | null;
  api: OwnerSectionSettingsApi;
  onClose: () => void;
}) {
  if (!tab) return null;

  const s: SectionSetting = api.get(tab.id) || ({ id: tab.id } as SectionSetting);
  const Icon = tab.icon;
  const isFirst = api.visibleTabs[0]?.id === tab.id;
  const isLast = api.visibleTabs[api.visibleTabs.length - 1]?.id === tab.id;

  const toggleRole = (role: SectionRoleKey) => {
    const current = tab.roles;
    const has = current.includes(role);
    // Владельца из списка убрать нельзя — раздел всегда доступен владельцу.
    if (role === "owner" && has) return;
    const nextRoles = has ? current.filter((r) => r !== role) : [...current, role];
    api.update(tab.id, { roles: nextRoles.length ? nextRoles : ["owner"] });
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-[#0F0F0F] shadow-2xl">
        {/* Шапка */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${tab.accent}1A`, color: tab.accent }}
            >
              {Icon ? <Icon className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Настройка раздела</p>
              <h3 className="text-base font-black text-white">{tab.effectiveLabel}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Тело */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Название */}
          <Field icon={Pencil} title="Название в меню">
            <input
              value={s.label ?? ""}
              onChange={(e) => api.update(tab.id, { label: e.target.value })}
              placeholder={tab.label}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#C5A059]/40"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">Пусто — используется исходное «{tab.label}».</p>
          </Field>

          {/* Видимость */}
          <Field icon={tab.hidden ? EyeOff : Eye} title="Видимость">
            <ToggleRow
              active={!tab.hidden}
              onLabel="Показан в меню"
              offLabel="Скрыт из меню"
              onToggle={() => api.update(tab.id, { hidden: !tab.hidden })}
            />
          </Field>

          {/* Порядок */}
          <Field icon={GripVertical} title="Порядок в меню">
            <div className="flex items-center gap-2">
              <button
                disabled={isFirst}
                onClick={() => api.move(tab.id, "up")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-200 transition enabled:hover:bg-white/10 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" /> Выше
              </button>
              <button
                disabled={isLast}
                onClick={() => api.move(tab.id, "down")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-200 transition enabled:hover:bg-white/10 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" /> Ниже
              </button>
            </div>
          </Field>

          {/* Закрепление в мобильном меню */}
          <Field icon={tab.pinned ? Pin : PinOff} title="Мобильное меню">
            <ToggleRow
              active={tab.pinned}
              onLabel="Закреплён в нижней панели"
              offLabel="Не закреплён"
              onToggle={() => api.update(tab.id, { pinned: !tab.pinned })}
            />
            <p className="mt-1.5 text-[11px] text-slate-500">В нижнюю панель на телефоне попадают до 5 закреплённых разделов.</p>
          </Field>

          {/* Акцент */}
          <Field icon={Palette} title="Цвет-акцент">
            <div className="flex flex-wrap gap-2">
              {SECTION_ACCENTS.map((a) => {
                const active = tab.accent.toLowerCase() === a.value.toLowerCase();
                return (
                  <button
                    key={a.id}
                    title={a.label}
                    onClick={() => api.update(tab.id, { accent: a.value })}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${active ? "border-white/70" : "border-white/10 hover:border-white/30"}`}
                    style={{ background: `${a.value}22` }}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: a.value }}>
                      {active ? <Check className="h-3 w-3 text-black" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Роли */}
          <Field icon={Users2} title="Доступ по ролям">
            <div className="grid grid-cols-1 gap-1.5">
              {SECTION_ROLE_LABELS.map((role) => {
                const checked = tab.roles.includes(role.id);
                const locked = role.id === "owner";
                return (
                  <button
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${checked ? "border-[#C5A059]/40 bg-[#C5A059]/10 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
                  >
                    <span className="font-semibold">{role.label}</span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${checked ? "border-[#C5A059] bg-[#C5A059] text-black" : "border-white/20"}`}>
                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">Владельцу раздел доступен всегда. Настройка сохраняется для управления доступом ролей.</p>
          </Field>

          {/* Описание */}
          <Field icon={Pencil} title="Описание раздела">
            <textarea
              value={s.note ?? ""}
              onChange={(e) => api.update(tab.id, { note: e.target.value })}
              placeholder="Памятка для команды: что делает раздел, кто отвечает…"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#C5A059]/40"
            />
          </Field>
        </div>

        {/* Подвал */}
        <div className="border-t border-white/10 px-5 py-4">
          <button
            onClick={() => api.reset(tab.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:border-rose-400/40 hover:text-rose-300"
          >
            <RotateCcw className="h-4 w-4" /> Сбросить настройки раздела
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5 text-[#C5A059]" />
        {title}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  active,
  onLabel,
  offLabel,
  onToggle,
}: {
  active: boolean;
  onLabel: string;
  offLabel: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${active ? "border-[#C5A059]/40 bg-[#C5A059]/10 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
    >
      <span>{active ? onLabel : offLabel}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${active ? "bg-[#C5A059]" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${active ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/**
 * Парсер внешних событий кавказского танца для «эхо-гор».
 *
 * Две категории:
 *   - tournament (турнир/чемпионат/первенство/кубок/конкурс) с аудиторией kids|adults|all
 *   - concert    (концерт ансамбля кавказского танца)
 *
 * Источники:
 *   - Билетные агрегаторы (Ticketon — КЗ/СНГ, Kassir — РФ): отдаются server-side, парсятся.
 *     Из них автоматически вылавливаются И концерты, И билетные турниры/конкурсы.
 *   - Ручной ввод + редактируемый список manualSeed (для турниров федераций/Instagram,
 *     которых нет в билетных системах).
 *
 * Архитектура: чистые функции классификации/нормализации (юнит-тестируемы) + адаптеры
 * источников (сетевые) + раннер, который фильтрует кавказские события, классифицирует,
 * дедуплицирует и делает upsert в Supabase (таблица public.dance_events, миграция 005).
 */

// ───────────────────────────────────────────────────────── Типы ─────────────

export type EventType = "tournament" | "concert";
export type Audience = "kids" | "adults" | "all";

/** Сырой кандидат, который возвращает адаптер источника. */
export interface RawCandidate {
  title: string;
  url: string;
  source: string;
  sourceUid?: string;
  dateText?: string;       // «27 июня», «29-01-2026», «10-01-2026 11-01-2026»
  city?: string;
  country?: string;        // KZ, RU, UZ, KG, BY, AZ, GE, AM, TJ
  venue?: string;
  organizer?: string;
  priceText?: string;
  image?: string;
  ageText?: string;        // «0+», «6+», «дети 8-11» — для определения аудитории
  raw?: unknown;
}

/** Нормализованное событие, готовое к записи в БД. */
export interface NormalizedEvent {
  event_type: EventType;
  audience: Audience;
  title: string;
  organizer: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  start_date: string | null;   // YYYY-MM-DD
  end_date: string | null;
  reg_deadline: string | null;
  age_categories: string | null;
  disciplines: string | null;
  price: string | null;
  url: string | null;
  image: string | null;
  source: string;
  source_uid: string | null;
  dedup_key: string;
  raw: unknown;
}

export interface AdapterContext {
  fetchFn: typeof fetch;
  log: (msg: string) => void;
  /** Ограничение detail-запросов на источник, чтобы не перегружать. */
  maxDetailFetches: number;
  /** Абсолютный дедлайн (Date.now()), после которого адаптеры прекращают новые запросы. */
  deadlineMs?: number;
  /** Диагностика: счётчики по источникам (всего ссылок, прошло пред-фильтр, ошибок сети). */
  debug?: Record<string, { links: number; prefiltered: number; fetchErrors: number }>;
}

/** Истёк ли дедлайн раннера. */
function past(ctx: AdapterContext): boolean {
  return !!ctx.deadlineMs && Date.now() > ctx.deadlineMs;
}

function dbg(ctx: AdapterContext, name: string) {
  if (!ctx.debug) return null;
  return (ctx.debug[name] ??= { links: 0, prefiltered: 0, fetchErrors: 0 });
}

export interface SourceAdapter {
  name: string;
  enabled: boolean;
  /** Применять ли кавказский фильтр (для общих агрегаторов — да). */
  applyCaucasusFilter: boolean;
  run: (ctx: AdapterContext) => Promise<RawCandidate[]>;
}

// ───────────────────────────────────────── Словари ключевых слов ────────────

/** Кириллические маркеры кавказского танца (для проверки названия). */
export const CAUCASUS_KEYWORDS_CYR = [
  "лезгинк", "кавказ", "горцы", "горянк", "джигит", "вайнах", "нохчо",
  "ватан", "нальмэс", "кабардинк", "эрисиони", "сухишвили", "даймохк",
  "ингушет", "дагестан", "осетин", "чечен", "адыг", "черкес", "балкар",
  "карачаев", "ассы", "ритмы кавказа", "дети гор", "пламя кавказа",
  "цветы кавказа", "легенда кавказа", "молодость кавказа", "аланы",
  "кавказск", "национальн танц", "народов кавказа", "зикр",
];

/** Транслит-маркеры в URL-slug агрегаторов (для дешёвого пред-фильтра). */
export const CAUCASUS_KEYWORDS_TRANSLIT = [
  "lezgin", "kavkaz", "kabardin", "dagestan", "osetin", "chechen", "ingush",
  "adyg", "cherkes", "balkar", "karachaev", "vainah", "vaynah", "nohcho",
  "vatan", "nalmes", "erisioni", "suhishvili", "sukhishvili", "daymohk",
  "gorcy", "gorec", "dzhigit", "alan", "ritmy-kavkaza", "plamya-kavkaza",
  "ansambl", "ansamble", "tanca-narodov", "national-dance",
];

/** Слова, указывающие на турнир/соревнование. */
export const TOURNAMENT_KEYWORDS = [
  "турнир", "чемпионат", "первенств", "кубок", "конкурс", "соревнован",
  "battle", "баттл", "championship", "cup ", "-cup", "open ", "гран-при",
  "гран при", "фестиваль-конкурс",
];

/** Маркеры детской аудитории. */
export const KIDS_MARKERS = [
  "дет", "юниор", "юношес", "беби", "baby", "kids", "школьник",
  "младш", "ювенал", "0+", "3+", "6+",
];

/** Маркеры взрослой аудитории. */
export const ADULTS_MARKERS = [
  "взросл", "сеньор", "senior", "professional", "профи", "18+", "21+", "adult",
];

const MONTHS: Record<string, number> = {
  янв: 1, фев: 2, мар: 3, апр: 4, май: 5, мая: 5, июн: 6, июл: 7,
  авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12,
};

// ─────────────────────────────────────── Чистые функции ─────────────────────

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/** Содержит ли текст какой-либо из маркеров. */
export function hasAny(text: string, markers: string[]): boolean {
  const t = norm(text);
  return markers.some((m) => t.includes(norm(m)));
}

/** Кавказская ли это танцевальная программа (по названию или slug). */
export function isCaucasian(title: string, slug = ""): boolean {
  return hasAny(title, CAUCASUS_KEYWORDS_CYR) ||
    CAUCASUS_KEYWORDS_TRANSLIT.some((m) => norm(slug).includes(m));
}

/** Тип события по названию. */
export function classifyEventType(title: string): EventType {
  return hasAny(title, TOURNAMENT_KEYWORDS) ? "tournament" : "concert";
}

/** Аудитория по названию + текстовым возрастным маркерам. */
export function classifyAudience(title: string, ageText = ""): Audience {
  const blob = `${title} ${ageText}`;
  const kids = hasAny(blob, KIDS_MARKERS);
  const adults = hasAny(blob, ADULTS_MARKERS);
  if (kids && !adults) return "kids";
  if (adults && !kids) return "adults";
  return "all";
}

/**
 * Парсит дату(ы) события в ISO YYYY-MM-DD.
 * Поддерживает: «27 июня[, 13:00]», «5 сентября», «29-01-2026», диапазоны
 * «10-01-2026 11-01-2026» / «10-01-2026 — 11-01-2026».
 * @param now — точка отсчёта (для вывода года у формата «DD месяц»).
 */
export function parseDates(
  dateText: string | undefined,
  now: Date = new Date(),
): { start: string | null; end: string | null } {
  if (!dateText) return { start: null, end: null };
  const text = dateText.replace(/ /g, " ").trim();

  // Формат DD-MM-YYYY (возможен диапазон).
  const dmy = [...text.matchAll(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/g)];
  if (dmy.length) {
    const iso = (m: RegExpMatchArray) =>
      `${m[3]}-${String(+m[2]).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
    return { start: iso(dmy[0]), end: dmy[1] ? iso(dmy[1]) : null };
  }

  // Формат «DD месяц» (возможен диапазон «12-14 июля»).
  const md = text.match(/(\d{1,2})(?:\s*[–—-]\s*(\d{1,2}))?\s+([а-яё]+)/i);
  if (md) {
    const day = +md[1];
    const endDay = md[2] ? +md[2] : null;
    const monKey = norm(md[3]).slice(0, 3);
    const month = MONTHS[monKey];
    if (month) {
      let year = now.getFullYear();
      // Если месяц уже прошёл в этом году — событие в следующем.
      if (month < now.getMonth() + 1) year += 1;
      const pad = (n: number) => String(n).padStart(2, "0");
      const start = `${year}-${pad(month)}-${pad(day)}`;
      const end = endDay ? `${year}-${pad(month)}-${pad(endDay)}` : null;
      return { start, end };
    }
  }
  return { start: null, end: null };
}

/** Стабильный hash (djb2) для дедуп-ключа. */
export function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function buildDedupKey(c: { source: string; sourceUid?: string; title: string; start: string | null; city?: string }): string {
  if (c.sourceUid) return `${c.source}:${c.sourceUid}`;
  return `${c.source}:${hash(`${norm(c.title)}|${c.start ?? ""}|${norm(c.city ?? "")}`)}`;
}

/** Сырой кандидат → нормализованное событие. */
export function normalize(c: RawCandidate, now: Date = new Date()): NormalizedEvent {
  const title = c.title.trim().replace(/\s+/g, " ");
  const { start, end } = parseDates(c.dateText, now);
  const event_type = classifyEventType(title);
  const audience = event_type === "tournament" ? classifyAudience(title, c.ageText) : "all";
  return {
    event_type,
    audience,
    title,
    organizer: c.organizer?.trim() || null,
    city: c.city?.trim() || null,
    country: c.country?.trim() || null,
    venue: c.venue?.trim() || null,
    start_date: start,
    end_date: end,
    reg_deadline: null,
    age_categories: c.ageText?.trim() || null,
    disciplines: null,
    price: c.priceText?.trim() || null,
    url: c.url?.trim() || null,
    image: c.image?.trim() || null,
    source: c.source,
    source_uid: c.sourceUid ?? null,
    dedup_key: buildDedupKey({ source: c.source, sourceUid: c.sourceUid, title, start, city: c.city }),
    raw: c.raw ?? null,
  };
}

// ───────────────────────────── Утилиты извлечения из HTML ────────────────────

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&gt;/g, ">").replace(/&lt;/g, "<");

const metaContent = (html: string, prop: string): string | undefined => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re) || html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
  return m ? decodeEntities(m[1]) : undefined;
};

const pageTitle = (html: string): string | undefined => {
  const og = metaContent(html, "og:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : undefined;
};

/** Достаёт уникальные относительные/абсолютные ссылки по шаблону href. */
function extractHrefs(html: string, pattern: RegExp): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(pattern)) out.add(m[1]);
  return [...out];
}

async function safeFetchText(
  ctx: AdapterContext,
  url: string,
  stat?: { fetchErrors: number } | null,
): Promise<string | null> {
  try {
    const res = await ctx.fetchFn(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.8",
      },
    });
    if (!res.ok) { ctx.log(`  ${url} → HTTP ${res.status}`); if (stat) stat.fetchErrors++; return null; }
    return await res.text();
  } catch (e: any) {
    ctx.log(`  ${url} → ошибка: ${e?.message || e}`);
    if (stat) stat.fetchErrors++;
    return null;
  }
}

const slugOf = (url: string) => (url.split("?")[0].split("/").filter(Boolean).pop() || "");

/**
 * Оборачивает fetch в scraping-прокси (для обхода Cloudflare/бот-защиты агрегаторов).
 * Активируется переменными окружения:
 *   SCRAPER_API_KEY   — ключ сервиса (обязателен для активации, если нет SCRAPER_API_URL).
 *   SCRAPER_PROVIDER  — "scraperapi" (по умолчанию) | "scrapingbee".
 *   SCRAPER_RENDER    — "true" → включить JS-рендеринг (нужно для Kassir; дороже по кредитам).
 *   SCRAPER_API_URL   — кастомный шаблон с токенами {url} и {key} (для любого провайдера).
 * Если ничего не задано — возвращает исходный fetch (прямые запросы).
 */
export function proxiedFetch(base: typeof fetch = fetch): typeof fetch {
  const key = process.env.SCRAPER_API_KEY;
  const template = process.env.SCRAPER_API_URL;
  const provider = (process.env.SCRAPER_PROVIDER || "scraperapi").toLowerCase();
  const render = process.env.SCRAPER_RENDER === "true";
  if (!key && !template) return base;

  return (async (input: any, init?: any) => {
    const target = typeof input === "string" ? input : input?.url ?? String(input);
    let wrapped: string;
    if (template) {
      wrapped = template.replace("{url}", encodeURIComponent(target)).replace("{key}", key || "");
    } else if (provider === "scrapingbee") {
      wrapped = `https://app.scrapingbee.com/api/v1/?api_key=${key}&render_js=${render}&url=${encodeURIComponent(target)}`;
    } else {
      wrapped = `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(target)}${render ? "&render=true" : ""}`;
    }
    return base(wrapped, init);
  }) as typeof fetch;
}

// ──────────────────────────────── Адаптеры ──────────────────────────────────

/** Города Ticketon → код страны. */
export const TICKETON_CITIES: Array<{ slug: string; city: string; country: string }> = [
  { slug: "almaty", city: "Алматы", country: "KZ" },
  { slug: "astana", city: "Астана", country: "KZ" },
  { slug: "shymkent", city: "Шымкент", country: "KZ" },
  { slug: "karaganda", city: "Караганда", country: "KZ" },
  { slug: "atyrau", city: "Атырау", country: "KZ" },
  { slug: "aktobe", city: "Актобе", country: "KZ" },
  { slug: "bishkek", city: "Бишкек", country: "KG" },
  { slug: "tashkent", city: "Ташкент", country: "UZ" },
  { slug: "dushanbe", city: "Душанбе", country: "TJ" },
];

/**
 * Ticketon (Казахстан + СНГ). Раздел /{city}/concerts отдаётся server-side.
 * Алгоритм: листинг → ссылки событий → пред-фильтр slug по транслиту →
 * detail-страница (og:title/og:image/дата/цена) → подтверждение кавказского фильтра.
 */
export function ticketonAdapter(opts?: { cities?: typeof TICKETON_CITIES }): SourceAdapter {
  const cities = opts?.cities ?? TICKETON_CITIES;
  return {
    name: "ticketon",
    enabled: true,
    applyCaucasusFilter: true,
    async run(ctx) {
      const found: RawCandidate[] = [];
      const d = dbg(ctx, "ticketon");
      let detailBudget = ctx.maxDetailFetches;
      for (const c of cities) {
        if (past(ctx)) { ctx.log("ticketon: дедлайн"); break; }
        for (const page of ["", "?page=2"]) {
          if (past(ctx)) break;
          const listUrl = `https://ticketon.kz/${c.slug}/concerts${page}`;
          const html = await safeFetchText(ctx, listUrl, d);
          if (!html) continue;
          const hrefs = extractHrefs(html, /href=["'](\/[a-z-]+\/event\/[^"'?#]+|\/promo\/[^"'?#]+)["']/gi);
          const candidates = hrefs.filter((h) =>
            CAUCASUS_KEYWORDS_TRANSLIT.some((m) => h.toLowerCase().includes(m)));
          if (d) { d.links += hrefs.length; d.prefiltered += candidates.length; }
          ctx.log(`ticketon ${c.slug}${page}: ссылок ${hrefs.length}, кандидатов ${candidates.length}`);
          for (const href of candidates) {
            if (detailBudget-- <= 0) { ctx.log("ticketon: лимит detail-запросов"); break; }
            const url = href.startsWith("http") ? href : `https://ticketon.kz${href}`;
            const detail = await safeFetchText(ctx, url, d);
            if (!detail) continue;
            const title = pageTitle(detail) || slugOf(href).replace(/-/g, " ");
            if (!isCaucasian(title, href)) continue;
            const priceM = detail.match(/[Оо]т\s*([\d\s]+)\s*₸/);
            const dateM = detail.match(/(\d{1,2}\s+[а-яё]+)(?:\s*,?\s*\d{1,2}:\d{2})?/i);
            found.push({
              title,
              url,
              source: "ticketon",
              sourceUid: slugOf(href),
              city: c.city,
              country: c.country,
              dateText: dateM?.[1],
              priceText: priceM ? `от ${priceM[1].replace(/\s+/g, " ").trim()} ₸` : undefined,
              image: metaContent(detail, "og:image"),
              ageText: (title.match(/\b(\d{1,2}\+)\b/) || [])[1],
              raw: { href, listUrl },
            });
          }
        }
      }
      return found;
    },
  };
}

/** Города Kassir (поддомены) → код страны (РФ). */
export const KASSIR_CITIES: Array<{ sub: string; city: string; country: string }> = [
  { sub: "msk", city: "Москва", country: "RU" },
  { sub: "spb", city: "Санкт-Петербург", country: "RU" },
];

/**
 * Kassir.ru (Россия). Раздел /bilety-na-koncert отдаётся server-side.
 * Ссылки событий: /koncert/..., /shou/.... Пред-фильтр slug → detail-страница.
 */
export function kassirAdapter(opts?: { cities?: typeof KASSIR_CITIES }): SourceAdapter {
  const cities = opts?.cities ?? KASSIR_CITIES;
  return {
    name: "kassir",
    enabled: true,
    applyCaucasusFilter: true,
    async run(ctx) {
      const found: RawCandidate[] = [];
      const d = dbg(ctx, "kassir");
      let detailBudget = ctx.maxDetailFetches;
      for (const c of cities) {
        if (past(ctx)) { ctx.log("kassir: дедлайн"); break; }
        const base = `https://${c.sub}.kassir.ru`;
        for (const sect of ["/bilety-na-koncert"]) {
          if (past(ctx)) break;
          const html = await safeFetchText(ctx, base + sect, d);
          if (!html) continue;
          const hrefs = extractHrefs(html, /href=["']([^"']*\/(?:koncert|shou)\/[^"'?#]+)["']/gi);
          const candidates = hrefs.filter((h) =>
            CAUCASUS_KEYWORDS_TRANSLIT.some((m) => h.toLowerCase().includes(m)));
          if (d) { d.links += hrefs.length; d.prefiltered += candidates.length; }
          ctx.log(`kassir ${c.sub}${sect}: ссылок ${hrefs.length}, кандидатов ${candidates.length}`);
          for (const href of candidates) {
            if (detailBudget-- <= 0) { ctx.log("kassir: лимит detail-запросов"); break; }
            const url = href.startsWith("http") ? href : base + href;
            const detail = await safeFetchText(ctx, url, d);
            if (!detail) continue;
            const title = pageTitle(detail) || slugOf(href).replace(/-/g, " ");
            if (!isCaucasian(title, href)) continue;
            const priceM = detail.match(/от\s*([\d\s]+)\s*₽/);
            const dateM = detail.match(/(\d{1,2}\s+[а-яё]+)/i);
            found.push({
              title,
              url,
              source: "kassir",
              sourceUid: slugOf(href),
              city: c.city,
              country: c.country,
              dateText: dateM?.[1],
              priceText: priceM ? `от ${priceM[1].replace(/\s+/g, " ").trim()} ₽` : undefined,
              image: metaContent(detail, "og:image"),
              ageText: (title.match(/\b(\d{1,2}\+)\b/) || [])[1],
              raw: { href, base, sect },
            });
          }
        }
      }
      return found;
    },
  };
}

/**
 * Ручной список турниров (федерации / Instagram / VK, которых нет в билетных системах).
 * Редактируйте этот массив или используйте POST /api/mvp/dance-events для добавления.
 */
export const manualSeed: RawCandidate[] = [
  // Пример (раскомментируйте и заполните):
  // {
  //   title: "Кубок Кавказа по кавказским танцам — дети",
  //   url: "https://instagram.com/...",
  //   source: "manual",
  //   sourceUid: "kubok-kavkaza-2026-deti",
  //   dateText: "12-14 сентября",
  //   city: "Махачкала",
  //   country: "RU",
  //   organizer: "Федерация кавказского танца",
  //   ageText: "дети 8-15",
  // },
];

export function manualAdapter(seed: RawCandidate[] = manualSeed): SourceAdapter {
  return {
    name: "manual",
    enabled: true,
    applyCaucasusFilter: false, // в ручной список добавляют уже проверенные события
    async run() { return seed; },
  };
}

// ──────────────────────────────── Раннер ────────────────────────────────────

export function defaultAdapters(): SourceAdapter[] {
  return [ticketonAdapter(), kassirAdapter(), manualAdapter()];
}

export interface ParseResult {
  ok: boolean;
  bySource: Record<string, number>;
  matched: number;       // прошли кавказский фильтр
  upserted: number;
  byType: Record<EventType, number>;
  events: NormalizedEvent[];
  errors: string[];
  debug?: Record<string, { links: number; prefiltered: number; fetchErrors: number }>;
}

export interface RunOptions {
  adapters?: SourceAdapter[];
  fetchFn?: typeof fetch;
  log?: (msg: string) => void;
  maxDetailFetches?: number;
  now?: Date;
  dryRun?: boolean;       // не писать в БД, только вернуть события
  sources?: string[];     // выполнить только адаптеры с этими именами (напр. ["ticketon"])
  maxMs?: number;         // мягкий дедлайн раннера (по умолчанию 50000), чтобы не упереться в лимит serverless
  upsert?: (events: NormalizedEvent[]) => Promise<number>;
}

/** Полный цикл: собрать → отфильтровать → нормализовать → дедуп → upsert. */
export async function runParser(options: RunOptions = {}): Promise<ParseResult> {
  let adapters = options.adapters ?? defaultAdapters();
  if (options.sources?.length) adapters = adapters.filter((a) => options.sources!.includes(a.name));
  const fetchFn = options.fetchFn ?? proxiedFetch(fetch);
  const log = options.log ?? (() => {});
  const now = options.now ?? new Date();
  const debug: Record<string, { links: number; prefiltered: number; fetchErrors: number }> = {};
  const ctx: AdapterContext = {
    fetchFn, log,
    maxDetailFetches: options.maxDetailFetches ?? 40,
    deadlineMs: Date.now() + (options.maxMs ?? 50000),
    debug,
  };

  const result: ParseResult = {
    ok: true, bySource: {}, matched: 0, upserted: 0,
    byType: { tournament: 0, concert: 0 }, events: [], errors: [], debug,
  };

  const seen = new Set<string>();
  for (const adapter of adapters) {
    if (!adapter.enabled) continue;
    if (past(ctx)) { result.errors.push(`${adapter.name}: пропущен (дедлайн)`); continue; }
    try {
      const candidates = await adapter.run(ctx);
      result.bySource[adapter.name] = candidates.length;
      for (const c of candidates) {
        if (adapter.applyCaucasusFilter && !isCaucasian(c.title, c.sourceUid || c.url)) continue;
        result.matched++;
        const ev = normalize(c, now);
        if (seen.has(ev.dedup_key)) continue;
        seen.add(ev.dedup_key);
        result.events.push(ev);
        result.byType[ev.event_type]++;
      }
    } catch (e: any) {
      result.ok = false;
      result.errors.push(`${adapter.name}: ${e?.message || e}`);
      log(`Адаптер ${adapter.name} упал: ${e?.message || e}`);
    }
  }

  if (!options.dryRun && result.events.length) {
    try {
      const upsertFn = options.upsert ?? supabaseUpsert;
      result.upserted = await upsertFn(result.events);
    } catch (e: any) {
      result.ok = false;
      result.errors.push(`upsert: ${e?.message || e}`);
    }
  }
  return result;
}

// ───────────────────────────── Supabase upsert ──────────────────────────────

/** Upsert в public.dance_events по dedup_key. Статус НЕ перезаписывается (сохраняем правки оператора). */
export async function supabaseUpsert(events: NormalizedEvent[]): Promise<number> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase не сконфигурирован");

  // status исключаем из payload, чтобы merge-duplicates не затирал статус публикации.
  const rows = events.map(({ status, ...e }: any) => ({ ...e, updated_at: new Date().toISOString() }));

  const res = await fetch(`${url}/rest/v1/dance_events?on_conflict=dedup_key`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as unknown[];
  return data.length;
}

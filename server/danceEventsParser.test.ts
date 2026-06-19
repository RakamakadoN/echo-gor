import assert from "node:assert";
import {
  isCaucasian, classifyEventType, classifyAudience, parseDates, buildDedupKey,
  normalize, runParser, ticketonAdapter, manualAdapter,
  type RawCandidate, type SourceAdapter,
} from "./danceEventsParser";

let passed = 0;
const ok = (name: string, cond: boolean) => { assert.ok(cond, "FAIL: " + name); passed++; };

// isCaucasian
ok("cyr lezginka", isCaucasian("Ансамбль «Лезгинка» — концерт"));
ok("cyr kavkaz", isCaucasian("Ритмы Кавказа"));
ok("translit slug", isCaucasian("Some Title", "gala-lezginka-2026"));
ok("non-caucasian rejected", !isCaucasian("Enrique Iglesias в Алматы", "enrique-iglesias-almaty"));
ok("yo normalized", isCaucasian("Нальмэс"));

// classifyEventType
ok("type tournament", classifyEventType("Кубок Кавказа по лезгинке") === "tournament");
ok("type championship", classifyEventType("Чемпионат по кавказским танцам") === "tournament");
ok("type concert default", classifyEventType("Концерт ансамбля Лезгинка") === "concert");

// classifyAudience
ok("aud kids", classifyAudience("Турнир по лезгинке среди детей") === "kids");
ok("aud adults", classifyAudience("Турнир для взрослых 18+") === "adults");
ok("aud all", classifyAudience("Открытый турнир по кавказским танцам") === "all");
ok("aud kids via 6+", classifyAudience("Турнир", "6+") === "kids");

// parseDates
const NOW = new Date("2026-06-20T00:00:00Z");
assert.deepStrictEqual(parseDates("27 июня, 13:00", NOW), { start: "2026-06-27", end: null });
assert.deepStrictEqual(parseDates("5 сентября", NOW), { start: "2026-09-05", end: null });
assert.deepStrictEqual(parseDates("12-14 июля", NOW), { start: "2026-07-12", end: "2026-07-14" });
assert.deepStrictEqual(parseDates("10-01-2026", NOW), { start: "2026-01-10", end: null });
assert.deepStrictEqual(parseDates("10-01-2026 11-01-2026", NOW), { start: "2026-01-10", end: "2026-01-11" });
assert.deepStrictEqual(parseDates("5 марта", NOW), { start: "2027-03-05", end: null }); // март прошёл → +1 год
passed += 6;
ok("parseDates empty", parseDates(undefined, NOW).start === null);

// dedup key stable
const k1 = buildDedupKey({ source: "ticketon", sourceUid: "abc", title: "X", start: null });
ok("dedup uses uid", k1 === "ticketon:abc");
const k2 = buildDedupKey({ source: "manual", title: "Кубок Кавказа", start: "2026-09-12", city: "Махачкала" });
const k3 = buildDedupKey({ source: "manual", title: "кубок  кавказа ", start: "2026-09-12", city: "махачкала" });
ok("dedup normalized equal", k2 === k3);

// normalize
const ev = normalize({
  title: "Кубок Кавказа по лезгинке — дети", url: "u", source: "manual",
  dateText: "12-14 сентября", city: "Махачкала", country: "RU", ageText: "8-15",
}, NOW);
ok("normalize type", ev.event_type === "tournament");
ok("normalize audience", ev.audience === "kids");
ok("normalize dates", ev.start_date === "2026-09-12" && ev.end_date === "2026-09-14");

// runParser with mock adapter (dryRun, dedup, type counts)
async function testRunner() {
  const mock: SourceAdapter = {
    name: "mock", enabled: true, applyCaucasusFilter: true,
    async run() {
      return [
        { title: "Концерт ансамбля Лезгинка", url: "a", source: "mock", sourceUid: "1", dateText: "27 июня" },
        { title: "Чемпионат по кавказским танцам — дети", url: "b", source: "mock", sourceUid: "2", dateText: "5 июля" },
        { title: "Enrique Iglesias", url: "c", source: "mock", sourceUid: "3" }, // отсеется
        { title: "Концерт ансамбля Лезгинка", url: "a", source: "mock", sourceUid: "1" }, // дубль
      ] as RawCandidate[];
    },
  };
  const r = await runParser({ adapters: [mock], dryRun: true, now: NOW });
  ok("runner matched=2 (filter+dedup)", r.matched === 3 && r.events.length === 2);
  ok("runner concert count", r.byType.concert === 1);
  ok("runner tournament count", r.byType.tournament === 1);
  ok("runner no upsert in dryRun", r.upserted === 0);
}

// ticketonAdapter with mock fetch (extraction + slug prefilter + caucasus confirm)
async function testTicketon() {
  const listHtml = `
    <a href="/almaty/event/enrique-iglesias-almaty-2026">Enrique</a>
    <a href="/almaty/event/ansambl-lezginka-almaty">Лезгинка</a>
    <a href="/promo/some-promo">promo</a>`;
  const detailHtml = `<html><head>
    <meta property="og:title" content="Государственный ансамбль «Лезгинка» в Алматы" />
    <meta property="og:image" content="https://img/x.jpg" />
    </head><body>5 сентября, 19:00 От 15 000 ₸</body></html>`;
  const mockFetch = (async (url: string) => {
    const body = String(url).includes("/event/ansambl-lezginka") || String(url).includes("/promo/")
      ? detailHtml
      : String(url).includes("/concerts") ? listHtml : "";
    return { ok: true, status: 200, text: async () => body } as any;
  }) as unknown as typeof fetch;

  const adapter = ticketonAdapter({ cities: [{ slug: "almaty", city: "Алматы", country: "KZ" }] });
  const cands = await adapter.run({ fetchFn: mockFetch, log: () => {}, maxDetailFetches: 10 });
  // только slug с транслит-маркером (ansambl/lezginka) проходит пред-фильтр
  ok("ticketon found lezginka", cands.some((c) => c.title.includes("Лезгинка")));
  ok("ticketon rejected enrique", !cands.some((c) => c.title.includes("Enrique")));
  const lz = cands.find((c) => c.title.includes("Лезгинка"))!;
  ok("ticketon parsed price", lz.priceText === "от 15 000 ₸");
  ok("ticketon parsed date", lz.dateText === "5 сентября");
  ok("ticketon image", lz.image === "https://img/x.jpg");
  ok("ticketon country", lz.country === "KZ");
}

await testRunner();
await testTicketon();
console.log(`\n✅ Все проверки пройдены: ${passed}`);

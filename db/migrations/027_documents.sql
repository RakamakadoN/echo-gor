-- 027_documents.sql
-- Раздел «Документолог» (только Владелец): хранилище договоров по папкам-категориям
-- + генератор договоров из шаблонов с условной логикой.
--   • documents — записи договоров; к каждой прикреплён PDF-скан подписанного экземпляра.
--   • document_templates — шаблоны генератора (тело с плейсхолдерами + поля + условные блоки).
--   • Категории-папки — через settings_lists kind='document_category' (правит владелец).
-- Идемпотентно (if not exists), безопасно применять и локально, и на проде.

-- ── Договоры (хранилище) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  category         TEXT,                                  -- из settings_lists (document_category)
  contractor       TEXT,                                  -- контрагент
  subject          TEXT,                                  -- предмет договора
  amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT '₸',
  date_start       DATE,
  date_end         DATE,                                  -- nullable — бессрочные
  auto_renew       BOOLEAN NOT NULL DEFAULT false,        -- автопролонгация
  status           TEXT NOT NULL DEFAULT 'draft',         -- draft|active|expired|terminated
  scan_url         TEXT,                                  -- PDF-скан подписанного договора (Storage)
  template_id      UUID,                                  -- если создан генератором
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_org_end    ON documents(organization_id, date_end);
CREATE INDEX IF NOT EXISTS idx_documents_org_cat    ON documents(organization_id, category);

-- ── Шаблоны генератора ───────────────────────────────────────────────────────
-- body: HTML с плейсхолдерами {{field}} и условными блоками [[if flag]]...[[/if]].
-- fields: JSON-схема полей формы [{key,label,type,required,options?}].
-- toggles: JSON-схема переключателей условной логики [{key,label,default}].
CREATE TABLE IF NOT EXISTS document_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  name             TEXT NOT NULL,
  category         TEXT,                                  -- какую папку получает сгенерированный договор
  body             TEXT NOT NULL DEFAULT '',
  fields           JSONB NOT NULL DEFAULT '[]'::jsonb,
  toggles          JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_templates_org ON document_templates(organization_id) WHERE is_active;

ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- ── Сид категорий-папок (для демо-организации) ───────────────────────────────
INSERT INTO settings_lists (organization_id, kind, label, sort_order)
SELECT '00000000-0000-0000-0000-000000000001', 'document_category', v.label, v.ord
FROM (VALUES
  ('Аренда', 0),
  ('Услуги — уборка', 1),
  ('Услуги — вывоз мусора', 2),
  ('Подрядчики / поставщики', 3),
  ('Прочее', 4)
) AS v(label, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM settings_lists s
  WHERE s.organization_id = '00000000-0000-0000-0000-000000000001'
    AND s.kind = 'document_category' AND s.label = v.label
);

-- ── Сид шаблонов генератора ──────────────────────────────────────────────────
INSERT INTO document_templates (organization_id, name, category, body, fields, toggles, sort_order)
SELECT '00000000-0000-0000-0000-000000000001', t.name, t.category, t.body, t.fields::jsonb, t.toggles::jsonb, t.ord
FROM (VALUES
  (
    'Договор аренды помещения',
    'Аренда',
    '<h2 style="text-align:center">ДОГОВОР АРЕНДЫ ПОМЕЩЕНИЯ</h2>'
    || '<p style="text-align:right">г. {{city}}, {{today}}</p>'
    || '<p>{{org_name}}, именуемое в дальнейшем «Арендатор», и {{contractor}}, именуемый в дальнейшем «Арендодатель», заключили настоящий договор о нижеследующем.</p>'
    || '<p><b>1. Предмет договора.</b> Арендодатель передаёт, а Арендатор принимает во временное пользование помещение: {{subject}}.</p>'
    || '<p><b>2. Срок аренды.</b> Договор действует с {{date_start}} по {{date_end}}.[[if auto_renew]] По окончании срока договор автоматически продлевается на тот же срок, если ни одна из сторон не заявит об отказе за 30 дней.[[/if]]</p>'
    || '<p><b>3. Арендная плата.</b> Стоимость аренды составляет {{amount}} {{currency}} в месяц.[[if vat]] В том числе НДС.[[/if]][[if !vat]] НДС не облагается.[[/if]] [[if prepay]]Оплата производится авансом до 5 числа текущего месяца.[[/if]][[if !prepay]]Оплата производится по факту до 10 числа следующего месяца.[[/if]]</p>'
    || '<p><b>4. Реквизиты и подписи сторон.</b></p><p>Арендатор: {{org_name}} ____________</p><p>Арендодатель: {{contractor}} ____________</p>',
    '[{"key":"contractor","label":"Арендодатель (контрагент)","type":"text","required":true},{"key":"subject","label":"Помещение / адрес","type":"text","required":true},{"key":"amount","label":"Арендная плата в месяц","type":"number","required":true},{"key":"date_start","label":"Дата начала","type":"date","required":true},{"key":"date_end","label":"Дата окончания","type":"date","required":false},{"key":"city","label":"Город","type":"text","required":false}]',
    '[{"key":"vat","label":"С НДС","default":false},{"key":"prepay","label":"Предоплата (аванс)","default":true},{"key":"auto_renew","label":"Автопролонгация","default":false}]',
    0
  ),
  (
    'Договор оказания услуг',
    'Подрядчики / поставщики',
    '<h2 style="text-align:center">ДОГОВОР ОКАЗАНИЯ УСЛУГ</h2>'
    || '<p style="text-align:right">г. {{city}}, {{today}}</p>'
    || '<p>{{org_name}}, именуемое «Заказчик», и {{contractor}}, именуемый «Исполнитель», заключили настоящий договор.</p>'
    || '<p><b>1. Предмет.</b> Исполнитель обязуется оказать услуги: {{subject}}.</p>'
    || '<p><b>2. Срок.</b> Услуги оказываются с {{date_start}} по {{date_end}}.[[if auto_renew]] Договор автоматически продлевается, если стороны не заявят об отказе за 30 дней.[[/if]]</p>'
    || '<p><b>3. Стоимость.</b> {{amount}} {{currency}}.[[if vat]] В том числе НДС.[[/if]][[if !vat]] НДС не облагается.[[/if]] [[if prepay]]Предоплата 100%.[[/if]][[if !prepay]]Оплата по факту оказания услуг.[[/if]][[if act]] Приёмка оформляется актом выполненных работ.[[/if]]</p>'
    || '<p><b>4. Подписи.</b></p><p>Заказчик: {{org_name}} ____________</p><p>Исполнитель: {{contractor}} ____________</p>',
    '[{"key":"contractor","label":"Исполнитель (контрагент)","type":"text","required":true},{"key":"subject","label":"Какие услуги","type":"text","required":true},{"key":"amount","label":"Стоимость","type":"number","required":true},{"key":"date_start","label":"Дата начала","type":"date","required":true},{"key":"date_end","label":"Дата окончания","type":"date","required":false},{"key":"city","label":"Город","type":"text","required":false}]',
    '[{"key":"vat","label":"С НДС","default":false},{"key":"prepay","label":"Предоплата","default":false},{"key":"act","label":"С актом приёмки","default":true},{"key":"auto_renew","label":"Автопролонгация","default":false}]',
    1
  )
) AS t(name, category, body, fields, toggles, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM document_templates d
  WHERE d.organization_id = '00000000-0000-0000-0000-000000000001' AND d.name = t.name
);

-- 049_create_subscription_sale_tx.sql
-- Аудит #11: атомарная продажа абонемента. Раньше сервер делал 3 отдельных
-- REST-вставки (student_subscriptions → payments → finance_transactions), и сбой
-- между ними оставлял «проданный» абонемент без денег (или платёж без проводки).
-- Эта функция выполняет все три вставки ОДНОЙ транзакцией (тело plpgsql = единая
-- транзакция) и возвращает созданные абонемент и платёж.
--
-- Доступ: только service_role (сервер). SECURITY DEFINER обходит RLS, поэтому
-- EXECUTE отозван у public/anon/authenticated.

create or replace function public.create_subscription_sale_tx(
  p_org uuid,
  p_branch uuid,
  p_student uuid,
  p_plan uuid,
  p_group uuid,
  p_kind text,
  p_starts date,
  p_ends date,
  p_lessons int,
  p_price numeric,
  p_amount_paid numeric,
  p_sold_on date,
  p_discount numeric,
  p_status text,
  p_sold_by text,
  p_created_by uuid,
  p_paid boolean,
  p_method text,
  p_pay_comment text,
  p_income_category uuid,
  p_description text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub_id uuid;
  v_pay_id uuid := null;
  v_sub jsonb;
  v_pay jsonb := null;
begin
  insert into public.student_subscriptions(
    student_id, plan_id, branch_id, group_id, kind, starts_on, ends_on,
    lessons_total, lessons_left, price, amount_paid, sold_on, discount_amount,
    status, sold_by_name
  ) values (
    p_student, p_plan, p_branch, p_group,
    case when p_kind = 'individual' then 'individual' else 'group' end,
    p_starts, p_ends, p_lessons, p_lessons, p_price,
    case when p_paid then p_amount_paid else null end,
    p_sold_on, p_discount, p_status::record_status, p_sold_by
  ) returning id into v_sub_id;

  if p_paid and coalesce(p_amount_paid, 0) > 0 then
    insert into public.payments(
      organization_id, branch_id, student_id, amount, method, status,
      comment, created_by, sold_by_name
    ) values (
      p_org, p_branch, p_student, p_amount_paid,
      p_method::payment_method, 'paid'::payment_status,
      p_pay_comment, p_created_by, p_sold_by
    ) returning id into v_pay_id;

    insert into public.finance_transactions(
      organization_id, branch_id, student_id, payment_id, amount, type,
      category, category_id, description
    ) values (
      p_org, p_branch, p_student, v_pay_id, p_amount_paid, 'income',
      'tuition', p_income_category, p_description
    );
  end if;

  select to_jsonb(s.*) into v_sub from public.student_subscriptions s where s.id = v_sub_id;
  if v_pay_id is not null then
    select to_jsonb(p.*) into v_pay from public.payments p where p.id = v_pay_id;
  end if;

  return jsonb_build_object('subscription', v_sub, 'payment', v_pay);
end;
$$;

revoke execute on function public.create_subscription_sale_tx(
  uuid, uuid, uuid, uuid, uuid, text, date, date, int, numeric, numeric, date,
  numeric, text, text, uuid, boolean, text, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.create_subscription_sale_tx(
  uuid, uuid, uuid, uuid, uuid, text, date, date, int, numeric, numeric, date,
  numeric, text, text, uuid, boolean, text, text, uuid, text
) to service_role;

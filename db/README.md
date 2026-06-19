# Echo Gor 1.0 MVP Database

This folder contains the MVP database schema for Echo Gor 1.0.

Scope:

- Operational CRM for a dance school network.
- Branches, staff, halls, groups, students, schedule, attendance, subscriptions, invoices, payments, tasks, notifications, audit log.
- No AI layer.
- No achievements/gamification.
- No parent cabinet.

## Migration

Run migrations in order:

```sql
db/migrations/001_ehogor_mvp_schema.sql
db/seed_mvp_demo.sql
```

The schema is written for PostgreSQL and uses `pgcrypto` for UUID generation.

## Supabase

Create a Supabase project, open SQL Editor, and run:

1. `db/migrations/001_ehogor_mvp_schema.sql`
2. `db/seed_mvp_demo.sql`

Then configure the server environment:

```bash
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

The service role key is server-only. Do not expose it to Vite/browser code.

## Roles

| Role | DB value | Scope |
| --- | --- | --- |
| Owner | `owner` | Sees and manages the whole network. |
| Branch manager | `branch_manager` | Sees and manages one assigned branch. |
| Administrator | `admin` | Handles day-to-day CRM operations for assigned branch. |
| Teacher | `teacher` | Works with assigned groups, lessons, attendance, and student notes/comments. |

MVP does not create login roles for parents or students.

## Core Relationships

- `branches` own halls, groups, students, lessons, payments, invoices, tasks, and notifications.
- `users.branch_id` limits branch-level employees to one branch.
- `branches.manager_id` points to the branch manager in `users`.
- `groups` belong to one branch and may have one hall and one teacher.
- `students` belong to one branch and may belong to one group.
- `subscription_plans` define saleable plans.
- `student_subscriptions` attach a plan to a student for a period.
- `invoices` can be linked to a student subscription.
- `payments` can be linked to an invoice.
- `schedule_lessons` define lessons by branch, group, teacher, hall, and time.
- `attendance` marks one student in one lesson.
- `tasks` can be general branch tasks or student-related tasks.
- `notifications` store outbound operational messages.
- `audit_logs` store who changed what and when.

## MVP Access Model

| Entity | Owner | Branch manager | Admin | Teacher |
| --- | --- | --- | --- | --- |
| Branches | All CRUD | Read own | Read own | Read own |
| Users | All CRUD | CRUD own branch staff | Read own branch staff | Read self |
| Halls | All CRUD | CRUD own branch | CRUD own branch | Read own branch |
| Groups | All CRUD | CRUD own branch | CRUD own branch | Read assigned |
| Students | All CRUD | CRUD own branch | CRUD own branch | Read/update assigned |
| Schedule | All CRUD | CRUD own branch | CRUD own branch | Read/update assigned lessons |
| Attendance | All read | Read own branch | CRUD own branch | Mark assigned lessons |
| Subscriptions | All CRUD | Read own branch | CRUD own branch | Read assigned students |
| Invoices/payments | All CRUD | Read own branch | CRUD own branch | No write |
| Tasks | All CRUD | CRUD own branch | CRUD own branch | Read/update assigned |
| Notifications | All CRUD | CRUD own branch | CRUD own branch | Create group messages if allowed |
| Audit log | All read | Read own branch | No direct access | No direct access |

Authorization should be enforced in the API layer using `users.role` and `users.branch_id`.

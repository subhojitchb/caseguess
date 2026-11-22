-- Run once, after schema.sql and seed.sql. Safe to re-run.
alter table evidence add column if not exists purpose text;

create table if not exists board_state(
  investigation_id uuid primary key references investigations on delete cascade,
  nodes jsonb not null default '{}', links jsonb not null default '[]', journal text not null default '',
  updated_at timestamptz default now());
drop trigger if exists t_bs on board_state;
create trigger t_bs before update on board_state for each row execute function set_updated_at();
alter table board_state enable row level security;
drop policy if exists bs_own on board_state;
create policy bs_own on board_state for all
  using (exists(select 1 from investigations i where i.id=investigation_id and i.user_id=auth.uid()))
  with check (exists(select 1 from investigations i where i.id=investigation_id and i.user_id=auth.uid()));

-- Findings (statement vs evidence). A row is readable only after the player has collected its evidence.
create table if not exists contradictions(id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases on delete cascade, suspect_id uuid not null references suspects on delete cascade,
  evidence_id uuid not null references evidence on delete cascade, finding text not null);
create index if not exists contradictions_case on contradictions(case_id);
alter table contradictions enable row level security;
drop policy if exists contra_read on contradictions;
create policy contra_read on contradictions for select to authenticated using (
  exists(select 1 from collected_evidence ce join investigations i on i.id=ce.investigation_id
         where i.user_id=auth.uid() and ce.evidence_id=contradictions.evidence_id));

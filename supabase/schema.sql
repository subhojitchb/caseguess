-- CASEGUESS schema. Run in Supabase SQL editor.
create extension if not exists pgcrypto;
create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

create table profiles(id uuid primary key references auth.users on delete cascade, display_name text not null default 'Detective', avatar_url text,
  xp int not null default 0, cases_solved int not null default 0, attempts int not null default 0, created_at timestamptz default now(), updated_at timestamptz default now());
create table cases(id uuid primary key default gen_random_uuid(), number int unique not null, title text not null, difficulty text not null check (difficulty in ('easy','medium','hard')),
  category text not null, intro text not null, location text not null, est_minutes int not null, motives text[] not null, methods text[] not null, created_at timestamptz default now());
create table suspects(id uuid primary key default gen_random_uuid(), case_id uuid not null references cases on delete cascade, name text not null, age int, relation text, background text, motive_hint text, alibi text, statement text);
create table evidence(id uuid primary key default gen_random_uuid(), case_id uuid not null references cases on delete cascade, title text not null, location text, description text not null);
create table case_solutions(case_id uuid primary key references cases on delete cascade, suspect_id uuid not null references suspects, motive_idx int not null, method_idx int not null, explanation text not null, key_evidence uuid[] not null default '{}');
create table investigations(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, case_id uuid not null references cases on delete cascade,
  hints_used int not null default 0, started_at timestamptz default now(), updated_at timestamptz default now(), unique(user_id,case_id));
create table collected_evidence(investigation_id uuid references investigations on delete cascade, evidence_id uuid references evidence on delete cascade, collected_at timestamptz default now(), primary key(investigation_id,evidence_id));
create table accusations(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, case_id uuid not null references cases on delete cascade,
  suspect_id uuid, motive_idx int, method_idx int, score int not null, correct boolean not null, created_at timestamptz default now(), unique(user_id,case_id));
create table achievements(id text primary key, name text not null, description text not null);
create table player_achievements(user_id uuid references profiles on delete cascade, achievement_id text references achievements, earned_at timestamptz default now(), primary key(user_id,achievement_id));
create table daily_challenges(day date primary key, case_id uuid not null references cases);
create index on suspects(case_id); create index on evidence(case_id); create index on accusations(user_id); create index on investigations(user_id);
create trigger t_p before update on profiles for each row execute function set_updated_at();
create trigger t_i before update on investigations for each row execute function set_updated_at();

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,display_name,avatar_url) values(new.id, coalesce(new.raw_user_meta_data->>'full_name','Detective'), new.raw_user_meta_data->>'avatar_url') on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- RLS: solutions have RLS on and NO policy => unreadable by clients.
alter table profiles enable row level security; alter table cases enable row level security; alter table suspects enable row level security; alter table evidence enable row level security;
alter table case_solutions enable row level security; alter table investigations enable row level security; alter table collected_evidence enable row level security;
alter table accusations enable row level security; alter table achievements enable row level security; alter table player_achievements enable row level security; alter table daily_challenges enable row level security;
create policy p_self on profiles for select using (auth.uid()=id);
create policy c_read on cases for select to authenticated using (true);
create policy s_read on suspects for select to authenticated using (true);
create policy e_read on evidence for select to authenticated using (true);
create policy a_read on achievements for select to authenticated using (true);
create policy d_read on daily_challenges for select to authenticated using (true);
create policy i_own on investigations for all using (auth.uid()=user_id) with check (auth.uid()=user_id and hints_used>=0);
create policy ce_own on collected_evidence for all using (exists(select 1 from investigations i where i.id=investigation_id and i.user_id=auth.uid()))
  with check (exists(select 1 from investigations i where i.id=investigation_id and i.user_id=auth.uid()));
create policy acc_own on accusations for select using (auth.uid()=user_id);
create policy pa_own on player_achievements for select using (auth.uid()=user_id);
-- No insert/update policies on profiles or accusations: XP and scores only change via the RPC below.

create view leaderboard with (security_invoker=false) as
  select display_name, avatar_url, xp, cases_solved from profiles order by xp desc limit 50;
grant select on leaderboard to authenticated;

create function submit_accusation(p_case uuid, p_suspect uuid, p_motive int, p_method int) returns json
language plpgsql security definer set search_path=public as $$
declare s case_solutions%rowtype; inv investigations%rowtype; ev_found int; ev_total int; sc int:=0; ok boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists(select 1 from accusations where user_id=auth.uid() and case_id=p_case) then raise exception 'already submitted'; end if;
  select * into s from case_solutions where case_id=p_case; select * into inv from investigations where user_id=auth.uid() and case_id=p_case;
  if inv.id is null then raise exception 'start the investigation first'; end if;
  select count(*) into ev_found from collected_evidence where investigation_id=inv.id;
  select count(*) into ev_total from evidence where case_id=p_case;
  if p_suspect=s.suspect_id then sc:=sc+500; end if;
  if p_motive=s.motive_idx then sc:=sc+250; end if;
  if p_method=s.method_idx then sc:=sc+250; end if;
  sc:=sc+ (100*ev_found/greatest(ev_total,1)) - 25*inv.hints_used
        - least(100, (extract(epoch from now()-inv.started_at)/60)::int);
  sc:=greatest(sc,0); ok:=(p_suspect=s.suspect_id);
  insert into accusations(user_id,case_id,suspect_id,motive_idx,method_idx,score,correct) values(auth.uid(),p_case,p_suspect,p_motive,p_method,sc,ok);
  update profiles set xp=xp+sc, attempts=attempts+1, cases_solved=cases_solved+(case when ok then 1 else 0 end) where id=auth.uid();
  return json_build_object('correct',ok,'score',sc,'suspect_id',s.suspect_id,'motive_idx',s.motive_idx,'method_idx',s.method_idx,'explanation',s.explanation,'key_evidence',s.key_evidence);
end $$;
revoke all on function submit_accusation from public; grant execute on function submit_accusation to authenticated;

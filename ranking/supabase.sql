-- qfadesign · ranking de jueguitos
-- Pegar TODO esto en Supabase > SQL Editor > New query > Run.

-- 1) Jugadores: apodo + número correlativo (1, 2, 3…) + huella del código secreto (nunca se publica)
create table if not exists public.players (
  id         bigint generated always as identity primary key,
  apodo      text not null check (char_length(apodo) between 2 and 16),
  tag        text not null check (tag ~ '^[0-9]{1,6}$'),
  token_hash text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists players_apodo_tag_uq on public.players (lower(apodo), tag);

-- 2) Puntajes: uno por jugador, juego y modo (se guarda solo el mejor)
create table if not exists public.scores (
  player_id  bigint not null references public.players(id) on delete cascade,
  juego      text   not null,
  modo       text   not null,
  puntaje    int    not null check (puntaje >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, juego, modo)
);

-- 3) Nadie toca las tablas directo: todo pasa por las funciones de abajo
alter table public.players enable row level security;
alter table public.scores  enable row level security;
revoke all on public.players from anon, authenticated;
revoke all on public.scores  from anon, authenticated;

-- 4) Guardar puntaje (crea al jugador si es nuevo; si ya existe, verifica el código secreto)
create or replace function public.enviar_puntaje(
  p_juego text, p_modo text, p_apodo text, p_tag text, p_token text, p_puntaje int
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_max  int;
  v_id   bigint;
  v_hash text;
  v_stored text;
  v_best int;
begin
  -- puntaje máximo posible por juego (evita puntajes inventados)
  v_max := case p_juego when 'color' then 5000 when 'tipografia' then 1500 when 'ahorcado' then 1250 else null end;
  if v_max is null then raise exception 'juego'; end if;
  if p_modo not in ('Fácil','Medio','Difícil','Estándar','Con tiempo','Sin tiempo') then raise exception 'modo'; end if;
  if p_puntaje is null or p_puntaje < 0 or p_puntaje > v_max then raise exception 'puntaje'; end if;

  p_apodo := btrim(coalesce(p_apodo, ''));
  if p_apodo !~ '^[[:alnum:] _.-]{2,16}$' then raise exception 'apodo'; end if;
  if lower(p_apodo) ~ '(^|[^[:alpha:]])(puto|puta|mierda|verga|pija|forro|sorete|nazi)([^[:alpha:]]|$)'
     or lower(p_apodo) ~ 'hitler|nigg|fuck|cunt'
  then raise exception 'apodo_no_permitido'; end if;
  if coalesce(p_tag, '') !~ '^[0-9]{1,6}$' then raise exception 'tag'; end if;
  if char_length(coalesce(p_token, '')) < 16 then raise exception 'token'; end if;

  v_hash := encode(sha256(convert_to(p_token, 'utf8')), 'hex');

  select id, token_hash into v_id, v_stored
    from players where lower(apodo) = lower(p_apodo) and tag = p_tag;

  if not found then
    begin
      insert into players (apodo, tag, token_hash) values (p_apodo, p_tag, v_hash) returning id into v_id;
    exception when unique_violation then
      raise exception 'identidad';
    end;
  elsif v_stored <> v_hash then
    raise exception 'identidad';
  end if;

  insert into scores (player_id, juego, modo, puntaje)
  values (v_id, p_juego, p_modo, p_puntaje)
  on conflict (player_id, juego, modo) do update
    set puntaje    = greatest(scores.puntaje, excluded.puntaje),
        updated_at = case when excluded.puntaje > scores.puntaje then now() else scores.updated_at end
  returning puntaje into v_best;

  return v_best;
end $$;

-- 5) Leer el top (nunca devuelve códigos secretos)
create or replace function public.top_ranking(p_juego text, p_modo text, p_limite int default 10)
returns table (apodo text, tag text, puntaje int)
language sql security definer set search_path = public stable as $$
  select p.apodo, p.tag, s.puntaje
    from scores s join players p on p.id = s.player_id
   where s.juego = p_juego and s.modo = p_modo
   order by s.puntaje desc, s.updated_at asc
   limit least(greatest(p_limite, 1), 50);
$$;

revoke all on function public.enviar_puntaje(text,text,text,text,text,int) from public;
revoke all on function public.top_ranking(text,text,int) from public;
grant execute on function public.enviar_puntaje(text,text,text,text,text,int) to anon;
grant execute on function public.top_ranking(text,text,int) to anon;

-- 6) Números correlativos: el primer jugador es #1, el segundo #2, etc.
create sequence if not exists public.players_tag_seq start 1;
create or replace function public.nuevo_numero() returns text
language sql security definer set search_path = public as $$ select nextval('public.players_tag_seq')::text; $$;
revoke all on function public.nuevo_numero() from public;
grant execute on function public.nuevo_numero() to anon;

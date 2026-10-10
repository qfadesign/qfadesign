-- Números correlativos después del # (1, 2, 3…).
-- Correr en Supabase: SQL Editor -> New query -> pegar TODO -> Run. Se puede volver a correr sin problema.
-- Los jugadores que ya existen conservan su número; los nuevos empiezan en 1.

-- 1) El número ya no tiene que ser de exactamente 4 cifras
alter table public.players drop constraint if exists players_tag_check;
alter table public.players drop constraint if exists players_tag_formato;
alter table public.players add constraint players_tag_formato check (tag ~ '^[0-9]{1,6}$');

-- 2) Contador de números
create sequence if not exists public.players_tag_seq start 1;
-- (para volver a empezar desde 1, por ejemplo después de borrar jugadores de prueba:)
-- alter sequence public.players_tag_seq restart 1;
create or replace function public.nuevo_numero() returns text
language sql security definer set search_path = public as $$ select nextval('public.players_tag_seq')::text; $$;
revoke all on function public.nuevo_numero() from public;
grant execute on function public.nuevo_numero() to anon;

-- 3) Guardar puntaje: ahora acepta números de 1 a 6 cifras
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

revoke all on function public.enviar_puntaje(text,text,text,text,text,int) from public;
grant execute on function public.enviar_puntaje(text,text,text,text,text,int) to anon;

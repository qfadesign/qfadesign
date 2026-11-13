-- qfadesign · ¿Ya jugó hoy? (desafíos del día: 'diario' = Color del día, 'concepto' = Concepto del día).
-- Correr una sola vez: SQL Editor -> New query -> pegar TODO -> Run. Se puede volver a correr sin problema.
-- Devuelve el puntaje del jugador en ese juego y fecha, o null si todavía no jugó (o si el secreto no coincide).
-- Sirve para que un mismo usuario no pueda jugar de nuevo el desafío del día desde otro dispositivo.
-- No toca jugadores ni puntajes.

create or replace function public.ya_jugo(p_juego text, p_modo text, p_apodo text, p_tag text, p_token text)
returns int
language sql security definer set search_path = public stable as $$
  select s.puntaje
    from scores s
    join players p on p.id = s.player_id
   where lower(p.apodo) = lower(btrim(coalesce(p_apodo, '')))
     and p.tag = p_tag
     and p.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex')
     and s.juego = p_juego
     and s.modo = p_modo
   limit 1;
$$;

revoke all on function public.ya_jugo(text,text,text,text,text) from public;
grant execute on function public.ya_jugo(text,text,text,text,text) to anon;

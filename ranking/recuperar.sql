-- Recuperar nombre en otro dispositivo + ponerle código a un nombre que ya existe.
-- Correr en Supabase: SQL Editor -> New query -> pegar TODO -> Run. Se puede volver a correr sin problema.
-- Solo responde si existe el jugador apodo#número con ese secreto; no devuelve ningún dato.
create or replace function public.verificar_jugador(p_apodo text, p_tag text, p_token text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players
    where lower(apodo) = lower(p_apodo)
      and tag = p_tag
      and token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex')
  );
$$;

revoke all on function public.verificar_jugador(text, text, text) from public;
grant execute on function public.verificar_jugador(text, text, text) to anon;

-- Ponerle (o cambiar) el código a un nombre que ya existe: solo si se manda el secreto actual de ese nombre.
create or replace function public.poner_codigo(p_apodo text, p_tag text, p_token text, p_token_nuevo text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare filas int;
begin
  if char_length(coalesce(p_token_nuevo, '')) < 16 then return false; end if;
  update public.players
     set token_hash = encode(sha256(convert_to(p_token_nuevo, 'utf8')), 'hex')
   where lower(apodo) = lower(p_apodo)
     and tag = p_tag
     and token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  get diagnostics filas = row_count;
  return filas > 0;
end;
$$;

revoke all on function public.poner_codigo(text, text, text, text) from public;
grant execute on function public.poner_codigo(text, text, text, text) to anon;

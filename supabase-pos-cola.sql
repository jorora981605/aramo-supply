-- ═══════════════════════════════════════════════════════════════════════════
-- ARAMO POS · Caja compartida: la compu y el celular cobran AL MISMO TIEMPO (2026-11-27)
-- Pegá TODO esto en Supabase → SQL Editor → Run (una sola vez). No borra nada.
--
-- Cómo funciona:
-- • El POS de cada local sigue teniendo una sola copia en la nube y un aparato
--   que la guarda ("el que tiene la caja").
-- • Los otros aparatos ya no quedan solo mirando: lo que cobran (una venta, un
--   pago de fiado, anular una factura…) entra a esta fila, el aparato que tiene
--   la caja lo anota en el POS en un par de segundos y le devuelve el resultado.
-- • Cada cosa se anota UNA sola vez. Si el que tiene la caja se apaga, el otro
--   aparato la toma solo y sigue.
-- • Se usa la misma contraseña del POS del local. Lo viejo se borra a los 3 días.
-- Necesita lo de supabase-pos.sql (ya pegado).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.pos_cola (
  id        text primary key,
  sucursal  text not null,
  disp      text not null,
  nombre    text,
  c         text not null,
  args      jsonb not null default '[]'::jsonb,
  estado    text not null default 'pendiente',
  res       jsonb,
  creado    timestamptz not null default now(),
  hecho_en  timestamptz
);
create index if not exists pos_cola_pendiente on public.pos_cola (sucursal, estado, creado);
alter table public.pos_cola enable row level security;
revoke all on public.pos_cola from anon, authenticated;

-- Un aparato que no tiene la caja manda algo a la fila
create or replace function public.pos_cola_poner(p_suc text, p_clave text, p_disp text, p_nombre text, p_id text, p_c text, p_args jsonb)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  if coalesce(p_id, '') = '' or length(p_id) > 80 or coalesce(p_c, '') = '' or length(p_c) > 60 or coalesce(p_disp, '') = '' then
    return json_build_object('ok', false, 'motivo', 'datos');
  end if;
  if octet_length(coalesce(p_args, '[]'::jsonb)::text) > 300000 then return json_build_object('ok', false, 'motivo', 'grande'); end if;
  insert into public.pos_cola (id, sucursal, disp, nombre, c, args)
    values (p_id, p_suc, p_disp, left(coalesce(p_nombre, ''), 60), p_c, coalesce(p_args, '[]'::jsonb))
    on conflict (id) do nothing;
  return json_build_object('ok', true, 'estado', public.pos_info(p_suc));
end $$;

-- El aparato que tiene la caja pide lo pendiente (y así también avisa que sigue vivo)
create or replace function public.pos_cola_pendientes(p_suc text, p_clave text, p_disp text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  if not exists (select 1 from public.pos_sucursal where sucursal = p_suc and dueno = p_disp) then
    return json_build_object('ok', false, 'motivo', 'otro_dueno', 'estado', public.pos_info(p_suc));
  end if;
  update public.pos_sucursal set dueno_visto = now() where sucursal = p_suc and dueno = p_disp;
  delete from public.pos_cola where sucursal = p_suc and creado < now() - interval '3 days';
  return json_build_object('ok', true, 'estado', public.pos_info(p_suc), 'filas', coalesce((
    select json_agg(json_build_object('id', q.id, 'disp', q.disp, 'nombre', q.nombre, 'c', q.c, 'args', q.args) order by q.creado)
      from (select * from public.pos_cola where sucursal = p_suc and estado = 'pendiente' order by creado limit 30) q), '[]'::json));
end $$;

-- El aparato que tiene la caja devuelve el resultado (ya quedó anotado y subido)
create or replace function public.pos_cola_listo(p_suc text, p_clave text, p_disp text, p_id text, p_estado text, p_res jsonb)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  if not exists (select 1 from public.pos_sucursal where sucursal = p_suc and dueno = p_disp) then
    return json_build_object('ok', false, 'motivo', 'otro_dueno');
  end if;
  update public.pos_cola
     set estado = case when p_estado = 'error' then 'error' else 'hecho' end, res = p_res, hecho_en = now()
   where sucursal = p_suc and id = p_id and estado = 'pendiente';
  return json_build_object('ok', true);
end $$;

-- El que mandó algo pregunta cómo va (sin ids: solo dice si esto ya está instalado)
create or replace function public.pos_cola_ver(p_suc text, p_clave text, p_ids text[])
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  return json_build_object('ok', true, 'estado', public.pos_info(p_suc), 'filas', coalesce((
    select json_agg(json_build_object('id', id, 'estado', estado, 'res', res))
      from public.pos_cola where sucursal = p_suc and id = any(coalesce(p_ids, '{}'::text[]))), '[]'::json));
end $$;

grant execute on function public.pos_cola_poner(text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.pos_cola_pendientes(text, text, text) to anon, authenticated;
grant execute on function public.pos_cola_listo(text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.pos_cola_ver(text, text, text[]) to anon, authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- ARAMO POS en la nube · un POS por local (Moravia y LASR), con contraseña
-- Pegá TODO esto en Supabase → SQL Editor → Run. Antes, cambiá las dos
-- contraseñas del final (CLAVE-MORAVIA y CLAVE-LASR) por las que quieras.
--
-- Cómo funciona:
-- • Cada local guarda su POS completo (productos, caja, ventas, cajeros…)
--   como una copia comprimida, partida en trozos, con un número de versión.
-- • Nadie puede leer estas tablas directamente: todo pasa por funciones que
--   piden la contraseña del local. Tras 10 intentos fallidos se bloquea 15 min.
-- • Solo un dispositivo cobra a la vez en cada local ("dueño" de la caja);
--   los demás lo ven en modo lectura o toman el control.
-- • Queda un respaldo por día de los últimos 7 días.
-- ══════════════════════════════════════════════════════════════════════
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pos_sucursal (
  sucursal     text primary key,
  clave_hash   text not null,
  version      bigint not null default 0,
  partes       int not null default 0,
  tamano       bigint not null default 0,
  dueno        text,
  dueno_nombre text,
  dueno_visto  timestamptz,
  actualizado  timestamptz,
  fallos       int not null default 0,
  bloqueado    timestamptz
);
create table if not exists public.pos_parte (
  sucursal text not null,
  version  bigint not null,
  n        int not null,
  datos    text not null,
  primary key (sucursal, version, n)
);
create table if not exists public.pos_respaldo (
  sucursal text not null,
  version  bigint not null,
  fecha    date not null,
  partes   int not null,
  tamano   bigint not null,
  creado   timestamptz not null default now(),
  primary key (sucursal, version)
);
alter table public.pos_sucursal enable row level security;
alter table public.pos_parte    enable row level security;
alter table public.pos_respaldo enable row level security;
-- (sin políticas: la llave pública no puede leer ni escribir estas tablas)

-- ── Contraseña del local (con bloqueo por intentos) ──
create or replace function public.pos_ok(p_suc text, p_clave text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare s public.pos_sucursal;
begin
  if coalesce(p_clave,'') = '' then return false; end if;  -- vacía: no cuenta como intento
  select * into s from public.pos_sucursal where sucursal = p_suc for update;
  if not found then return false; end if;
  if s.bloqueado is not null and s.bloqueado > now() then return false; end if;
  if s.clave_hash = crypt(coalesce(p_clave,''), s.clave_hash) then
    if s.fallos > 0 then update public.pos_sucursal set fallos = 0, bloqueado = null where sucursal = p_suc; end if;
    return true;
  end if;
  update public.pos_sucursal
     set fallos = s.fallos + 1,
         bloqueado = case when s.fallos + 1 >= 10 then now() + interval '15 minutes' else null end
   where sucursal = p_suc;
  return false;
end $$;

create or replace function public.pos_info(p_suc text)
returns json language sql security definer set search_path = public as $$
  select json_build_object('ok', true, 'version', version, 'partes', partes, 'tamano', tamano,
    'dueno', dueno, 'dueno_nombre', dueno_nombre, 'dueno_visto', dueno_visto, 'actualizado', actualizado,
    'ahora', now(),
    'respaldos', coalesce((select json_agg(json_build_object('version', r.version, 'fecha', r.fecha, 'tamano', r.tamano, 'creado', r.creado) order by r.version desc)
                            from public.pos_respaldo r where r.sucursal = p_suc), '[]'::json))
  from public.pos_sucursal where sucursal = p_suc
$$;

-- Entrar: valida la contraseña y devuelve el estado del POS del local
create or replace function public.pos_entrar(p_suc text, p_clave text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.pos_ok(p_suc, p_clave) then
    return json_build_object('ok', false, 'motivo',
      case when exists(select 1 from public.pos_sucursal where sucursal = p_suc and bloqueado > now()) then 'bloqueado'
           when exists(select 1 from public.pos_sucursal where sucursal = p_suc) then 'clave' else 'sin_local' end);
  end if;
  return public.pos_info(p_suc);
end $$;

-- Bajar un trozo de la copia (de la versión actual o de un respaldo)
create or replace function public.pos_bajar(p_suc text, p_clave text, p_version bigint, p_n int)
returns json language plpgsql security definer set search_path = public as $$
declare d text;
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  select datos into d from public.pos_parte where sucursal = p_suc and version = p_version and n = p_n;
  if d is null then return json_build_object('ok', false, 'motivo', 'falta'); end if;
  return json_build_object('ok', true, 'datos', d);
end $$;

-- Tomar el control de la caja en este dispositivo
create or replace function public.pos_tomar(p_suc text, p_clave text, p_disp text, p_nombre text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  update public.pos_sucursal set dueno = p_disp, dueno_nombre = left(coalesce(p_nombre,''), 60), dueno_visto = now()
   where sucursal = p_suc;
  return public.pos_info(p_suc);
end $$;

-- Latido del dueño (o consulta del estado para los que miran)
create or replace function public.pos_latido(p_suc text, p_clave text, p_disp text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  update public.pos_sucursal set dueno_visto = now() where sucursal = p_suc and dueno = p_disp;
  return public.pos_info(p_suc);
end $$;

-- Soltar la caja (al salir del POS)
create or replace function public.pos_soltar(p_suc text, p_clave text, p_disp text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  update public.pos_sucursal set dueno = null, dueno_visto = null where sucursal = p_suc and dueno = p_disp;
  return public.pos_info(p_suc);
end $$;

-- Subir un trozo de la copia nueva (solo el dueño de la caja)
create or replace function public.pos_subir(p_suc text, p_clave text, p_disp text, p_version bigint, p_n int, p_datos text)
returns json language plpgsql security definer set search_path = public as $$
declare s public.pos_sucursal;
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  select * into s from public.pos_sucursal where sucursal = p_suc;
  if s.dueno is distinct from p_disp then return json_build_object('ok', false, 'motivo', 'otro_dueno'); end if;
  if p_version <> s.version + 1 then return json_build_object('ok', false, 'motivo', 'version'); end if;
  if p_n = 0 then delete from public.pos_parte where sucursal = p_suc and version = p_version; end if;
  insert into public.pos_parte(sucursal, version, n, datos) values (p_suc, p_version, p_n, p_datos)
    on conflict (sucursal, version, n) do update set datos = excluded.datos;
  return json_build_object('ok', true);
end $$;

-- Confirmar la copia nueva: pasa a ser la versión actual
create or replace function public.pos_confirmar(p_suc text, p_clave text, p_disp text, p_base bigint, p_partes int, p_tamano bigint)
returns json language plpgsql security definer set search_path = public as $$
declare s public.pos_sucursal; v bigint; hoy date := (now() at time zone 'America/Costa_Rica')::date;
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  select * into s from public.pos_sucursal where sucursal = p_suc for update;
  if s.dueno is distinct from p_disp then return json_build_object('ok', false, 'motivo', 'otro_dueno', 'estado', public.pos_info(p_suc)); end if;
  if s.version <> p_base then return json_build_object('ok', false, 'motivo', 'version', 'estado', public.pos_info(p_suc)); end if;
  v := p_base + 1;
  if (select count(*) from public.pos_parte where sucursal = p_suc and version = v) <> p_partes then
    return json_build_object('ok', false, 'motivo', 'incompleto');
  end if;
  update public.pos_sucursal set version = v, partes = p_partes, tamano = p_tamano, actualizado = now(), dueno_visto = now()
   where sucursal = p_suc;
  -- un respaldo por día (la primera copia de cada día), últimos 7 días
  if not exists(select 1 from public.pos_respaldo where sucursal = p_suc and fecha = hoy) and s.version > 0 then
    insert into public.pos_respaldo(sucursal, version, fecha, partes, tamano) values (p_suc, s.version, hoy, s.partes, s.tamano);
  end if;
  delete from public.pos_respaldo where sucursal = p_suc and fecha < hoy - 7;
  delete from public.pos_parte p where p.sucursal = p_suc and p.version < v
    and not exists(select 1 from public.pos_respaldo r where r.sucursal = p_suc and r.version = p.version);
  delete from public.pos_parte where sucursal = p_suc and version > v;
  return json_build_object('ok', true, 'version', v);
end $$;

-- Respaldo a pedido ("💾 Respaldar ahora" en el POS): guarda la versión actual como respaldo
create or replace function public.pos_respaldar(p_suc text, p_clave text, p_disp text)
returns json language plpgsql security definer set search_path = public as $$
declare s public.pos_sucursal; hoy date := (now() at time zone 'America/Costa_Rica')::date;
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  select * into s from public.pos_sucursal where sucursal = p_suc;
  if s.version = 0 then return json_build_object('ok', false, 'motivo', 'vacio'); end if;
  insert into public.pos_respaldo(sucursal, version, fecha, partes, tamano) values (p_suc, s.version, hoy, s.partes, s.tamano)
    on conflict (sucursal, version) do nothing;
  return public.pos_info(p_suc);
end $$;

-- Poner o cambiar la contraseña de un local (solo desde este SQL Editor)
create or replace function public.pos_poner_clave(p_suc text, p_clave text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(coalesce(p_clave,'')) < 6 then raise exception 'La contraseña debe tener al menos 6 caracteres'; end if;
  insert into public.pos_sucursal(sucursal, clave_hash) values (p_suc, crypt(p_clave, gen_salt('bf', 8)))
  on conflict (sucursal) do update set clave_hash = excluded.clave_hash, fallos = 0, bloqueado = null;
end $$;

revoke all on function public.pos_ok(text, text) from public, anon, authenticated;
revoke all on function public.pos_info(text) from public, anon, authenticated;
revoke all on function public.pos_poner_clave(text, text) from public, anon, authenticated;
grant execute on function public.pos_entrar(text, text) to anon, authenticated;
grant execute on function public.pos_bajar(text, text, bigint, int) to anon, authenticated;
grant execute on function public.pos_tomar(text, text, text, text) to anon, authenticated;
grant execute on function public.pos_latido(text, text, text) to anon, authenticated;
grant execute on function public.pos_soltar(text, text, text) to anon, authenticated;
grant execute on function public.pos_subir(text, text, text, bigint, int, text) to anon, authenticated;
grant execute on function public.pos_confirmar(text, text, text, bigint, int, bigint) to anon, authenticated;
grant execute on function public.pos_respaldar(text, text, text) to anon, authenticated;

-- ▼▼▼ CAMBIÁ ESTAS DOS CONTRASEÑAS (mínimo 6 caracteres) ▼▼▼
select public.pos_poner_clave('moravia', 'CLAVE-MORAVIA');
select public.pos_poner_clave('angeles', 'CLAVE-LASR');

notify pgrst, 'reload schema';

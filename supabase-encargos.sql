-- ARAMO · seguridad, cuentas y operación de pedidos
-- Pegá este archivo completo en Supabase → SQL Editor → Run.
-- Antes de abrir al público: activá Email Auth y la confirmación de correo.
-- Agregá los usuarios del personal en public.aramo_staff después de que hayan
-- iniciado sesión una vez.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.encargos (
  id text primary key,
  data jsonb not null,
  estado text,
  sucursal text,
  owner_id uuid references auth.users(id) on delete set null,
  owner_phone text,
  kind text not null default 'order',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.encargos add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.encargos add column if not exists owner_phone text;
alter table public.encargos add column if not exists kind text not null default 'order';
create index if not exists encargos_owner_idx on public.encargos(owner_id, updated_at desc);
create index if not exists encargos_updated_idx on public.encargos(updated_at desc);

create table if not exists public.aramo_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sucursal text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.aramo_direcciones (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  lat numeric not null,
  lng numeric not null,
  senas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists aramo_direcciones_user_idx on public.aramo_direcciones(user_id, updated_at desc);

create table if not exists public.aramo_eventos (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  anon_id text,
  tipo text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists aramo_eventos_tipo_idx on public.aramo_eventos(tipo, created_at desc);

create table if not exists public.aramo_suscripciones (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sucursal text not null,
  weekday smallint not null check (weekday between 0 and 6),
  at_time time not null,
  data jsonb not null,
  activa boolean not null default true,
  next_run date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists aramo_suscripciones_due_idx on public.aramo_suscripciones(activa, next_run);

create table if not exists public.aramo_push_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  updated_at timestamptz not null default now(),
  primary key(user_id, subscription)
);

alter table public.encargos enable row level security;
alter table public.aramo_staff enable row level security;
alter table public.aramo_direcciones enable row level security;
alter table public.aramo_eventos enable row level security;
alter table public.aramo_suscripciones enable row level security;
alter table public.aramo_push_subscriptions enable row level security;

create or replace function public.aramo_es_personal()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.aramo_staff where user_id = auth.uid() and activo);
$$;
-- La política de encargos consulta esta función incluso para una visita anónima
-- (por ejemplo, al leer la ficha pública de la tienda). La función solo devuelve
-- true para una cuenta registrada en aramo_staff, así que es seguro permitir la
-- consulta al rol anon y evita el 401 "permission denied for function".
revoke all on function public.aramo_es_personal() from public;
grant execute on function public.aramo_es_personal() to anon, authenticated;

-- Quita cualquier política vieja de encargos: las políticas de RLS se combinan
-- con OR, así que una sola política permisiva dejaría abierta la tabla.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='encargos' loop
    execute format('drop policy if exists %I on public.encargos',p.policyname);
  end loop;
end $$;

drop policy if exists "encargos lectura" on public.encargos;
drop policy if exists "encargos escritura" on public.encargos;
drop policy if exists "encargos cambios" on public.encargos;
drop policy if exists "encargos lectura segura" on public.encargos;
drop policy if exists "encargos insertar seguro" on public.encargos;
drop policy if exists "encargos actualizar seguro" on public.encargos;
drop policy if exists "encargos borrar seguro" on public.encargos;
create policy "encargos lectura segura" on public.encargos for select using (
  id = '__tienda__' or public.aramo_es_personal() or owner_id = auth.uid()
);
-- Las escrituras pasan por funciones SECURITY DEFINER con validaciones.
create policy "encargos insertar seguro" on public.encargos for insert with check (false);
create policy "encargos actualizar seguro" on public.encargos for update using (false) with check (false);
create policy "encargos borrar seguro" on public.encargos for delete using (false);

-- La contraseña local del Mostrador nunca debe quedar expuesta en la ficha pública.
update public.encargos
set data = data - 'acceso'
where id = '__tienda__' and data ? 'acceso';

drop policy if exists "staff se ve a sí mismo" on public.aramo_staff;
drop policy if exists "direcciones propias" on public.aramo_direcciones;
drop policy if exists "eventos propios" on public.aramo_eventos;
drop policy if exists "eventos insertar" on public.aramo_eventos;
drop policy if exists "suscripciones propias" on public.aramo_suscripciones;
drop policy if exists "push propios" on public.aramo_push_subscriptions;
create policy "staff se ve a sí mismo" on public.aramo_staff for select using (user_id = auth.uid());
create policy "direcciones propias" on public.aramo_direcciones for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eventos propios" on public.aramo_eventos for select using (user_id = auth.uid() or public.aramo_es_personal());
create policy "eventos insertar" on public.aramo_eventos for insert with check (user_id = auth.uid() or user_id is null);
create policy "suscripciones propias" on public.aramo_suscripciones for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push propios" on public.aramo_push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.aramo_guardar_encargo(p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d jsonb; ident uuid := auth.uid();
begin
  if ident is null then
    if coalesce(p_data->>'estado','') <> 'nuevo' then raise exception 'Pedido invitado inválido'; end if;
    if length(trim(coalesce(p_data#>>'{cliente,nombre}',''))) < 2 then raise exception 'Falta el nombre de contacto'; end if;
    if length(regexp_replace(coalesce(p_data#>>'{cliente,tel}',''), '[^0-9]', '', 'g')) <> 8 then raise exception 'Falta un teléfono de contacto válido'; end if;
  end if;
  if coalesce(p_data->>'id','') = '' or p_data->>'id' = '__tienda__' then raise exception 'Pedido inválido'; end if;
  d := p_data - 'owner_id';
  insert into public.encargos(id, data, estado, sucursal, owner_id, owner_phone, kind, updated_at)
  values (d->>'id', d, d->>'estado', d->>'sucursal', ident, d#>>'{cliente,tel}', 'order', now())
  on conflict (id) do nothing;
  return d;
end $$;

create or replace function public.aramo_cambiar_encargo(p_id text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare old public.encargos; d jsonb; ident uuid := auth.uid(); es_staff boolean := false;
begin
  select * into old from public.encargos where id = p_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if ident is not null then es_staff := public.aramo_es_personal(); end if;
  if ident is null then
    if old.owner_id is not null or old.data#>>'{pin}' is distinct from p_data->>'pin' or old.data#>>'{cliente,tel}' is distinct from p_data#>>'{cliente,tel}' then raise exception 'No autorizado'; end if;
  elsif not es_staff and old.owner_id is distinct from ident then
    raise exception 'No autorizado';
  end if;
  if es_staff then
    d := jsonb_set(p_data, '{owner_id}', to_jsonb(old.owner_id), true);
  else
    d := old.data;
    -- El cliente solo puede cancelar un pedido nuevo, reportar pago, subir
    -- comprobante, aceptar/rechazar sustitución o calificar.
    if old.estado = 'nuevo' and p_data->>'estado' = 'cancelado' then
      d := jsonb_set(d, '{estado}', '"cancelado"'::jsonb, true);
    end if;
    if p_data#>>'{pago,estado}' = 'reportado' then
      d := jsonb_set(d, '{pago,estado}', '"reportado"'::jsonb, true);
      d := jsonb_set(d, '{pago,reportado}', coalesce(p_data#>'{pago,reportado}', to_jsonb(now())), true);
    end if;
    if p_data ? 'rating' and (p_data->>'rating')::int between 1 and 3 then
      d := jsonb_set(d, '{rating}', p_data->'rating', true);
    end if;
    if p_data ? 'comprobante' then d := jsonb_set(d, '{comprobante}', p_data->'comprobante', true); end if;
    if p_data ? 'subacciones' then
      d := jsonb_set(d, '{subacciones}', p_data->'subacciones', true);
      if p_data ? 'items' then d := jsonb_set(d, '{items}', p_data->'items', true); end if;
    end if;
    -- El cliente solo puede confirmar la cotización que la tienda dejó lista;
    -- nunca puede inventar una fase distinta.
    if old.data->>'fase' = 'confirmacion' and p_data->>'fase' = 'alistando' then
      d := d || jsonb_build_object('fase', 'alistando', 'confirmacion', p_data->'confirmacion');
    end if;
  end if;
  d := jsonb_set(d, '{updated}', to_jsonb(now()), true);
  update public.encargos set data=d, estado=d->>'estado', sucursal=d->>'sucursal', updated_at=now() where id=p_id;
  return d;
end $$;

-- Un invitado puede refrescar únicamente su propio pedido con el pin y el
-- teléfono que ya aparecen en el pedido. No se expone la tabla completa.
create or replace function public.aramo_leer_encargo(p_id text, p_pin text, p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  select data into d
  from public.encargos
  where id = p_id
    and owner_id is null
    and data->>'pin' = p_pin
    and data#>>'{cliente,tel}' = regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
  return d;
end $$;

create or replace function public.aramo_guardar_tienda(p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  if not public.aramo_es_personal() then raise exception 'Solo el personal puede cambiar la ficha de la tienda'; end if;
  d := p_data - 'acceso';
  insert into public.encargos(id,data,estado,kind,updated_at)
  values ('__tienda__',d,'tienda','store',now())
  on conflict (id) do update set data=excluded.data,estado='tienda',kind='store',updated_at=now();
  return d;
end $$;

create or replace function public.aramo_cupo_horario(p_sucursal text, p_at timestamptz, p_limite integer)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_limite,0) <= 0 or (
    select count(*) from public.encargos e
    where e.kind='order' and e.sucursal=p_sucursal and e.estado not in ('cancelado','entregado')
      and date_trunc('hour',(e.data#>>'{retiro,at}')::timestamptz)=date_trunc('hour',p_at)
  ) < p_limite;
$$;

create or replace function public.aramo_borrar_pedidos()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.aramo_es_personal() then raise exception 'Solo el personal puede reiniciar pedidos'; end if;
  update public.encargos set data=jsonb_build_object('id',id,'borrado',now(),'estado','borrado','v',1000000000,'created',now(),'updated',now()),estado='borrado',updated_at=now()
    where id <> '__tienda__' and kind='order';
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.aramo_guardar_direccion(p_id uuid, p_nombre text, p_lat numeric, p_lng numeric, p_senas text)
returns public.aramo_direcciones language plpgsql security definer set search_path = public as $$
declare r public.aramo_direcciones;
begin
  if auth.uid() is null then raise exception 'Se requiere iniciar sesión'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Ubicación inválida'; end if;
  insert into public.aramo_direcciones(id,user_id,nombre,lat,lng,senas,updated_at)
  values(coalesce(p_id,extensions.gen_random_uuid()),auth.uid(),left(trim(p_nombre),60),p_lat,p_lng,left(coalesce(p_senas,''),300),now())
  on conflict (id) do update set nombre=excluded.nombre,lat=excluded.lat,lng=excluded.lng,senas=excluded.senas,updated_at=now()
  returning * into r;
  return r;
end $$;

create or replace function public.aramo_registrar_evento(p_tipo text, p_data jsonb, p_anon_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.aramo_eventos(user_id,anon_id,tipo,data) values(auth.uid(),left(p_anon_id,80),left(p_tipo,40),coalesce(p_data,'{}'::jsonb));
end $$;

create or replace function public.aramo_guardar_suscripcion(p_id uuid, p_data jsonb)
returns public.aramo_suscripciones language plpgsql security definer set search_path = public as $$
declare r public.aramo_suscripciones;
begin
  if auth.uid() is null then raise exception 'Se requiere iniciar sesión'; end if;
  insert into public.aramo_suscripciones(id,user_id,sucursal,weekday,at_time,data,activa,next_run,updated_at)
  values(coalesce(p_id,extensions.gen_random_uuid()),auth.uid(),p_data->>'sucursal',greatest(0,least(6,(p_data->>'weekday')::int)),(p_data->>'at_time')::time,p_data,coalesce((p_data->>'activa')::boolean,true),(p_data->>'next_run')::date,now())
  on conflict(id) do update set data=excluded.data,activa=excluded.activa,next_run=excluded.next_run,updated_at=now()
  returning * into r;
  return r;
end $$;

create or replace function public.aramo_generar_pedidos_semanales()
returns integer language plpgsql security definer set search_path = public as $$
declare r public.aramo_suscripciones; d jsonb; nuevo text; n integer := 0;
begin
  for r in select * from public.aramo_suscripciones where activa and next_run is not null and next_run <= current_date loop
    nuevo := 'e' || replace(extensions.gen_random_uuid()::text,'-','');
    d := r.data;
    d := jsonb_set(d,'{id}',to_jsonb(nuevo),true);
    d := jsonb_set(d,'{ref}',to_jsonb('A-'||upper(substr(replace(extensions.gen_random_uuid()::text,'-',''),1,4))),true);
    d := jsonb_set(d,'{pin}',to_jsonb(lpad((floor(random()*10000))::int::text,4,'0')),true);
    d := jsonb_set(d,'{estado}','"nuevo"'::jsonb,true);
    d := jsonb_set(d,'{created}',to_jsonb(now()),true);
    d := jsonb_set(d,'{updated}',to_jsonb(now()),true);
    d := jsonb_set(d,'{canal}','"suscripcion"'::jsonb,true);
    d := jsonb_set(d,'{log}',jsonb_build_array(jsonb_build_object('t',now(),'s','nuevo','by','sistema','m','Pedido semanal generado')),true);
    insert into public.encargos(id,data,estado,sucursal,owner_id,owner_phone,kind,updated_at)
      values(nuevo,d,'nuevo',r.sucursal,r.user_id,d#>>'{cliente,tel}','order',now());
    update public.aramo_suscripciones set next_run=next_run+7,updated_at=now() where id=r.id;
    n := n+1;
  end loop;
  return n;
end $$;

grant usage on schema public to anon, authenticated;
grant select on public.encargos to anon, authenticated;
grant select,insert on public.aramo_eventos to anon, authenticated;
grant select,insert,update,delete on public.aramo_direcciones, public.aramo_suscripciones to authenticated;
grant select,insert,update,delete on public.aramo_push_subscriptions to authenticated;
grant execute on function public.aramo_guardar_encargo(jsonb) to anon, authenticated;
grant execute on function public.aramo_cambiar_encargo(text,jsonb) to anon, authenticated;
grant execute on function public.aramo_leer_encargo(text,text,text) to anon, authenticated;
grant execute on function public.aramo_guardar_tienda(jsonb) to authenticated;
grant execute on function public.aramo_cupo_horario(text,timestamptz,integer) to anon, authenticated;
grant execute on function public.aramo_borrar_pedidos() to authenticated;
grant execute on function public.aramo_guardar_direccion(uuid,text,numeric,numeric,text) to authenticated;
grant execute on function public.aramo_registrar_evento(text,jsonb,text) to anon, authenticated;
grant execute on function public.aramo_guardar_suscripcion(uuid,jsonb) to authenticated;
revoke all on function public.aramo_generar_pedidos_semanales() from public, anon, authenticated;

-- Comprobantes de SINPE: privados, solo el dueño y el personal pueden leerlos.
insert into storage.buckets(id,name,public) values('aramo-comprobantes','aramo-comprobantes',false)
on conflict (id) do update set public=false;
drop policy if exists "comprobantes subir propios" on storage.objects;
drop policy if exists "comprobantes leer propios" on storage.objects;
create policy "comprobantes subir propios" on storage.objects for insert to authenticated
with check (bucket_id='aramo-comprobantes' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "comprobantes leer propios" on storage.objects for select to authenticated
using (bucket_id='aramo-comprobantes' and ((storage.foldername(name))[1]=auth.uid()::text or public.aramo_es_personal()));

-- Fotos del catálogo: públicas para el cliente, escritura solo para personal.
insert into storage.buckets(id,name,public) values('aramo-productos','aramo-productos',true)
on conflict (id) do update set public=true;
drop policy if exists "fotos catalogo publicas" on storage.objects;
drop policy if exists "fotos catalogo personal" on storage.objects;
create policy "fotos catalogo publicas" on storage.objects for select to anon, authenticated
using (bucket_id='aramo-productos');
create policy "fotos catalogo personal" on storage.objects for all to authenticated
using (bucket_id='aramo-productos' and public.aramo_es_personal())
with check (bucket_id='aramo-productos' and public.aramo_es_personal());

do $$ begin alter publication supabase_realtime add table public.encargos; exception when duplicate_object then null; end $$;
-- Si el proyecto tiene pg_cron habilitado, genera los pedidos semanales solo.
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $cron$select cron.schedule('aramo-pedidos-semanales','*/15 * * * *','select public.aramo_generar_pedidos_semanales()')$cron$;
  end if;
exception when others then null;
end $$;
notify pgrst, 'reload schema';

-- Después del primer login del personal, rellená los UUID en esta tabla:
-- insert into public.aramo_staff(user_id,sucursal) values ('UUID-DEL-USUARIO','todas');

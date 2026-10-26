-- Pruebas de las operaciones que hacen el asistente de importación, la copia de seguridad y la
-- marca de ejemplo (entregas 9 y 10), con los permisos reales. Se deshacen siempre.
do $pruebas$
declare
  a uuid := gen_random_uuid(); e uuid := gen_random_uuid(); l uuid := gen_random_uuid();
  esp uuid; m uuid; mej uuid; p uuid; cta uuid; n int; t text;
  informe text := ''; fallos int := 0;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'y-a@ejemplo.test', 'authenticated', 'authenticated'), (e, 'y-e@ejemplo.test', 'authenticated', 'authenticated'),
    (l, 'y-l@ejemplo.test', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp := public.crear_espacio('Y');
  insert into public.marcas (espacio_id, nombre) values (esp, 'M') returning id into m;
  execute 'reset role';
  insert into public.miembros (espacio_id, usuario_id, rol) values (esp, e, 'editor'), (esp, l, 'lector');

  -- Importación como editora: publicaciones en cualquier estado del flujo, con sus redes
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.publicaciones (espacio_id, marca_id, titulo, estado, fecha_prevista, tipos, notas)
  values (esp, m, 'Importada', 'publicado', now() - interval '3 days', '{Imagen}', 'Asignado a: Ana') returning id into p;
  insert into public.publicacion_canales (publicacion_id, espacio_id, canal, fecha_publicada) values (p, esp, 'X', now() - interval '3 days');
  insert into public.publicaciones (espacio_id, marca_id, titulo, estado) values (esp, m, 'En pausa', 'en_pausa');
  select count(*) into n from public.publicaciones where marca_id = m;
  if n = 2 then informe := informe || E'\nOK  1a la editora importa publicaciones ya publicadas o en pausa, con sus redes';
  else fallos := fallos + 1; informe := informe || E'\nERR 1a ' || n; end if;
  begin
    insert into public.publicaciones (espacio_id, marca_id, titulo, estado) values (esp, m, 'Programada sin fecha', 'programado');
    fallos := fallos + 1; informe := informe || E'\nERR 1b';
  exception when check_violation then informe := informe || E'\nOK  1b «programado» exige fecha (el asistente la pasa a aprobado)';
  end;
  -- Auditoría: el asistente crea el perfil si falta y no sobrescribe un registro del mismo día
  insert into public.cuentas_red (espacio_id, marca_id, canal, nombre_perfil) values (esp, m, 'Facebook', 'Marca') returning id into cta;
  insert into public.registros_auditoria (espacio_id, cuenta_id, fecha, seguidores) values (esp, cta, '2026-10-01', 100);
  begin
    insert into public.registros_auditoria (espacio_id, cuenta_id, fecha, seguidores) values (esp, cta, '2026-10-01', 999);
    fallos := fallos + 1; informe := informe || E'\nERR 1c';
  exception when unique_violation then informe := informe || E'\nOK  1c un segundo registro del mismo perfil y día se rechaza (23505), no se sobrescribe';
  end;
  select seguidores into n from public.registros_auditoria where cuenta_id = cta;
  if n = 100 then informe := informe || E'\nOK  1d el registro original queda intacto';
  else fallos := fallos + 1; informe := informe || E'\nERR 1d'; end if;
  insert into public.importaciones (espacio_id, usuario_id, archivo, hoja, destino, filas_importadas, filas_rechazadas, detalle)
  values (esp, a, 'plan.xlsx', 'Hoja1', 'publicaciones', 2, 1, '[{"fila": 5, "motivo": "Falta el título o tema."}]');
  select usuario_id::text into t from public.importaciones where espacio_id = esp;
  if t = e::text then informe := informe || E'\nOK  1e el historial guarda a quien importó, aunque se envíe otro usuario';
  else fallos := fallos + 1; informe := informe || E'\nERR 1e'; end if;
  -- La editora no puede crear la marca de ejemplo (solo administradores crean marcas)
  begin
    insert into public.marcas (espacio_id, nombre) values (esp, 'Ejemplo (puedes borrarla)');
    fallos := fallos + 1; informe := informe || E'\nERR 1f';
  exception when insufficient_privilege then informe := informe || E'\nOK  1f la editora no crea marcas (el botón de ejemplo es solo para administradores)';
  end;
  execute 'reset role';

  -- Lectora: ve todo (puede exportar) pero no importa
  perform set_config('request.jwt.claims', json_build_object('sub', l, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.publicaciones where espacio_id = esp;
  if n = 2 then informe := informe || E'\nOK  2a la lectora ve las publicaciones para exportarlas';
  else fallos := fallos + 1; informe := informe || E'\nERR 2a ' || n; end if;
  begin
    insert into public.publicaciones (espacio_id, marca_id, titulo) values (esp, m, 'No');
    fallos := fallos + 1; informe := informe || E'\nERR 2b';
  exception when insufficient_privilege then informe := informe || E'\nOK  2b la lectora no importa';
  end;
  begin
    insert into public.importaciones (espacio_id, archivo, destino, filas_importadas, filas_rechazadas) values (esp, 'x.csv', 'publicaciones', 0, 0);
    fallos := fallos + 1; informe := informe || E'\nERR 2c';
  exception when insufficient_privilege then informe := informe || E'\nOK  2c la lectora no escribe en el historial de importaciones';
  end;
  execute 'reset role';

  -- Administradora: marca de ejemplo con publicaciones; al borrarla se borra todo lo suyo
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.marcas (espacio_id, nombre, color) values (esp, 'Ejemplo (puedes borrarla)', '#78716c') returning id into mej;
  insert into public.publicaciones (espacio_id, marca_id, titulo, estado, fecha_prevista)
  values (esp, mej, '[Ejemplo] Uno', 'en_revision', now() + interval '5 days') returning id into p;
  insert into public.publicacion_canales (publicacion_id, espacio_id, canal) values (p, esp, 'LinkedIn');
  select count(*) into n from public.publicaciones where marca_id = mej;
  if n = 1 then informe := informe || E'\nOK  3a la administradora crea la marca de ejemplo con publicaciones en revisión';
  else fallos := fallos + 1; informe := informe || E'\nERR 3a'; end if;
  -- Copia de seguridad: cada tabla se lee filtrando por espacio
  select (select count(*) from public.miembros where espacio_id = esp) + (select count(*) from public.estrategias where espacio_id = esp)
       + (select count(*) from public.publicacion_canales where espacio_id = esp) + (select count(*) from public.importaciones where espacio_id = esp) into n;
  if n = 3 + 2 + 2 + 1 then informe := informe || E'\nOK  3b la copia de seguridad lee miembros, estrategias, redes e historial del espacio';
  else fallos := fallos + 1; informe := informe || E'\nERR 3b ' || n; end if;
  delete from public.marcas where id = mej;
  select count(*) into n from public.publicaciones where marca_id = mej;
  if n = 0 then informe := informe || E'\nOK  3c borrar la marca de ejemplo borra sus publicaciones';
  else fallos := fallos + 1; informe := informe || E'\nERR 3c'; end if;
  execute 'reset role';

  raise exception 'RESULTADO: % fallos%', fallos, informe;
end
$pruebas$;

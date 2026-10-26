-- Pruebas de perfiles/auditoría, campañas e importaciones (entregas 7, 8 y 9). Se deshacen siempre.
do $pruebas$
declare
  a uuid := gen_random_uuid(); r uuid := gen_random_uuid(); x uuid := gen_random_uuid();
  esp uuid; esp2 uuid; m uuid; m1b uuid; m2 uuid; cta uuid; cta2 uuid; reg uuid; camp uuid; camp2 uuid; p uuid; n int; t text;
  informe text := ''; fallos int := 0;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'z-a@ejemplo.test', 'authenticated', 'authenticated'), (r, 'z-r@ejemplo.test', 'authenticated', 'authenticated'),
    (x, 'z-x@ejemplo.test', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp := public.crear_espacio('Z');
  insert into public.marcas (espacio_id, nombre) values (esp, 'M') returning id into m;
  insert into public.marcas (espacio_id, nombre) values (esp, 'Otra') returning id into m1b;
  execute 'reset role';
  insert into public.miembros (espacio_id, usuario_id, rol) values (esp, r, 'revisor');
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp2 := public.crear_espacio('Z2');
  insert into public.marcas (espacio_id, nombre) values (esp2, 'M2') returning id into m2;
  insert into public.cuentas_red (espacio_id, marca_id, canal) values (esp2, m2, 'TikTok') returning id into cta2;
  insert into public.campanas (espacio_id, marca_id, nombre) values (esp2, m2, 'Ajena') returning id into camp2;
  execute 'reset role';

  -- Perfiles y auditoría
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.cuentas_red (espacio_id, marca_id, canal, nombre_perfil, enlace)
  values (esp2, m, ' Instagram ', '@marca', 'https://instagram.com/marca') returning id into cta;
  select espacio_id::text into t from public.cuentas_red where id = cta;
  if t = esp::text then informe := informe || E'\nOK  1a el perfil hereda el espacio de la marca';
  else fallos := fallos + 1; informe := informe || E'\nERR 1a'; end if;
  select canal into t from public.cuentas_red where id = cta;
  if t = 'Instagram' then informe := informe || E'\nOK  1b el nombre de la red se limpia de espacios';
  else fallos := fallos + 1; informe := informe || E'\nERR 1b'; end if;
  begin
    insert into public.cuentas_red (espacio_id, marca_id, canal, nombre_perfil) values (esp, m, 'instagram', '@MARCA');
    fallos := fallos + 1; informe := informe || E'\nERR 1c';
  exception when unique_violation then informe := informe || E'\nOK  1c no se repite el mismo perfil en la misma red';
  end;
  begin
    insert into public.cuentas_red (espacio_id, marca_id, canal, enlace) values (esp, m, 'X', 'ftp://x');
    fallos := fallos + 1; informe := informe || E'\nERR 1d';
  exception when check_violation then informe := informe || E'\nOK  1d el enlace del perfil debe ser http(s)';
  end;
  insert into public.registros_auditoria (cuenta_id, espacio_id, fecha, seguidores, clics_por_publicacion) values (cta, esp2, '2026-09-25', 1000, 12.5)
  returning id, espacio_id::text into reg, t;
  if t = esp::text then informe := informe || E'\nOK  2a el registro hereda el espacio del perfil';
  else fallos := fallos + 1; informe := informe || E'\nERR 2a'; end if;
  begin
    insert into public.registros_auditoria (cuenta_id, espacio_id, fecha, seguidores) values (cta, esp, '2026-09-25', 1);
    fallos := fallos + 1; informe := informe || E'\nERR 2b';
  exception when unique_violation then informe := informe || E'\nOK  2b un registro por perfil y fecha';
  end;
  begin
    insert into public.registros_auditoria (cuenta_id, espacio_id, fecha, seguidores) values (cta, esp, '2026-09-26', -3);
    fallos := fallos + 1; informe := informe || E'\nERR 2c';
  exception when check_violation then informe := informe || E'\nOK  2c sin seguidores negativos';
  end;
  begin
    insert into public.registros_auditoria (cuenta_id, espacio_id, fecha, seguidores) values (cta2, esp2, '2026-09-26', 3);
    fallos := fallos + 1; informe := informe || E'\nERR 2d';
  exception when insufficient_privilege then informe := informe || E'\nOK  2d no se registra en perfiles de otro espacio';
  end;

  -- Campañas
  insert into public.campanas (espacio_id, marca_id, nombre, inicio, fin) values (esp2, m, 'Navidad', '2026-12-01', '2026-12-31')
  returning id, espacio_id::text into camp, t;
  if t = esp::text then informe := informe || E'\nOK  3a la campaña hereda el espacio de la marca';
  else fallos := fallos + 1; informe := informe || E'\nERR 3a'; end if;
  begin
    insert into public.campanas (espacio_id, marca_id, nombre, inicio, fin) values (esp, m, 'Al revés', '2026-12-31', '2026-12-01');
    fallos := fallos + 1; informe := informe || E'\nERR 3b';
  exception when check_violation then informe := informe || E'\nOK  3b la fecha de fin no puede ser anterior al inicio';
  end;
  insert into public.publicaciones (espacio_id, marca_id, titulo, campana_id) values (esp, m, 'De campaña', camp) returning id into p;
  informe := informe || E'\nOK  3c una publicación se liga a una campaña de su marca';
  begin
    insert into public.publicaciones (espacio_id, marca_id, titulo, campana_id) values (esp, m1b, 'Otra marca', camp);
    fallos := fallos + 1; informe := informe || E'\nERR 3d';
  exception when check_violation then informe := informe || E'\nOK  3d no se liga a una campaña de otra marca';
  end;
  begin
    update public.publicaciones set campana_id = camp2 where id = p;
    fallos := fallos + 1; informe := informe || E'\nERR 3e';
  exception when check_violation then informe := informe || E'\nOK  3e no se liga a una campaña de otro espacio';
  end;
  delete from public.campanas where id = camp;
  select coalesce(campana_id::text, 'null') into t from public.publicaciones where id = p;
  if t = 'null' then informe := informe || E'\nOK  3f borrar la campaña conserva sus publicaciones';
  else fallos := fallos + 1; informe := informe || E'\nERR 3f'; end if;

  -- Importaciones
  insert into public.importaciones (espacio_id, usuario_id, archivo, hoja, destino, filas_importadas, filas_rechazadas)
  values (esp, x, 'Horario.xlsx', 'Hoja1', 'publicaciones', 10, 2);
  select usuario_id::text into t from public.importaciones where espacio_id = esp;
  if t = a::text then informe := informe || E'\nOK  4a el registro de importación guarda quién la hizo (no se falsifica)';
  else fallos := fallos + 1; informe := informe || E'\nERR 4a'; end if;
  begin
    update public.importaciones set filas_importadas = 99 where espacio_id = esp;
    fallos := fallos + 1; informe := informe || E'\nERR 4b';
  exception when insufficient_privilege then informe := informe || E'\nOK  4b el registro de importaciones no se modifica';
  end;
  execute 'reset role';

  -- Revisora: solo lectura
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select (select count(*) from public.cuentas_red) + (select count(*) from public.registros_auditoria) + (select count(*) from public.importaciones) into n;
  if n = 3 then informe := informe || E'\nOK  5a la revisora ve perfiles, auditorías e importaciones';
  else fallos := fallos + 1; informe := informe || E'\nERR 5a ' || n; end if;
  update public.registros_auditoria set seguidores = 5 where id = reg;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  5b la revisora no edita auditorías';
  else fallos := fallos + 1; informe := informe || E'\nERR 5b'; end if;
  begin
    insert into public.campanas (espacio_id, marca_id, nombre) values (esp, m, 'De revisora');
    fallos := fallos + 1; informe := informe || E'\nERR 5c';
  exception when insufficient_privilege then informe := informe || E'\nOK  5c la revisora no crea campañas';
  end;
  begin
    insert into public.importaciones (espacio_id, archivo, destino, filas_importadas, filas_rechazadas) values (esp, 'a.csv', 'publicaciones', 1, 0);
    fallos := fallos + 1; informe := informe || E'\nERR 5d';
  exception when insufficient_privilege then informe := informe || E'\nOK  5d la revisora no importa';
  end;
  execute 'reset role';

  -- Ajeno
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select (select count(*) from public.cuentas_red where espacio_id = esp) + (select count(*) from public.registros_auditoria where espacio_id = esp)
       + (select count(*) from public.campanas where espacio_id = esp) + (select count(*) from public.importaciones where espacio_id = esp) into n;
  if n = 0 then informe := informe || E'\nOK  6 un ajeno no ve nada de otro espacio';
  else fallos := fallos + 1; informe := informe || E'\nERR 6'; end if;
  execute 'reset role';

  -- Borrar el perfil borra su historial
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.cuentas_red where id = cta;
  execute 'reset role';
  select count(*) into n from public.registros_auditoria where cuenta_id = cta;
  if n = 0 then informe := informe || E'\nOK  7 borrar el perfil borra su historial';
  else fallos := fallos + 1; informe := informe || E'\nERR 7'; end if;

  raise exception 'RESULTADO: % fallos%', fallos, informe;
end;
$pruebas$;

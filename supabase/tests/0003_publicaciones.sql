-- Pruebas de publicaciones y canales (entrega 3). Se deshacen siempre al final.
do $pruebas$
declare
  a uuid := gen_random_uuid();  -- administradora espacio 1
  e uuid := gen_random_uuid();  -- editor espacio 1
  r uuid := gen_random_uuid();  -- revisora espacio 1
  x uuid := gen_random_uuid();  -- administrador espacio 2
  esp1 uuid; esp2 uuid; m1 uuid; m2 uuid; p1 uuid; c1 uuid;
  n int; t text; arr text[];
  informe text := ''; fallos int := 0;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'p-a@ejemplo.test', 'authenticated', 'authenticated'),
    (e, 'p-e@ejemplo.test', 'authenticated', 'authenticated'),
    (r, 'p-r@ejemplo.test', 'authenticated', 'authenticated'),
    (x, 'p-x@ejemplo.test', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp1 := public.crear_espacio('E1');
  insert into public.marcas (espacio_id, nombre) values (esp1, 'M1') returning id into m1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp2 := public.crear_espacio('E2');
  insert into public.marcas (espacio_id, nombre) values (esp2, 'M2') returning id into m2;
  execute 'reset role';
  insert into public.miembros (espacio_id, usuario_id, rol) values (esp1, e, 'editor'), (esp1, r, 'revisor');

  -- Editor
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.publicaciones (espacio_id, marca_id, titulo, tipos, responsable_id)
  values (esp2, m1, 'Guía de cómo hacer', '{video,imagen,video,""}', r) returning id, espacio_id::text, tipos into p1, t, arr;
  if t = esp1::text then informe := informe || E'\nOK  1a el espacio lo fija la marca';
  else fallos := fallos + 1; informe := informe || E'\nERR 1a'; end if;
  if arr = '{imagen,video}' then informe := informe || E'\nOK  1b tipos sin repetidos ni vacíos';
  else fallos := fallos + 1; informe := informe || E'\nERR 1b ' || arr::text; end if;
  begin
    update public.publicaciones set estado = 'programado' where id = p1;
    fallos := fallos + 1; informe := informe || E'\nERR 2 programado sin fecha';
  exception when check_violation then informe := informe || E'\nOK  2 no se programa sin fecha';
  end;
  update public.publicaciones set estado = 'borrador' where id = p1;
  update public.publicaciones set estado = 'en_pausa' where id = p1;
  select estado_anterior::text into t from public.publicaciones where id = p1;
  if t = 'borrador' then informe := informe || E'\nOK  3a al pausar se recuerda el estado anterior';
  else fallos := fallos + 1; informe := informe || E'\nERR 3a ' || coalesce(t, 'null'); end if;
  update public.publicaciones set titulo = 'Guía (pausada)' where id = p1;
  select estado_anterior::text into t from public.publicaciones where id = p1;
  if t = 'borrador' then informe := informe || E'\nOK  3b editar en pausa no pierde el estado anterior';
  else fallos := fallos + 1; informe := informe || E'\nERR 3b'; end if;
  update public.publicaciones set estado = 'aprobado', fecha_prevista = '2026-11-03 14:00-05' where id = p1;
  select coalesce(estado_anterior::text, 'null') into t from public.publicaciones where id = p1;
  if t = 'null' then informe := informe || E'\nOK  3c al salir de pausa se limpia';
  else fallos := fallos + 1; informe := informe || E'\nERR 3c'; end if;
  begin
    update public.publicaciones set estado_anterior = 'publicado' where id = p1;
    fallos := fallos + 1; informe := informe || E'\nERR 4';
  exception when insufficient_privilege then informe := informe || E'\nOK  4 el estado anterior no se toca desde el navegador';
  end;
  begin
    update public.publicaciones set responsable_id = x where id = p1;
    fallos := fallos + 1; informe := informe || E'\nERR 5';
  exception when check_violation then informe := informe || E'\nOK  5 el responsable debe ser miembro del espacio';
  end;
  begin
    update public.publicaciones set marca_id = m2 where id = p1;
    fallos := fallos + 1; informe := informe || E'\nERR 6';
  exception when insufficient_privilege then informe := informe || E'\nOK  6 no se mueve a una marca de otro espacio';
  end;
  insert into public.publicacion_canales (publicacion_id, espacio_id, canal, kpi_esperado)
  values (p1, esp2, 'Instagram', '500 me gusta') returning id, espacio_id::text into c1, t;
  if t = esp1::text then informe := informe || E'\nOK  7a el canal hereda el espacio de la publicación';
  else fallos := fallos + 1; informe := informe || E'\nERR 7a'; end if;
  begin
    insert into public.publicacion_canales (publicacion_id, espacio_id, canal) values (p1, esp1, 'Instagram');
    fallos := fallos + 1; informe := informe || E'\nERR 7b';
  exception when unique_violation then informe := informe || E'\nOK  7b un canal no se repite en la misma publicación';
  end;
  begin
    update public.publicacion_canales set enlace_publicado = 'javascript:alert(1)' where id = c1;
    fallos := fallos + 1; informe := informe || E'\nERR 7c';
  exception when check_violation then informe := informe || E'\nOK  7c el enlace publicado debe ser http(s)';
  end;
  update public.publicacion_canales set enlace_publicado = 'https://instagram.com/p/abc' where id = c1;
  informe := informe || E'\nOK  7d enlace https aceptado';
  execute 'reset role';

  -- Revisora: solo lectura en esta entrega
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.publicaciones where id = p1;
  if n = 1 then informe := informe || E'\nOK  8a la revisora ve la publicación';
  else fallos := fallos + 1; informe := informe || E'\nERR 8a'; end if;
  update public.publicaciones set titulo = 'x' where id = p1;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  8b la revisora no edita';
  else fallos := fallos + 1; informe := informe || E'\nERR 8b'; end if;
  begin
    insert into public.publicaciones (espacio_id, marca_id, titulo) values (esp1, m1, 'De revisora');
    fallos := fallos + 1; informe := informe || E'\nERR 8c';
  exception when insufficient_privilege then informe := informe || E'\nOK  8c la revisora no crea';
  end;
  delete from public.publicaciones where id = p1;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  8d la revisora no borra';
  else fallos := fallos + 1; informe := informe || E'\nERR 8d'; end if;
  execute 'reset role';

  -- Ajeno
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select (select count(*) from public.publicaciones) + (select count(*) from public.publicacion_canales) into n;
  if n = 0 then informe := informe || E'\nOK  9a un ajeno no ve publicaciones ni canales';
  else fallos := fallos + 1; informe := informe || E'\nERR 9a'; end if;
  begin
    insert into public.publicacion_canales (publicacion_id, espacio_id, canal) values (p1, esp2, 'TikTok');
    fallos := fallos + 1; informe := informe || E'\nERR 9b';
  exception when insufficient_privilege then informe := informe || E'\nOK  9b un ajeno no agrega canales a publicaciones ajenas';
  end;
  begin
    insert into public.publicaciones (espacio_id, marca_id, titulo) values (esp2, m1, 'Intrusa');
    fallos := fallos + 1; informe := informe || E'\nERR 9c';
  exception when insufficient_privilege then informe := informe || E'\nOK  9c un ajeno no crea publicaciones en marcas ajenas';
  end;
  execute 'reset role';

  -- Si la responsable sale del espacio, la publicación sigue editable
  delete from public.miembros where espacio_id = esp1 and usuario_id = r;
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.publicaciones set titulo = 'Guía final' where id = p1;
  get diagnostics n = row_count;
  if n = 1 then informe := informe || E'\nOK  10 se edita aunque el responsable ya no sea miembro';
  else fallos := fallos + 1; informe := informe || E'\nERR 10'; end if;
  execute 'reset role';

  -- Borrar la marca borra sus publicaciones y canales
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.marcas where id = m1;
  execute 'reset role';
  select (select count(*) from public.publicaciones where id = p1) + (select count(*) from public.publicacion_canales where id = c1) into n;
  if n = 0 then informe := informe || E'\nOK  11 borrar la marca borra sus publicaciones y canales';
  else fallos := fallos + 1; informe := informe || E'\nERR 11'; end if;

  raise exception 'RESULTADO: % fallos%', fallos, informe;
end;
$pruebas$;

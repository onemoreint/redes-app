-- Pruebas de revisión y comentarios (entrega 4). Se deshacen siempre al final.
do $pruebas$
declare
  a uuid := gen_random_uuid(); e uuid := gen_random_uuid(); r uuid := gen_random_uuid();
  l uuid := gen_random_uuid(); x uuid := gen_random_uuid();
  esp uuid; m uuid; p uuid; c uuid; n int; t text; u uuid;
  informe text := ''; fallos int := 0;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'r-a@ejemplo.test', 'authenticated', 'authenticated'), (e, 'r-e@ejemplo.test', 'authenticated', 'authenticated'),
    (r, 'r-r@ejemplo.test', 'authenticated', 'authenticated'), (l, 'r-l@ejemplo.test', 'authenticated', 'authenticated'),
    (x, 'r-x@ejemplo.test', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp := public.crear_espacio('Rev');
  insert into public.marcas (espacio_id, nombre) values (esp, 'M') returning id into m;
  insert into public.publicaciones (espacio_id, marca_id, titulo, estado) values (esp, m, 'Post', 'borrador') returning id into p;
  execute 'reset role';
  insert into public.miembros (espacio_id, usuario_id, rol) values (esp, e, 'editor'), (esp, r, 'revisor'), (esp, l, 'lector');

  -- Revisora no pide revisión
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.solicitar_revision(p, 'hola');
    fallos := fallos + 1; informe := informe || E'\nERR 1';
  exception when insufficient_privilege then informe := informe || E'\nOK  1 la revisora no pide revisión';
  end;
  execute 'reset role';

  -- Editor pide revisión
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  t := public.solicitar_revision(p, '¿La ves bien?')::text;
  select count(*) into n from public.comentarios where publicacion_id = p and tipo = 'solicitud' and autor_id = e;
  if t = 'en_revision' and n = 1 then informe := informe || E'\nOK  2 pedir revisión cambia el estado y deja constancia';
  else fallos := fallos + 1; informe := informe || E'\nERR 2'; end if;
  begin
    perform public.solicitar_revision(p, '');
    fallos := fallos + 1; informe := informe || E'\nERR 3';
  exception when raise_exception then informe := informe || E'\nOK  3 no se pide revisión dos veces';
  end;
  execute 'reset role';

  -- Lector no aprueba ni comenta
  perform set_config('request.jwt.claims', json_build_object('sub', l, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.revisar_publicacion(p, true, '');
    fallos := fallos + 1; informe := informe || E'\nERR 4a';
  exception when insufficient_privilege then informe := informe || E'\nOK  4a el lector no aprueba';
  end;
  begin
    insert into public.comentarios (publicacion_id, espacio_id, texto) values (p, esp, 'Opino');
    fallos := fallos + 1; informe := informe || E'\nERR 4b';
  exception when insufficient_privilege then informe := informe || E'\nOK  4b el lector no comenta';
  end;
  select count(*) into n from public.comentarios where publicacion_id = p;
  if n = 1 then informe := informe || E'\nOK  4c el lector ve el historial';
  else fallos := fallos + 1; informe := informe || E'\nERR 4c'; end if;
  execute 'reset role';

  -- Revisora devuelve y aprueba
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.revisar_publicacion(p, false, '   ');
    fallos := fallos + 1; informe := informe || E'\nERR 5';
  exception when raise_exception then informe := informe || E'\nOK  5 devolver exige explicar qué cambiar';
  end;
  t := public.revisar_publicacion(p, false, 'Cambia la foto')::text;
  select actualizado_por into u from public.publicaciones where id = p;
  select count(*) into n from public.comentarios where publicacion_id = p and tipo = 'devolucion' and autor_id = r;
  if t = 'borrador' and n = 1 and u = r then informe := informe || E'\nOK  6 devolver vuelve a borrador, con motivo y autoría';
  else fallos := fallos + 1; informe := informe || E'\nERR 6'; end if;
  begin
    perform public.revisar_publicacion(p, true, '');
    fallos := fallos + 1; informe := informe || E'\nERR 7';
  exception when raise_exception then informe := informe || E'\nOK  7 no se revisa lo que no está en revisión';
  end;
  insert into public.comentarios (publicacion_id, espacio_id, texto) values (p, esp, 'Ya la vi') returning id into c;
  informe := informe || E'\nOK  9a la revisora comenta';
  begin
    insert into public.comentarios (publicacion_id, espacio_id, tipo, texto) values (p, esp, 'aprobacion', 'Falsa');
    fallos := fallos + 1; informe := informe || E'\nERR 9b';
  exception when insufficient_privilege then informe := informe || E'\nOK  9b no se fabrican aprobaciones a mano';
  end;
  begin
    update public.comentarios set texto = 'editado' where id = c;
    fallos := fallos + 1; informe := informe || E'\nERR 10';
  exception when insufficient_privilege then informe := informe || E'\nOK  10 los comentarios no se editan';
  end;
  begin
    insert into public.comentarios (publicacion_id, espacio_id, texto) values (p, esp, '   ');
    fallos := fallos + 1; informe := informe || E'\nERR 13';
  exception when check_violation then informe := informe || E'\nOK  13 no hay comentarios vacíos';
  end;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.solicitar_revision(p, 'Cambiada');
  delete from public.comentarios where id = c;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  12a nadie borra comentarios ajenos';
  else fallos := fallos + 1; informe := informe || E'\nERR 12a'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  t := public.revisar_publicacion(p, true, 'Perfecta')::text;
  if t = 'aprobado' then informe := informe || E'\nOK  8 la revisora aprueba sin poder editar';
  else fallos := fallos + 1; informe := informe || E'\nERR 8'; end if;
  delete from public.comentarios where publicacion_id = p and tipo = 'devolucion';
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  12b el historial de revisión no se borra';
  else fallos := fallos + 1; informe := informe || E'\nERR 12b'; end if;
  delete from public.comentarios where id = c;
  get diagnostics n = row_count;
  if n = 1 then informe := informe || E'\nOK  12c cada uno borra sus comentarios';
  else fallos := fallos + 1; informe := informe || E'\nERR 12c'; end if;
  execute 'reset role';

  -- Ajeno
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.comentarios;
  if n = 0 then informe := informe || E'\nOK  11a un ajeno no ve comentarios';
  else fallos := fallos + 1; informe := informe || E'\nERR 11a'; end if;
  begin
    perform public.revisar_publicacion(p, true, '');
    fallos := fallos + 1; informe := informe || E'\nERR 11b';
  exception when raise_exception then informe := informe || E'\nOK  11b un ajeno no revisa (ni sabe que existe)';
  end;
  begin
    insert into public.comentarios (publicacion_id, espacio_id, texto) values (p, esp, 'Spam');
    fallos := fallos + 1; informe := informe || E'\nERR 11c';
  exception when insufficient_privilege then informe := informe || E'\nOK  11c un ajeno no comenta';
  end;
  execute 'reset role';

  raise exception 'RESULTADO: % fallos%', fallos, informe;
end;
$pruebas$;

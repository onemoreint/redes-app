-- Pruebas de métricas (entrega 6). Se deshacen siempre al final.
do $pruebas$
declare
  a uuid := gen_random_uuid(); r uuid := gen_random_uuid(); x uuid := gen_random_uuid();
  esp uuid; esp2 uuid; m uuid; m2 uuid; p uuid; p2 uuid; c uuid; c2 uuid; met uuid; n int; t text;
  informe text := ''; fallos int := 0;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'k-a@ejemplo.test', 'authenticated', 'authenticated'), (r, 'k-r@ejemplo.test', 'authenticated', 'authenticated'),
    (x, 'k-x@ejemplo.test', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp := public.crear_espacio('K');
  insert into public.marcas (espacio_id, nombre) values (esp, 'M') returning id into m;
  insert into public.publicaciones (espacio_id, marca_id, titulo, estado) values (esp, m, 'P', 'publicado') returning id into p;
  insert into public.publicacion_canales (publicacion_id, espacio_id, canal) values (p, esp, 'Instagram') returning id into c;
  execute 'reset role';
  insert into public.miembros (espacio_id, usuario_id, rol) values (esp, r, 'revisor');
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp2 := public.crear_espacio('K2');
  insert into public.marcas (espacio_id, nombre) values (esp2, 'M2') returning id into m2;
  insert into public.publicaciones (espacio_id, marca_id, titulo) values (esp2, m2, 'P2') returning id into p2;
  insert into public.publicacion_canales (publicacion_id, espacio_id, canal) values (p2, esp2, 'X') returning id into c2;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.metricas (publicacion_canal_id, publicacion_id, espacio_id, medido_el, alcance, me_gusta, compartidos, menciones, clics)
  values (c, p2, esp2, '2026-10-20', 1000, 22, 89, 100, 300) returning id, espacio_id::text into met, t;
  if t = esp::text then informe := informe || E'\nOK  1 la métrica hereda espacio y publicación de su red';
  else fallos := fallos + 1; informe := informe || E'\nERR 1'; end if;
  select origen::text into t from public.metricas where id = met;
  if t = 'manual' then informe := informe || E'\nOK  2 el origen queda como manual';
  else fallos := fallos + 1; informe := informe || E'\nERR 2'; end if;
  begin
    insert into public.metricas (publicacion_canal_id, publicacion_id, espacio_id, medido_el, alcance) values (c, p, esp, '2026-10-20', 5);
    fallos := fallos + 1; informe := informe || E'\nERR 3';
  exception when unique_violation then informe := informe || E'\nOK  3 una medición por red y día';
  end;
  insert into public.metricas (publicacion_canal_id, publicacion_id, espacio_id, medido_el, alcance) values (c, p, esp, '2026-10-27', 1500);
  informe := informe || E'\nOK  4 se puede volver a medir otro día';
  begin
    insert into public.metricas (publicacion_canal_id, publicacion_id, espacio_id, medido_el, me_gusta) values (c, p, esp, '2026-10-28', -1);
    fallos := fallos + 1; informe := informe || E'\nERR 5a';
  exception when check_violation then informe := informe || E'\nOK  5a no se aceptan cifras negativas';
  end;
  begin
    insert into public.metricas (publicacion_canal_id, publicacion_id, espacio_id, medido_el) values (c, p, esp, '2026-10-29');
    fallos := fallos + 1; informe := informe || E'\nERR 5b';
  exception when check_violation then informe := informe || E'\nOK  5b no se guarda una medición vacía';
  end;
  begin
    insert into public.metricas (publicacion_canal_id, publicacion_id, espacio_id, medido_el, alcance) values (c2, p2, esp2, '2026-10-20', 1);
    fallos := fallos + 1; informe := informe || E'\nERR 6';
  exception when insufficient_privilege then informe := informe || E'\nOK  6 no se registran métricas en redes de otro espacio';
  end;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.metricas;
  if n = 2 then informe := informe || E'\nOK  7a la revisora ve las métricas';
  else fallos := fallos + 1; informe := informe || E'\nERR 7a ' || n; end if;
  update public.metricas set alcance = 9 where id = met;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  7b la revisora no las cambia';
  else fallos := fallos + 1; informe := informe || E'\nERR 7b'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.metricas;
  if n = 0 then informe := informe || E'\nOK  8 un ajeno no ve métricas';
  else fallos := fallos + 1; informe := informe || E'\nERR 8'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.publicacion_canales where id = c;
  execute 'reset role';
  select count(*) into n from public.metricas where publicacion_canal_id = c;
  if n = 0 then informe := informe || E'\nOK  9 quitar la red borra sus métricas';
  else fallos := fallos + 1; informe := informe || E'\nERR 9'; end if;

  raise exception 'RESULTADO: % fallos%', fallos, informe;
end;
$pruebas$;

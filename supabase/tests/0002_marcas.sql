-- Pruebas de marcas, estrategia y objetivos (entrega 2). Se deshacen siempre al final.
do $pruebas$
declare
  a uuid := gen_random_uuid();  -- administradora del espacio 1
  e uuid := gen_random_uuid();  -- editor del espacio 1
  r uuid := gen_random_uuid();  -- revisora del espacio 1
  x uuid := gen_random_uuid();  -- administrador de otro espacio
  esp1 uuid; esp2 uuid; marca uuid; marca2 uuid; obj uuid;
  n int; t text; u uuid;
  informe text := ''; fallos int := 0;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'm-a@ejemplo.test', 'authenticated', 'authenticated'),
    (e, 'm-e@ejemplo.test', 'authenticated', 'authenticated'),
    (r, 'm-r@ejemplo.test', 'authenticated', 'authenticated'),
    (x, 'm-x@ejemplo.test', 'authenticated', 'authenticated');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp1 := public.crear_espacio('Espacio 1');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp2 := public.crear_espacio('Espacio 2');
  execute 'reset role';
  insert into public.miembros (espacio_id, usuario_id, rol) values (esp1, e, 'editor'), (esp1, r, 'revisor');

  -- 1 administradora crea marca; la estrategia nace sola
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.marcas (espacio_id, nombre) values (esp1, 'Marca Uno') returning id into marca;
  select count(*) into n from public.estrategias where marca_id = marca and espacio_id = esp1;
  if n = 1 then informe := informe || E'\nOK  1 al crear una marca se crea su estrategia';
  else fallos := fallos + 1; informe := informe || E'\nERR 1'; end if;
  select creado_por into u from public.marcas where id = marca;
  if u = a then informe := informe || E'\nOK  1b la autoría la pone la base de datos';
  else fallos := fallos + 1; informe := informe || E'\nERR 1b'; end if;
  begin
    insert into public.marcas (espacio_id, nombre) values (esp1, '  marca uno ');
    fallos := fallos + 1; informe := informe || E'\nERR 1c nombre repetido aceptado';
  exception when unique_violation then informe := informe || E'\nOK  1c no se repite el nombre de marca en un espacio';
  end;
  execute 'reset role';

  -- 2 editor
  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.marcas (espacio_id, nombre) values (esp1, 'Marca del editor');
    fallos := fallos + 1; informe := informe || E'\nERR 2a editor creó marca';
  exception when insufficient_privilege then informe := informe || E'\nOK  2a un editor no crea marcas';
  end;
  update public.estrategias set mision = 'Inspirar' where marca_id = marca;
  get diagnostics n = row_count;
  select actualizado_por into u from public.estrategias where marca_id = marca;
  if n = 1 and u = e then informe := informe || E'\nOK  2b un editor edita la estrategia y queda registrado';
  else fallos := fallos + 1; informe := informe || E'\nERR 2b'; end if;
  insert into public.objetivos (marca_id, espacio_id, descripcion, canal, metrica, valor_inicial, valor_meta)
  values (marca, esp2, 'Crecer en Instagram', 'Instagram', 'Seguidores', 1000, 1500) returning id, espacio_id::text into obj, t;
  if t = esp1::text then informe := informe || E'\nOK  2c el espacio del objetivo lo fija su marca (ignora el enviado)';
  else fallos := fallos + 1; informe := informe || E'\nERR 2c'; end if;
  update public.marcas set espacio_id = esp2, descripcion = 'nueva' where id = marca;
  select espacio_id::text into t from public.marcas where id = marca;
  if t = esp1::text then informe := informe || E'\nOK  2d una marca no puede moverse a otro espacio';
  else fallos := fallos + 1; informe := informe || E'\nERR 2d'; end if;
  delete from public.marcas where id = marca;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  2e un editor no borra marcas';
  else fallos := fallos + 1; informe := informe || E'\nERR 2e'; end if;
  begin
    insert into public.estrategias (marca_id, espacio_id) values (marca, esp1);
    fallos := fallos + 1; informe := informe || E'\nERR 2f insert directo de estrategia';
  exception when insufficient_privilege then informe := informe || E'\nOK  2f la estrategia no se crea a mano';
  end;
  begin
    insert into public.objetivos (marca_id, espacio_id, descripcion, valor_meta) values (marca, esp1, 'Negativo', -5);
    fallos := fallos + 1; informe := informe || E'\nERR 2g meta negativa aceptada';
  exception when check_violation then informe := informe || E'\nOK  2g no se aceptan metas negativas';
  end;
  execute 'reset role';

  -- 3 revisora: solo lectura
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.marcas where id = marca;
  if n = 1 then informe := informe || E'\nOK  3a la revisora ve la marca';
  else fallos := fallos + 1; informe := informe || E'\nERR 3a'; end if;
  update public.estrategias set mision = 'Revisora' where marca_id = marca;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  3b la revisora no edita la estrategia';
  else fallos := fallos + 1; informe := informe || E'\nERR 3b'; end if;
  update public.objetivos set estado = 'logrado' where id = obj;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  3c la revisora no edita objetivos';
  else fallos := fallos + 1; informe := informe || E'\nERR 3c'; end if;
  begin
    insert into public.objetivos (marca_id, espacio_id, descripcion) values (marca, esp1, 'De revisora');
    fallos := fallos + 1; informe := informe || E'\nERR 3d';
  exception when insufficient_privilege then informe := informe || E'\nOK  3d la revisora no crea objetivos';
  end;
  execute 'reset role';

  -- 4 ajeno (administrador de otro espacio)
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select (select count(*) from public.marcas) + (select count(*) from public.estrategias) + (select count(*) from public.objetivos) into n;
  if n = 0 then informe := informe || E'\nOK  4a un ajeno no ve marcas, estrategias ni objetivos';
  else fallos := fallos + 1; informe := informe || E'\nERR 4a ve ' || n; end if;
  begin
    insert into public.objetivos (marca_id, espacio_id, descripcion) values (marca, esp2, 'Intruso');
    fallos := fallos + 1; informe := informe || E'\nERR 4b ajeno colgó un objetivo en marca ajena';
  exception when insufficient_privilege then informe := informe || E'\nOK  4b no se pueden colgar objetivos en marcas de otro espacio';
  end;
  insert into public.marcas (espacio_id, nombre) values (esp2, 'Marca Uno') returning id into marca2;
  informe := informe || E'\nOK  4c el mismo nombre de marca sirve en otro espacio';
  execute 'reset role';

  -- 5 administradora borra la marca: se va todo lo suyo
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.marcas where id = marca;
  get diagnostics n = row_count;
  execute 'reset role';
  select (select count(*) from public.estrategias where marca_id = marca) + (select count(*) from public.objetivos where marca_id = marca) into t;
  if n = 1 and t = '0' then informe := informe || E'\nOK  5 al borrar la marca se borran su estrategia y objetivos';
  else fallos := fallos + 1; informe := informe || E'\nERR 5'; end if;

  raise exception 'RESULTADO: % fallos%', fallos, informe;
end;
$pruebas$;

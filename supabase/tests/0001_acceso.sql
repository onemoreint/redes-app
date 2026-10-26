-- Pruebas de separación de datos y roles (entrega 1).
-- Se ejecutan en una transacción que SIEMPRE se deshace: el bloque termina lanzando
-- una excepción con el informe, así que no queda ningún dato de prueba en la base.
-- Ejecutar con un usuario con privilegios (p. ej. desde el editor SQL de Supabase).
do $pruebas$
declare
  a uuid := gen_random_uuid();  -- administradora
  b uuid := gen_random_uuid();  -- ajeno al espacio
  c uuid := gen_random_uuid();  -- invitado como revisor
  esp uuid;
  tok uuid;
  n int;
  informe text := '';
  fallos int := 0;

begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (a, 'prueba-a@ejemplo.test', 'authenticated', 'authenticated', '{"nombre":"Ana"}'),
         (b, 'prueba-b@ejemplo.test', 'authenticated', 'authenticated', '{"nombre":"Beto"}'),
         (c, 'prueba-c@ejemplo.test', 'authenticated', 'authenticated', '{"nombre":"Caro"}');


  ------------------------------------------------------------------ 1
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  esp := public.crear_espacio('Espacio de prueba', 'America/Bogota');
  select count(*) into n from public.miembros where espacio_id = esp and usuario_id = a and rol = 'administrador';
  if n = 1 then informe := informe || E'\nOK  1 crear_espacio deja al creador como administrador';
  else fallos := fallos + 1; informe := informe || E'\nERR 1 crear_espacio'; end if;
  begin
    perform public.crear_espacio('Zona mala', 'Marte/Olympus');
    fallos := fallos + 1; informe := informe || E'\nERR 1b zona horaria inválida aceptada';
  exception when invalid_parameter_value then informe := informe || E'\nOK  1b zona horaria inválida rechazada';
  end;
  begin
    perform privado.es_miembro(esp);
    informe := informe || E'\nOK  1c funciones privadas usables por las políticas';
  exception when others then fallos := fallos + 1; informe := informe || E'\nERR 1c ' || sqlerrm;
  end;
  execute 'reset role';

  ------------------------------------------------------------------ 2
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.espacios;
  if n = 0 then informe := informe || E'\nOK  2a un usuario ajeno no ve el espacio';
  else fallos := fallos + 1; informe := informe || E'\nERR 2a ajeno ve espacios: ' || n; end if;
  select count(*) into n from public.miembros;
  if n = 0 then informe := informe || E'\nOK  2b un usuario ajeno no ve los miembros';
  else fallos := fallos + 1; informe := informe || E'\nERR 2b ajeno ve miembros: ' || n; end if;
  update public.espacios set nombre = 'hackeado' where id = esp;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  2c un usuario ajeno no puede renombrar el espacio';
  else fallos := fallos + 1; informe := informe || E'\nERR 2c ajeno renombró'; end if;
  delete from public.espacios where id = esp;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  2d un usuario ajeno no puede borrar el espacio';
  else fallos := fallos + 1; informe := informe || E'\nERR 2d ajeno borró'; end if;
  select count(*) into n from public.perfiles where id = a;
  if n = 0 then informe := informe || E'\nOK  2e un usuario ajeno no ve el perfil de otros';
  else fallos := fallos + 1; informe := informe || E'\nERR 2e ajeno ve perfil'; end if;
  begin
    insert into public.miembros (espacio_id, usuario_id, rol) values (esp, b, 'administrador');
    fallos := fallos + 1; informe := informe || E'\nERR 2f ajeno se agregó como miembro';
  exception when insufficient_privilege then
    informe := informe || E'\nOK  2f un usuario ajeno no puede agregarse a un espacio';
  end;
  begin
    insert into public.espacios (nombre) values ('directo');
    fallos := fallos + 1; informe := informe || E'\nERR 2g insert directo en espacios';
  exception when insufficient_privilege then
    informe := informe || E'\nOK  2g no se crean espacios saltándose crear_espacio';
  end;
  begin
    update public.perfiles set email = 'otro@ejemplo.test' where id = b;
    fallos := fallos + 1; informe := informe || E'\nERR 2h se pudo cambiar el correo del perfil';
  exception when insufficient_privilege then
    informe := informe || E'\nOK  2h el correo del perfil no se edita desde el navegador';
  end;
  update public.perfiles set nombre = 'Beto Nuevo' where id = b;
  get diagnostics n = row_count;
  if n = 1 then informe := informe || E'\nOK  2i cada uno edita su propio nombre';
  else fallos := fallos + 1; informe := informe || E'\nERR 2i'; end if;
  execute 'reset role';

  ------------------------------------------------------------------ 3
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.invitaciones (espacio_id, email, rol, creada_por)
  values (esp, 'Prueba-C@ejemplo.test', 'revisor', a) returning token into tok;
  informe := informe || E'\nOK  3a la administradora crea una invitación';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.aceptar_invitacion(tok);
    fallos := fallos + 1; informe := informe || E'\nERR 3b otro correo aceptó la invitación';
  exception when raise_exception then
    informe := informe || E'\nOK  3b una invitación no sirve para otro correo';
  end;
  select count(*) into n from public.invitaciones;
  if n = 0 then informe := informe || E'\nOK  3c un no administrador no ve invitaciones';
  else fallos := fallos + 1; informe := informe || E'\nERR 3c ve invitaciones'; end if;
  begin
    insert into public.invitaciones (espacio_id, email, rol, creada_por) values (esp, 'x@ejemplo.test', 'administrador', b);
    fallos := fallos + 1; informe := informe || E'\nERR 3c2 un ajeno invitó';
  exception when insufficient_privilege then informe := informe || E'\nOK  3c2 un no administrador no puede invitar';
  end;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.ver_invitacion(tok) where estado = 'pendiente' and rol = 'revisor';
  if n = 1 then informe := informe || E'\nOK  3d la persona invitada ve los datos de su invitación';
  else fallos := fallos + 1; informe := informe || E'\nERR 3d ver_invitacion'; end if;
  perform public.aceptar_invitacion(tok);  -- correo distinto en mayúsculas: debe funcionar
  select count(*) into n from public.miembros where espacio_id = esp and usuario_id = c and rol = 'revisor';
  if n = 1 then informe := informe || E'\nOK  3e aceptar la invitación la vuelve revisora (sin importar mayúsculas)';
  else fallos := fallos + 1; informe := informe || E'\nERR 3e aceptar'; end if;
  begin
    perform public.aceptar_invitacion(tok);
    fallos := fallos + 1; informe := informe || E'\nERR 3f invitación reutilizada';
  exception when raise_exception then
    informe := informe || E'\nOK  3f una invitación no se puede usar dos veces';
  end;

  ------------------------------------------------------------------ 4 (C es revisora)
  update public.espacios set nombre = 'cambiado por revisora' where id = esp;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  4a una revisora no puede renombrar el espacio';
  else fallos := fallos + 1; informe := informe || E'\nERR 4a revisora renombró'; end if;
  update public.miembros set rol = 'administrador' where espacio_id = esp and usuario_id = c;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  4b una revisora no puede subirse de rol';
  else fallos := fallos + 1; informe := informe || E'\nERR 4b revisora se subió de rol'; end if;
  delete from public.miembros where espacio_id = esp and usuario_id = a;
  get diagnostics n = row_count;
  if n = 0 then informe := informe || E'\nOK  4c una revisora no puede quitar a otros miembros';
  else fallos := fallos + 1; informe := informe || E'\nERR 4c revisora quitó a la administradora'; end if;
  select count(*) into n from public.perfiles where id = a;
  if n = 1 then informe := informe || E'\nOK  4d los compañeros de espacio ven sus perfiles';
  else fallos := fallos + 1; informe := informe || E'\nERR 4d no ve perfil de compañera'; end if;
  execute 'reset role';

  ------------------------------------------------------------------ 5 último administrador
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.miembros set rol = 'editor' where espacio_id = esp and usuario_id = a;
    fallos := fallos + 1; informe := informe || E'\nERR 5a el último administrador se bajó de rol';
  exception when raise_exception then
    informe := informe || E'\nOK  5a el último administrador no puede bajarse de rol';
  end;
  begin
    delete from public.miembros where espacio_id = esp and usuario_id = a;
    fallos := fallos + 1; informe := informe || E'\nERR 5b el último administrador salió';
  exception when raise_exception then
    informe := informe || E'\nOK  5b el último administrador no puede salir del espacio';
  end;
  update public.miembros set rol = 'administrador' where espacio_id = esp and usuario_id = c;
  delete from public.miembros where espacio_id = esp and usuario_id = a;
  get diagnostics n = row_count;
  if n = 1 then informe := informe || E'\nOK  5c con otro administrador, sí puede salir';
  else fallos := fallos + 1; informe := informe || E'\nERR 5c no pudo salir'; end if;
  select count(*) into n from public.espacios where id = esp;
  if n = 0 then informe := informe || E'\nOK  5d tras salir, ya no ve el espacio';
  else fallos := fallos + 1; informe := informe || E'\nERR 5d sigue viendo el espacio'; end if;
  execute 'reset role';

  ------------------------------------------------------------------ 6 borrar espacio
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.espacios where id = esp;
  get diagnostics n = row_count;
  if n = 1 then informe := informe || E'\nOK  6 una administradora puede borrar el espacio (y sus miembros)';
  else fallos := fallos + 1; informe := informe || E'\nERR 6 no se pudo borrar el espacio'; end if;
  execute 'reset role';

  ------------------------------------------------------------------ 7 anónimo
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin
    perform public.crear_espacio('anónimo');
    fallos := fallos + 1; informe := informe || E'\nERR 7 anónimo creó un espacio';
  exception when insufficient_privilege then
    informe := informe || E'\nOK  7 sin sesión no se puede crear nada';
  end;
  begin
    perform privado.es_miembro(gen_random_uuid());
    fallos := fallos + 1; informe := informe || E'\nERR 7b anónimo usa funciones privadas';
  exception when insufficient_privilege then informe := informe || E'\nOK  7b funciones privadas cerradas al anónimo';
  end;
  execute 'reset role';

  raise exception 'RESULTADO: % fallos%', fallos, informe;
end;
$pruebas$;

-- ============================================================================
-- Troca de turno + histórico do líder + massas na farinha
-- Rode TUDO de uma vez no SQL Editor do Supabase, ANTES de publicar o novo app.js.
-- Pode rodar mais de uma vez. Compatível com o app.js antigo durante a troca.
--
-- Novo status de dia: 'encerrando' = o turno encerrou a produção, mas ainda há massa batendo
-- (será finalizada pelo operador do próximo turno). Quando a última termina, vira 'encerrado'.
-- ============================================================================

-- Garante que o status 'encerrando' seja aceito (só remove um CHECK, se existir).
alter table dias drop constraint if exists dias_status_check;

-- 1) Iniciar o dia: não deixa reabrir um turno que ainda está encerrando hoje.
create or replace function iniciar_dia(p_token uuid, p_produto integer) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; begin
  s:=sess(p_token,array['operador']);
  if exists(select 1 from dias where turno=s.turno and status='aberto') then return; end if;
  if exists(select 1 from dias where turno=s.turno and status='encerrando' and data=data_producao(s.turno)) then
    raise exception 'Este turno já foi encerrado e ainda tem massa batendo. Aguarde finalizar.'; end if;
  insert into dias(data,turno,produto_id) values(data_producao(s.turno),s.turno,p_produto); end $$;

-- 2) Iniciar batelada: grava o operador responsável (quem iniciou) e confere a Diosna em TODOS os turnos.
drop function if exists iniciar_batelada(uuid,boolean,boolean,integer,timestamptz);
create or replace function iniciar_batelada(p_token uuid, p_linha boolean, p_cong boolean, p_diosna integer, p_inicio timestamptz, p_op text default null) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; n int; vig jsonb; pend jsonb; prev jsonb; tem_prev boolean; tr jsonb; begin
  s:=sess(p_token,array['operador']);
  select * into d from dias where turno=s.turno and status='aberto' for update;
  if not found then raise exception 'Produção do dia não iniciada'; end if;
  if exists(select 1 from bateladas where status='Batendo' and diosna=p_diosna) then raise exception 'Esta Diosna já está batendo'; end if;
  vig:=farinha_vigente(); pend:=farinha_pendente();
  select farinha into prev from bateladas order by id desc limit 1; tem_prev:=found;
  update dias set contador=contador+1 where id=d.id returning contador into n;
  insert into bateladas(dia_id,produto_id,lote,inicio,rep_linha,rep_congelado,diosna,farinha,operador) values(d.id,d.produto_id,n,p_inicio,p_linha,p_cong,p_diosna,vig,nullif(trim(p_op),''));
  select coalesce(jsonb_agg(jsonb_build_object('moega',(v->>'moega')::int,'para',v,'de',(select p from jsonb_array_elements(coalesce(prev,'[]'::jsonb)) p where p->>'moega'=v->>'moega' limit 1))),'[]'::jsonb) into tr
    from jsonb_array_elements(vig) v
    where tem_prev and not exists(select 1 from jsonb_array_elements(coalesce(prev,'[]'::jsonb)) p where p->>'moega'=v->>'moega' and p->>'moinho'=v->>'moinho' and p->>'lote'=v->>'lote');
  return json_build_object('farinha',vig,'trocas',tr,'proximas',pend); end $$;

-- 3) Finalizar batelada: não troca mais o operador (fica quem iniciou), aceita massa de turno
--    'encerrando' e fecha o turno sozinho quando a última massa termina.
create or replace function finalizar_batelada(p_token uuid, p_id integer, p_temp numeric, p_op text, p_fim timestamptz) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; did int; begin
  s:=sess(p_token,array['operador']);
  update bateladas b set fim=p_fim, temperatura=p_temp, operador=coalesce(b.operador,nullif(trim(p_op),'')), status='Finalizada'
    from dias d where b.id=p_id and b.dia_id=d.id and b.status='Batendo' and (d.turno=s.turno or d.status='encerrando')
    returning d.id into did;
  if did is not null then
    update dias set status='encerrado', encerrado_em=now()
      where id=did and status='encerrando' and not exists(select 1 from bateladas where dia_id=did and status='Batendo');
  end if; end $$;

-- 4) Encerrar o dia: com massa batendo vira 'encerrando'; sem massa batendo encerra de vez.
create or replace function encerrar_dia(p_token uuid) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; begin
  s:=sess(p_token,array['operador']);
  select * into d from dias where turno=s.turno and status='aberto' for update;
  if not found then return; end if;
  if exists(select 1 from bateladas where dia_id=d.id and status='Batendo') then
    update dias set status='encerrando' where id=d.id;
  else
    update dias set status='encerrado', encerrado_em=now() where id=d.id;
  end if; end $$;

-- 5) Estado: acrescenta as massas de turnos encerrando que ainda batem ('anteriores'),
--    as Diosnas ocupadas em qualquer turno e o turno próprio que está encerrando ('fechando').
create or replace function estado(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; f dias; begin
  s:=sess(p_token,array['operador','lider']);
  select * into d from dias where turno=s.turno and status='aberto';
  select * into f from dias where turno=s.turno and status='encerrando' and data=data_producao(s.turno) order by id desc limit 1;
  return json_build_object(
    'produtos',(select coalesce(json_agg(p order by p.ordem),'[]') from produtos p where p.ativo),
    'meta',(select m.meta from metas_dia m where m.turno=s.turno and m.data=coalesce(d.data,data_producao(s.turno))),
    'dia',case when d.id is null then null else (select json_build_object('id',d.id,'data',d.data,'turno',d.turno,'contador',d.contador,'produto_id',d.produto_id,'produto',pr.nome) from produtos pr where pr.id=d.produto_id) end,
    'bateladas',(select coalesce(json_agg(json_build_object('id',b.id,'lote',b.lote,'produto',pr.nome,'inicio',b.inicio,'fim',b.fim,'rep_linha',b.rep_linha,'rep_congelado',b.rep_congelado,'diosna',b.diosna,'temperatura',b.temperatura,'operador',b.operador,'status',b.status,'farinha',b.farinha) order by b.id),'[]') from bateladas b join produtos pr on pr.id=b.produto_id where b.dia_id=d.id),
    'anteriores',(select coalesce(json_agg(json_build_object('id',b.id,'lote',b.lote,'produto',pr.nome,'inicio',b.inicio,'diosna',b.diosna,'operador',b.operador,'turno',dd.turno) order by b.inicio),'[]') from bateladas b join dias dd on dd.id=b.dia_id join produtos pr on pr.id=b.produto_id where dd.status='encerrando' and b.status='Batendo'),
    'diosnas_ocupadas',(select coalesce(json_agg(distinct b.diosna),'[]') from bateladas b where b.status='Batendo'),
    'fechando',case when f.id is null then null else json_build_object('id',f.id,'data',f.data,'turno',f.turno,'batendo',(select count(*) from bateladas b where b.dia_id=f.id and b.status='Batendo')) end); end $$;

-- 6) Detalhe de um dia (histórico do líder / turno encerrando): líder e operador só veem o próprio turno; admin vê todos.
create or replace function historico_dia(p_token uuid, p_dia int) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; begin
  s:=sess(p_token,array['operador','lider','admin']);
  select * into d from dias where id=p_dia and (s.perfil='admin' or turno=s.turno);
  if not found then raise exception 'Dia não encontrado'; end if;
  return json_build_object(
    'dia',json_build_object('id',d.id,'data',d.data,'turno',d.turno,'status',d.status,'meta',(select m.meta from metas_dia m where m.data=d.data and m.turno=d.turno)),
    'bateladas',(select coalesce(json_agg(json_build_object('id',b.id,'lote',b.lote,'produto',pr.nome,'inicio',b.inicio,'fim',b.fim,'rep_linha',b.rep_linha,'rep_congelado',b.rep_congelado,'diosna',b.diosna,'temperatura',b.temperatura,'operador',b.operador,'status',b.status,'farinha',b.farinha) order by b.id),'[]') from bateladas b join produtos pr on pr.id=b.produto_id where b.dia_id=d.id)); end $$;

-- 7) Farinha: massas finalizadas em cada turno com a produção aberta nas masseiras.
create or replace function farinha_massas(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
begin
  perform sess(p_token,array['farinha','admin']);
  return (select coalesce(json_agg(x order by x.id),'[]'::json) from (
    select d.id, d.turno, (select count(*) from bateladas b where b.dia_id=d.id and b.status='Finalizada') as total
    from dias d where d.status='aberto') x); end $$;

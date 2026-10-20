-- Report v3: absorção geral da farinha (uma só, não por moinho) e absenteísmo sem porcentagem.
-- Rode no SQL Editor do Supabase (depois do migracao-report.sql e do migracao-report-v2.sql).

-- 1) Absorção geral da farinha, informada na tela inicial de /farinha (guarda o histórico)
create table if not exists farinha_absorcoes(id serial primary key, valor numeric not null check(valor>0 and valor<=200), registrado_em timestamptz not null default now());
alter table farinha_absorcoes enable row level security;

create or replace function farinha_absorcao_salvar(p_token uuid, p_valor numeric) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['farinha']);
  if p_valor is null or p_valor<=0 or p_valor>200 then raise exception 'Informe uma absorção válida'; end if;
  insert into farinha_absorcoes(valor) values(p_valor); end $$;

-- 2) Estado da farinha agora devolve a absorção atual
create or replace function farinha_estado(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['farinha','admin']);
  return json_build_object(
    'moinhos',(select coalesce(json_agg(nome order by nome),'[]') from moinhos where ativo),
    'vigente',farinha_vigente(),'pendente',farinha_pendente(),
    'absorcao',(select json_build_object('valor',a.valor,'registrado_em',a.registrado_em) from farinha_absorcoes a order by a.id desc limit 1),
    'historico',(select coalesce(json_agg(h),'[]') from (select t.moega,t.moinho,t.lote,t.registrado_em,((select count(*) from bateladas b where b.criado>t.registrado_em)>=t.aguardar) as efetivo from farinha_trocas t order by t.id desc limit 60) h)); end $$;

-- 3) Report: conta também as massas ainda batendo (produzido = finalizadas + batendo); traz a absorção que valia no fim da produção (a mais recente, se ainda estiver aberta)
create or replace function report_dia(p_token uuid, p_dia int) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; begin
  s:=sess(p_token,array['lider']);
  select * into d from dias where id=p_dia and turno=s.turno;
  if not found then raise exception 'Produção não encontrada'; end if;
  return json_build_object(
    'dia',json_build_object('id',d.id,'data',d.data,'turno',d.turno,'meta',(select m.meta from metas_dia m where m.data=d.data and m.turno=d.turno)),
    'produtos',(select coalesce(json_agg(q order by q.primeiro),'[]') from (
        select pr.nome as produto, pr.codigo,
               count(*) as massas,
               count(*) filter (where b.rep_congelado) as congelado,
               count(*) filter (where b.rep_linha) as linha,
               min(b.id) as primeiro
        from bateladas b join produtos pr on pr.id=b.produto_id where b.dia_id=d.id group by pr.nome, pr.codigo) q),
    'moinhos',(select coalesce(json_agg(x),'[]') from (
        select distinct pr.nome as produto, f->>'moinho' as moinho, f->>'lote' as lote
        from bateladas b join produtos pr on pr.id=b.produto_id, jsonb_array_elements(coalesce(b.farinha,'[]'::jsonb)) f where b.dia_id=d.id) x),
    'absorcao',(select a.valor from farinha_absorcoes a where a.registrado_em<=coalesce(d.encerrado_em,now()) order by a.registrado_em desc, a.id desc limit 1),
    'colaboradores',(select coalesce(json_agg(json_build_object('id',c.id,'nome',c.nome) order by c.nome),'[]') from colaboradores c where c.ativo and c.turno=d.turno),
    'motivos',(select coalesce(json_agg(m.nome order by m.nome),'[]') from motivos_abs m where m.ativo),
    'salvo',(select r.dados from reports r where r.dia_id=d.id),
    'estoque_gelo_anterior',(select r.dados->>'estoque_gelo' from reports r join dias d2 on d2.id=r.dia_id where d2.turno=d.turno and r.dia_id<>d.id order by r.atualizado_em desc limit 1)); end $$;

-- Report do dia anterior (líder do 1º turno): junta os reports dos 3 turnos.
-- Rode no SQL Editor do Supabase (depois do migracao-report-v3.sql / v4).

-- 1) Códigos dos produtos (só preenche os que ainda estão sem código)
update produtos set codigo='PF0005' where nome='Pão Francês 6H' and codigo is null;
update produtos set codigo='PF0014' where nome='Pão Francês 90g' and codigo is null;
update produtos set codigo='PF0017' where nome='Pão Francês Proteico' and codigo is null;
update produtos set codigo='PF0002' where nome='Pão Francês 12h' and codigo is null;
update produtos set codigo='PG0030' where nome='Pão Cará' and codigo is null;
update produtos set codigo='PF0015' where nome='Integral' and codigo is null;
update produtos set codigo='PF0016' where nome='Massa Madre' and codigo is null;

-- 2) Report geral salvo (edições do líder do 1º turno)
create table if not exists reports_gerais(data date primary key, dados jsonb not null default '{}'::jsonb, atualizado_em timestamptz not null default now());
alter table reports_gerais enable row level security;

-- 3) Dados de um dia/turno (mesmo conteúdo do report_dia, sem checar sessão; só funções internas chamam)
create or replace function report_dados(p_dia int) returns json language plpgsql security definer set search_path=public as $$
declare d dias; begin
  select * into d from dias where id=p_dia;
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
revoke execute on function report_dados(int) from public, anon, authenticated;

-- 4) Report do dia anterior: só o líder do 1º turno
create or replace function report_geral(p_token uuid, p_data date) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; begin
  s:=sess(p_token,array['lider']);
  if s.turno<>'1º turno' then raise exception 'Somente o líder do 1º turno acessa o report do dia anterior'; end if;
  return json_build_object('data',p_data,
    'turnos',(select json_agg(json_build_object('turno',t.turno,'dados',case when x.id is null then null else report_dados(x.id) end) order by t.ord)
              from (values ('1º turno',1),('2º turno',2),('3º turno',3)) as t(turno,ord)
              left join lateral (select dd.id from dias dd where dd.data=p_data and dd.turno=t.turno order by dd.id desc limit 1) x on true),
    'salvo',(select g.dados from reports_gerais g where g.data=p_data)); end $$;

create or replace function report_geral_salvar(p_token uuid, p_data date, p_dados jsonb) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; begin
  s:=sess(p_token,array['lider']);
  if s.turno<>'1º turno' then raise exception 'Somente o líder do 1º turno acessa o report do dia anterior'; end if;
  insert into reports_gerais(data,dados) values(p_data,p_dados) on conflict(data) do update set dados=p_dados, atualizado_em=now(); end $$;

create or replace function report_geral_limpar(p_token uuid, p_data date) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; begin
  s:=sess(p_token,array['lider']);
  if s.turno<>'1º turno' then raise exception 'Somente o líder do 1º turno acessa o report do dia anterior'; end if;
  delete from reports_gerais where data=p_data; end $$;

-- Ajuste do report para o modelo JBT (colunas por produto, código do produto).
-- Rode no SQL Editor do Supabase (depois do migracao-report.sql).
alter table produtos add column if not exists codigo text;
create or replace function admin_produto_codigo(p_token uuid, p_id int, p_codigo text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']); update produtos set codigo=nullif(trim(coalesce(p_codigo,'')),'') where id=p_id; end $$;

create or replace function report_dia(p_token uuid, p_dia int) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; begin
  s:=sess(p_token,array['lider']);
  select * into d from dias where id=p_dia and turno=s.turno;
  if not found then raise exception 'Produção não encontrada'; end if;
  return json_build_object(
    'dia',json_build_object('id',d.id,'data',d.data,'turno',d.turno,'meta',(select m.meta from metas_dia m where m.data=d.data and m.turno=d.turno)),
    'produtos',(select coalesce(json_agg(q order by q.primeiro),'[]') from (
        select pr.nome as produto, pr.codigo,
               count(*) filter (where b.status='Finalizada') as massas,
               count(*) filter (where b.status='Finalizada' and b.rep_congelado) as congelado,
               count(*) filter (where b.status='Finalizada' and b.rep_linha) as linha,
               min(b.id) as primeiro
        from bateladas b join produtos pr on pr.id=b.produto_id where b.dia_id=d.id group by pr.nome, pr.codigo) q),
    'moinhos',(select coalesce(json_agg(x),'[]') from (
        select distinct pr.nome as produto, f->>'moinho' as moinho, f->>'lote' as lote, f->>'absorcao' as absorcao
        from bateladas b join produtos pr on pr.id=b.produto_id, jsonb_array_elements(coalesce(b.farinha,'[]'::jsonb)) f where b.dia_id=d.id) x),
    'colaboradores',(select coalesce(json_agg(json_build_object('id',c.id,'nome',c.nome) order by c.nome),'[]') from colaboradores c where c.ativo and c.turno=d.turno),
    'motivos',(select coalesce(json_agg(m.nome order by m.nome),'[]') from motivos_abs m where m.ativo),
    'salvo',(select r.dados from reports r where r.dia_id=d.id),
    'estoque_gelo_anterior',(select r.dados->>'estoque_gelo' from reports r join dias d2 on d2.id=r.dia_id where d2.turno=d.turno and r.dia_id<>d.id order by r.atualizado_em desc limit 1)); end $$;

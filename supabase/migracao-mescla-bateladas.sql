-- Faz a tela do operador receber a mescla (moinho e lote) de cada batelada.
-- Rode no SQL Editor do Supabase (depois do migracao-farinha.sql).
create or replace function estado(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; begin
  s:=sess(p_token,array['operador','lider']);
  select * into d from dias where turno=s.turno and status='aberto';
  return json_build_object(
    'produtos',(select coalesce(json_agg(p order by p.ordem),'[]') from produtos p where p.ativo),
    'meta',(select m.meta from metas_dia m where m.turno=s.turno and m.data=coalesce(d.data,data_producao(s.turno))),
    'dia',case when d.id is null then null else (select json_build_object('id',d.id,'data',d.data,'turno',d.turno,'contador',d.contador,'produto_id',d.produto_id,'produto',pr.nome) from produtos pr where pr.id=d.produto_id) end,
    'bateladas',(select coalesce(json_agg(json_build_object('id',b.id,'lote',b.lote,'produto',pr.nome,'inicio',b.inicio,'fim',b.fim,'rep_linha',b.rep_linha,'rep_congelado',b.rep_congelado,'diosna',b.diosna,'temperatura',b.temperatura,'operador',b.operador,'status',b.status,'farinha',b.farinha) order by b.id),'[]') from bateladas b join produtos pr on pr.id=b.produto_id where b.dia_id=d.id)); end $$;

-- Só para quem já rodou o schema.sql antes desta versão.
create or replace function admin_dia(p_token uuid, p_dia int) returns json language plpgsql security definer set search_path=public as $$
declare d dias; begin
  perform sess(p_token,array['admin']);
  select * into d from dias where id=p_dia;
  return json_build_object('data',d.data,'turno',d.turno,'bateladas',(select coalesce(json_agg(json_build_object('lote',b.lote,'produto',pr.nome,'hi',to_char(b.inicio at time zone 'America/Sao_Paulo','HH24:MI'),'hf',to_char(b.fim at time zone 'America/Sao_Paulo','HH24:MI'),'rep_linha',b.rep_linha,'rep_congelado',b.rep_congelado,'diosna',b.diosna,'temp',b.temperatura,'operador',b.operador) order by b.id),'[]') from bateladas b join produtos pr on pr.id=b.produto_id where b.dia_id=d.id)); end $$;

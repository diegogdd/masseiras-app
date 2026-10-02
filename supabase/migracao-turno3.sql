-- Só para quem já rodou o schema.sql antes desta versão.
-- Produção do 3º turno passa a contar para o dia seguinte (começa ~21:50, termina ~05:30).
-- Pode rodar mais de uma vez sem problema.

-- Data de produção: o 3º turno começa à noite (~21:50) e termina de manhã (~05:30);
-- a produção dele conta para o DIA SEGUINTE. Do meio-dia em diante, o 3º turno já é do dia seguinte.
create or replace function data_producao(p_turno text, p_ts timestamptz default now()) returns date language sql stable as $$
  select (p_ts at time zone 'America/Sao_Paulo')::date
    + case when p_turno='3º turno' and extract(hour from p_ts at time zone 'America/Sao_Paulo')>=12 then 1 else 0 end $$;

create or replace function estado(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; begin
  s:=sess(p_token,array['operador','lider']);
  select * into d from dias where turno=s.turno and status='aberto';
  return json_build_object(
    'produtos',(select coalesce(json_agg(p order by p.ordem),'[]') from produtos p where p.ativo),
    'meta',(select m.meta from metas_dia m where m.turno=s.turno and m.data=coalesce(d.data,data_producao(s.turno))),
    'dia',case when d.id is null then null else (select json_build_object('id',d.id,'data',d.data,'turno',d.turno,'contador',d.contador,'produto_id',d.produto_id,'produto',pr.nome) from produtos pr where pr.id=d.produto_id) end,
    'bateladas',(select coalesce(json_agg(json_build_object('id',b.id,'lote',b.lote,'produto',pr.nome,'inicio',b.inicio,'fim',b.fim,'rep_linha',b.rep_linha,'rep_congelado',b.rep_congelado,'diosna',b.diosna,'temperatura',b.temperatura,'operador',b.operador,'status',b.status) order by b.id),'[]') from bateladas b join produtos pr on pr.id=b.produto_id where b.dia_id=d.id)); end $$;

create or replace function iniciar_dia(p_token uuid, p_produto int) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; begin
  s:=sess(p_token,array['operador']);
  if exists(select 1 from dias where turno=s.turno and status='aberto') then return; end if;
  insert into dias(data,turno,produto_id) values(data_producao(s.turno),s.turno,p_produto); end $$;

create or replace function definir_meta(p_token uuid, p_meta int) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; dt date; begin
  s:=sess(p_token,array['lider']);
  select data into dt from dias where turno=s.turno and status='aberto';
  insert into metas_dia(data,turno,meta) values(coalesce(dt,data_producao(s.turno)),s.turno,p_meta)
  on conflict(data,turno) do update set meta=p_meta; end $$;

-- Corrige o histórico: dias do 3º turno passam para a data de produção (a partir da 1ª batelada de cada dia),
-- e a meta de cada dia acompanha a nova data.
do $$
declare r record;
begin
  for r in
    select d.id, d.data as antiga, data_producao(d.turno, b.mi) as nova
    from dias d
    join lateral (select min(inicio) as mi from bateladas where dia_id=d.id) b on b.mi is not null
    where d.turno='3º turno'
    order by d.data desc, d.id desc
  loop
    if r.antiga<>r.nova then
      update metas_dia set data=r.nova
        where turno='3º turno' and data=r.antiga
          and not exists(select 1 from metas_dia m2 where m2.turno='3º turno' and m2.data=r.nova);
      update dias set data=r.nova where id=r.id;
    end if;
  end loop;
end $$;

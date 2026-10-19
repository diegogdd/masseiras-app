-- Report de produção do dia (líder), absorção da farinha, colaboradores e motivos de absenteísmo.
-- Rode este arquivo inteiro no SQL Editor do Supabase.

-- 0) Código do produto (ex.: PF0005), usado no report
alter table produtos add column if not exists codigo text;
create or replace function admin_produto_codigo(p_token uuid, p_id int, p_codigo text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']); update produtos set codigo=nullif(trim(coalesce(p_codigo,'')),'') where id=p_id; end $$;

-- 1) Absorção da farinha (informada pelo operador de ponte rolante; só vai para o report)
alter table farinha_trocas add column if not exists absorcao numeric;

create or replace function farinha_vigente() returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(x order by (x->>'moega')::int),'[]'::jsonb) from (
    select (select jsonb_build_object('moega',m,'moinho',t.moinho,'lote',t.lote,'absorcao',t.absorcao) from farinha_trocas t
            where t.moega=m and (select count(*) from bateladas b where b.criado>t.registrado_em)>=t.aguardar
            order by t.registrado_em desc, t.id desc limit 1) x
    from generate_series(1,2) m) q where x is not null $$;

create or replace function farinha_pendente() returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('moega',t.moega,'moinho',t.moinho,'lote',t.lote,'absorcao',t.absorcao) order by t.moega),'[]'::jsonb)
  from farinha_trocas t
  where t.id=(select max(t2.id) from farinha_trocas t2 where t2.moega=t.moega)
    and (select count(*) from bateladas b where b.criado>t.registrado_em)<t.aguardar $$;

create or replace function farinha_estado(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['farinha','admin']);
  return json_build_object(
    'moinhos',(select coalesce(json_agg(nome order by nome),'[]') from moinhos where ativo),
    'vigente',farinha_vigente(),'pendente',farinha_pendente(),
    'historico',(select coalesce(json_agg(h),'[]') from (select t.moega,t.moinho,t.lote,t.absorcao,t.registrado_em,((select count(*) from bateladas b where b.criado>t.registrado_em)>=t.aguardar) as efetivo from farinha_trocas t order by t.id desc limit 60) h)); end $$;

drop function if exists farinha_trocar(uuid,int,text,text);
create or replace function farinha_trocar(p_token uuid, p_moega int, p_moinho text, p_lote text, p_absorcao numeric default null) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['farinha']);
  if not exists(select 1 from moinhos where nome=p_moinho and ativo) then raise exception 'Moinho inválido'; end if;
  if trim(coalesce(p_lote,''))='' then raise exception 'Informe o lote'; end if;
  insert into farinha_trocas(moega,moinho,lote,absorcao,aguardar) values(p_moega,p_moinho,trim(p_lote),p_absorcao,case when exists(select 1 from farinha_trocas where moega=p_moega) then 1 else 0 end); end $$;

-- 2) Colaboradores por turno, motivos de absenteísmo e reports salvos
create table if not exists colaboradores(id serial primary key, nome text not null, turno text not null, ativo boolean not null default true);
create table if not exists motivos_abs(id serial primary key, nome text unique not null, ativo boolean not null default true);
insert into motivos_abs(nome) values('Falta'),('Atestado'),('Férias') on conflict do nothing;
create table if not exists reports(dia_id int primary key references dias(id) on delete cascade, dados jsonb not null default '{}'::jsonb, atualizado_em timestamptz not null default now());
alter table colaboradores enable row level security; alter table motivos_abs enable row level security; alter table reports enable row level security;

-- 3) Admin: colaboradores e motivos
create or replace function admin_rh(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']);
  return json_build_object(
    'colaboradores',(select coalesce(json_agg(json_build_object('id',c.id,'nome',c.nome,'turno',c.turno) order by c.turno,c.nome),'[]') from colaboradores c where c.ativo),
    'motivos',(select coalesce(json_agg(m.nome order by m.nome),'[]') from motivos_abs m where m.ativo)); end $$;

create or replace function admin_colaborador(p_token uuid, p_nome text, p_turno text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']);
  if trim(coalesce(p_nome,''))='' or coalesce(p_turno,'')='' then raise exception 'Informe o nome e o turno'; end if;
  insert into colaboradores(nome,turno) values(trim(p_nome),p_turno); end $$;

create or replace function admin_excluir_colaborador(p_token uuid, p_id int) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']); update colaboradores set ativo=false where id=p_id; end $$;

create or replace function admin_motivo_abs(p_token uuid, p_nome text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']);
  if trim(coalesce(p_nome,''))='' then raise exception 'Informe o motivo'; end if;
  insert into motivos_abs(nome) values(trim(p_nome)) on conflict(nome) do update set ativo=true; end $$;

create or replace function admin_excluir_motivo_abs(p_token uuid, p_nome text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']); update motivos_abs set ativo=false where nome=p_nome; end $$;

-- 4) Report do líder: dados calculados da produção + o que o líder já salvou
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

create or replace function report_salvar(p_token uuid, p_dia int, p_dados jsonb) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; begin
  s:=sess(p_token,array['lider']);
  if not exists(select 1 from dias where id=p_dia and turno=s.turno) then raise exception 'Produção não encontrada'; end if;
  insert into reports(dia_id,dados) values(p_dia,p_dados) on conflict(dia_id) do update set dados=p_dados, atualizado_em=now(); end $$;

create or replace function report_limpar(p_token uuid, p_dia int) returns void language plpgsql security definer set search_path=public as $$
declare s sessions; begin
  s:=sess(p_token,array['lider']);
  delete from reports where dia_id=p_dia and exists(select 1 from dias where id=p_dia and turno=s.turno); end $$;

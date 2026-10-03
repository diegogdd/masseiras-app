-- Abastecimento de farinha, excluir produção e Excel da farinha.
-- Rode este arquivo inteiro no SQL Editor do Supabase (serve para quem já tem o banco).

-- 1) Novo acesso: operador de ponte rolante ("farinha"), sem turno, como o admin
alter table usuarios drop constraint if exists usuarios_perfil_check;
alter table usuarios add constraint usuarios_perfil_check check(perfil in('operador','lider','admin','farinha'));

-- 2) Tabelas
create table if not exists moinhos(id serial primary key, nome text unique not null, ativo boolean not null default true);
insert into moinhos(nome) values('Bunge'),('Realta') on conflict do nothing;
create table if not exists farinha_trocas(id serial primary key, moega int not null check(moega in(1,2)), moinho text not null, lote text not null, aguardar int not null default 1, registrado_em timestamptz not null default now());
alter table moinhos enable row level security; alter table farinha_trocas enable row level security;
alter table bateladas add column if not exists criado timestamptz not null default now();
alter table bateladas add column if not exists farinha jsonb;

-- 3) Mescla vigente: a troca só vale depois que 1 batelada já foi iniciada (a que está carregada na balança)
create or replace function farinha_vigente() returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(x order by (x->>'moega')::int),'[]'::jsonb) from (
    select (select jsonb_build_object('moega',m,'moinho',t.moinho,'lote',t.lote) from farinha_trocas t
            where t.moega=m and (select count(*) from bateladas b where b.criado>t.registrado_em)>=t.aguardar
            order by t.registrado_em desc, t.id desc limit 1) x
    from generate_series(1,2) m) q where x is not null $$;

create or replace function farinha_pendente() returns jsonb language sql security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('moega',t.moega,'moinho',t.moinho,'lote',t.lote) order by t.moega),'[]'::jsonb)
  from farinha_trocas t
  where t.id=(select max(t2.id) from farinha_trocas t2 where t2.moega=t.moega)
    and (select count(*) from bateladas b where b.criado>t.registrado_em)<t.aguardar $$;

-- 4) Ponte rolante: ver e trocar lote/moinho
create or replace function farinha_estado(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['farinha','admin']);
  return json_build_object(
    'moinhos',(select coalesce(json_agg(nome order by nome),'[]') from moinhos where ativo),
    'vigente',farinha_vigente(),'pendente',farinha_pendente(),
    'historico',(select coalesce(json_agg(h),'[]') from (select t.moega,t.moinho,t.lote,t.registrado_em,((select count(*) from bateladas b where b.criado>t.registrado_em)>=t.aguardar) as efetivo from farinha_trocas t order by t.id desc limit 60) h)); end $$;

create or replace function farinha_trocar(p_token uuid, p_moega int, p_moinho text, p_lote text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['farinha']);
  if not exists(select 1 from moinhos where nome=p_moinho and ativo) then raise exception 'Moinho inválido'; end if;
  if trim(coalesce(p_lote,''))='' then raise exception 'Informe o lote'; end if;
  insert into farinha_trocas(moega,moinho,lote,aguardar) values(p_moega,p_moinho,trim(p_lote),case when exists(select 1 from farinha_trocas where moega=p_moega) then 1 else 0 end); end $$;

-- 5) Iniciar batelada: grava a mescla vigente na batelada e devolve os avisos para a masseira
drop function if exists iniciar_batelada(uuid,boolean,boolean,int,timestamptz);
create function iniciar_batelada(p_token uuid, p_linha boolean, p_cong boolean, p_diosna int, p_inicio timestamptz) returns json language plpgsql security definer set search_path=public as $$
declare s sessions; d dias; n int; vig jsonb; pend jsonb; prev jsonb; tem_prev boolean; tr jsonb; begin
  s:=sess(p_token,array['operador']);
  select * into d from dias where turno=s.turno and status='aberto' for update;
  if not found then raise exception 'Produção do dia não iniciada'; end if;
  if exists(select 1 from bateladas where dia_id=d.id and status='Batendo' and diosna=p_diosna) then raise exception 'Esta Diosna já está batendo'; end if;
  vig:=farinha_vigente(); pend:=farinha_pendente();
  select farinha into prev from bateladas order by id desc limit 1; tem_prev:=found;
  update dias set contador=contador+1 where id=d.id returning contador into n;
  insert into bateladas(dia_id,produto_id,lote,inicio,rep_linha,rep_congelado,diosna,farinha) values(d.id,d.produto_id,n,p_inicio,p_linha,p_cong,p_diosna,vig);
  select coalesce(jsonb_agg(jsonb_build_object('moega',(v->>'moega')::int,'para',v,'de',(select p from jsonb_array_elements(coalesce(prev,'[]'::jsonb)) p where p->>'moega'=v->>'moega' limit 1))),'[]'::jsonb) into tr
    from jsonb_array_elements(vig) v
    where tem_prev and not exists(select 1 from jsonb_array_elements(coalesce(prev,'[]'::jsonb)) p where p->>'moega'=v->>'moega' and p->>'moinho'=v->>'moinho' and p->>'lote'=v->>'lote');
  return json_build_object('farinha',vig,'trocas',tr,'proximas',pend); end $$;

-- 6) Admin: excluir produção, moinhos, acesso farinha, dados do dia com a farinha
create or replace function admin_excluir_dia(p_token uuid, p_dia int) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']);
  delete from bateladas where dia_id=p_dia; delete from dias where id=p_dia; end $$;

create or replace function admin_moinho(p_token uuid, p_nome text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']);
  if trim(coalesce(p_nome,''))='' then raise exception 'Informe o nome do moinho'; end if;
  insert into moinhos(nome) values(trim(p_nome)) on conflict(nome) do update set ativo=true; end $$;

create or replace function admin_excluir_moinho(p_token uuid, p_nome text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']); update moinhos set ativo=false where nome=p_nome; end $$;

create or replace function login(p_perfil text, p_turno text, p_senha text) returns json language plpgsql security definer set search_path=public as $$
declare u usuarios; t uuid; begin
  select * into u from usuarios where perfil=p_perfil and (perfil in('admin','farinha') or turno=p_turno) and senha_hash=extensions.crypt(p_senha,senha_hash) limit 1;
  if not found then raise exception 'Senha incorreta'; end if;
  insert into sessions(perfil,turno) values(u.perfil,u.turno) returning token into t;
  delete from sessions where criado<now()-interval '2 days';
  return json_build_object('token',t,'perfil',u.perfil,'turno',u.turno,'nome',u.nome); end $$;

create or replace function admin_usuario(p_token uuid, p_id int, p_nome text, p_perfil text, p_turno text, p_senha text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']);
  if p_perfil not in('admin','farinha') and coalesce(p_turno,'')='' then raise exception 'Informe o turno'; end if;
  if p_id is null then
    if coalesce(p_senha,'')='' then raise exception 'Informe a senha'; end if;
    insert into usuarios(nome,perfil,turno,senha_hash) values(p_nome,p_perfil,case when p_perfil in('admin','farinha') then null else p_turno end,extensions.crypt(p_senha,extensions.gen_salt('bf')));
  else
    update usuarios set nome=p_nome,perfil=p_perfil,turno=case when p_perfil in('admin','farinha') then null else p_turno end,senha_hash=case when coalesce(p_senha,'')='' then senha_hash else extensions.crypt(p_senha,extensions.gen_salt('bf')) end where id=p_id;
  end if; end $$;

create or replace function admin_listar(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']);
  return json_build_object(
    'usuarios',(select coalesce(json_agg(json_build_object('id',u.id,'nome',u.nome,'perfil',u.perfil,'turno',u.turno) order by u.perfil,u.turno,u.nome),'[]') from usuarios u),
    'produtos',(select coalesce(json_agg(p order by p.ordem),'[]') from produtos p where p.ativo),
    'moinhos',(select coalesce(json_agg(m.nome order by m.nome),'[]') from moinhos m where m.ativo)); end $$;

create or replace function admin_dia(p_token uuid, p_dia int) returns json language plpgsql security definer set search_path=public as $$
declare d dias; begin
  perform sess(p_token,array['admin']);
  select * into d from dias where id=p_dia;
  return json_build_object('data',d.data,'turno',d.turno,'bateladas',(select coalesce(json_agg(json_build_object('lote',b.lote,'produto',pr.nome,'hi',to_char(b.inicio at time zone 'America/Sao_Paulo','HH24:MI'),'hf',to_char(b.fim at time zone 'America/Sao_Paulo','HH24:MI'),'rep_linha',b.rep_linha,'rep_congelado',b.rep_congelado,'diosna',b.diosna,'temp',b.temperatura,'operador',b.operador,'farinha',b.farinha) order by b.id),'[]') from bateladas b join produtos pr on pr.id=b.produto_id where b.dia_id=d.id)); end $$;

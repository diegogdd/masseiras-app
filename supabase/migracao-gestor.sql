-- ===== Acesso "Gestor" (painel de gráficos e análises da produção) =====
-- Rode este arquivo inteiro no SQL Editor do Supabase. Pode rodar mais de uma vez sem problema.
-- Não altera a função login nem a tabela usuarios: o Gestor tem login próprio (login_gestor).

-- 1) Senha do Gestor (guardada com hash; rodar de novo NÃO volta para a senha inicial)
create table if not exists gestor_acesso(id int primary key default 1 check(id=1), senha_hash text not null);
alter table gestor_acesso enable row level security;
insert into gestor_acesso(id,senha_hash) values(1,extensions.crypt('admin2580',extensions.gen_salt('bf'))) on conflict(id) do nothing;
-- Para trocar a senha depois:
--   update gestor_acesso set senha_hash=extensions.crypt('NOVA_SENHA',extensions.gen_salt('bf')) where id=1;

-- 2) Login do Gestor (devolve o mesmo formato do login normal)
create or replace function login_gestor(p_senha text) returns json language plpgsql security definer set search_path=public as $$
declare t uuid; begin
  if not exists(select 1 from gestor_acesso where senha_hash=extensions.crypt(coalesce(p_senha,''),senha_hash)) then raise exception 'Senha incorreta'; end if;
  insert into sessions(perfil,turno) values('gestor',null) returning token into t;
  delete from sessions where criado<now()-interval '2 days';
  return json_build_object('token',t,'perfil','gestor','turno',null,'nome','Gestor'); end $$;

-- 3) Dados de produção (massas) dos últimos 400 dias, já agregados por dia/turno e por hora
create or replace function gestor_dados(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
declare lim date; begin
  perform sess(p_token,array['gestor']);
  lim:=greatest((now() at time zone 'America/Sao_Paulo')::date-400,date '2026-10-05'); -- massas contam a partir de 05/10/2026
  return json_build_object(
    'hoje',(now() at time zone 'America/Sao_Paulo')::date,
    'dias',(select coalesce(json_agg(x order by x.data,x.ord),'[]') from (
      select d.id,d.data,d.turno,d.status,m.meta,
        case d.turno when '1º turno' then 1 when '2º turno' then 2 else 3 end as ord,
        count(b.id) filter(where b.status='Finalizada') as massas,
        count(b.id) filter(where b.status='Finalizada' and b.rep_congelado) as rep_cong,
        count(b.id) filter(where b.status='Finalizada' and b.rep_linha) as rep_linha,
        round(avg(b.temperatura) filter(where b.status='Finalizada'),1) as temp,
        round((extract(epoch from (max(b.fim) filter(where b.status='Finalizada')-min(b.inicio) filter(where b.status='Finalizada')))/3600)::numeric,2) as horas,
        (select json_object_agg(q.n,q.c) from (select pr.nome n,count(*) c from bateladas b2 join produtos pr on pr.id=b2.produto_id where b2.dia_id=d.id and b2.status='Finalizada' group by pr.nome) q) as por_produto
      from dias d left join bateladas b on b.dia_id=d.id left join metas_dia m on m.data=d.data and m.turno=d.turno
      where d.data>=lim group by d.id,m.meta) x),
    'horas',(select coalesce(json_agg(json_build_object('data',q.data,'turno',q.turno,'hora',q.h,'n',q.n)),'[]') from (
      select d.data,d.turno,extract(hour from b.inicio at time zone 'America/Sao_Paulo')::int h,count(*) n
      from bateladas b join dias d on d.id=b.dia_id where b.status='Finalizada' and d.data>=lim group by 1,2,3) q)); end $$;

-- 4) Pacotes (embalamento/transpaleteira): só a partir de 28/10/2026, pois antes o embalamento não estava no sistema.
-- Reaproveita a própria pallets_resumo do sistema: o Gestor só chega aqui depois de validar a sessão dele,
-- e uma sessão interna temporária (que existe só durante esta chamada e nunca fica gravada) consulta o resumo.
create or replace function gestor_pallets(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
declare tk uuid; r jsonb; ini constant date:=date '2026-10-28'; begin
  perform sess(p_token,array['gestor']);
  insert into sessions(perfil,turno) values('admin',null) returning token into tk;
  r:=coalesce(pallets_resumo(p_token:=tk)::jsonb,'{}'::jsonb);
  delete from sessions where token=tk;
  return json_build_object('inicio',ini,
    'itens',(select coalesce(json_agg(i),'[]') from jsonb_array_elements(coalesce(r->'itens','[]'::jsonb)) i where (i->>'data')::date>=ini),
    'enc',(select coalesce(json_agg(e),'[]') from jsonb_array_elements(coalesce(r->'enc','[]'::jsonb)) e where (e->>'data')::date>=ini)); end $$;

-- 5) Tempo Real: produção do dia (massas por turno + pallets/pacotes do dia) para abrir no celular.
-- Dia de produção = hoje; se o 3º turno da noite já abriu (data de amanhã), mostra o de amanhã.
-- Os pallets vêm do mesmo resumo que a transpaleteira usa (pallet_estado_v2/pallet_estado), lido por uma sessão
-- interna temporária que existe só durante esta chamada. Se isso falhar, as massas continuam aparecendo e "pallets" volta nulo.
create or replace function gestor_tempo_real(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
declare hj date; dt date; tk uuid; r jsonb; pal json; begin
  perform sess(p_token,array['gestor']);
  hj:=(now() at time zone 'America/Sao_Paulo')::date;
  dt:=case when exists(select 1 from dias where data=hj+1) then hj+1 else hj end;
  begin
    insert into sessions(perfil,turno) values('transpaleteira',case when dt>hj then '3º turno' else '1º turno' end) returning token into tk;
    begin r:=pallet_estado_v2(p_token:=tk)::jsonb;
    exception when undefined_function then r:=pallet_estado(p_token:=tk)::jsonb; end;
    pal:=json_build_object('data',r->'data','lista',coalesce(r->'lista','[]'::jsonb));
    delete from sessions where token=tk;
  exception when others then pal:=null; end;
  return json_build_object('data',dt,'agora',to_char(now() at time zone 'America/Sao_Paulo','HH24:MI'),
    'turnos',(select coalesce(json_agg(json_build_object('turno',t.turno,'massas',coalesce(x.massas,0),'batendo',coalesce(x.batendo,0),'status',x.status) order by t.ord),'[]')
      from (values('1º turno',1),('2º turno',2),('3º turno',3)) as t(turno,ord)
      left join (select d.turno,d.status,count(b.id) filter(where b.status in('Finalizada','Batendo')) as massas, count(b.id) filter(where b.status='Batendo') as batendo from dias d left join bateladas b on b.dia_id=d.id where d.data=dt group by d.id) x on x.turno=t.turno),
    'pallets',pal); end $$;

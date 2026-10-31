-- Tempo Real: passa a contar também as massas que estão batendo (status Batendo) além das finalizadas.
-- Rode este arquivo no SQL Editor do Supabase. Retorna também o campo "batendo" (quantas das massas ainda estão batendo).
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

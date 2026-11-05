-- Lista de pallets do dia (com o horário do registro) para o líder calcular a média de pacotes/hora.
-- Mesmo método do Tempo Real do gestor: uma sessão interna temporária consulta a lista da transpaleteira.
-- Rode uma vez no SQL Editor do Supabase.
create or replace function pallets_horarios(p_token uuid) returns json language plpgsql security definer set search_path=public as $$
declare tk uuid; r jsonb; begin
  perform sess(p_token,array['lider','gestor','admin']);
  insert into sessions(perfil,turno) values('transpaleteira','1º turno') returning token into tk;
  begin r:=pallet_estado_v2(p_token:=tk)::jsonb;
  exception when undefined_function then r:=pallet_estado(p_token:=tk)::jsonb; end;
  delete from sessions where token=tk;
  return json_build_object('data',r->'data','lista',coalesce(r->'lista','[]'::jsonb)); end $$;

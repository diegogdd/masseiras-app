-- Só para quem já rodou o schema.sql antes desta versão.
alter table produtos add column if not exists batimento jsonb not null default '[]';
create or replace function admin_batimento(p_token uuid, p_produto int, p_etapas jsonb) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']); update produtos set batimento=coalesce(p_etapas,'[]'::jsonb) where id=p_produto; end $$;

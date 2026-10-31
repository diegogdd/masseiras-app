-- Admin: permite alterar o nome de um produto (o histórico continua ligado ao mesmo produto).
-- Rode este arquivo no SQL Editor do Supabase.
create or replace function admin_produto_nome(p_token uuid, p_id int, p_nome text) returns void language plpgsql security definer set search_path=public as $$
begin perform sess(p_token,array['admin']);
  if trim(coalesce(p_nome,''))='' then raise exception 'Informe o nome do produto'; end if;
  if exists(select 1 from produtos where id<>p_id and lower(nome)=lower(trim(p_nome))) then raise exception 'Já existe um produto com esse nome (pode ser um produto excluído)'; end if;
  update produtos set nome=trim(p_nome) where id=p_id; end $$;

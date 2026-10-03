# Controle de Bateladas

Site estático (HTML) + Supabase. Não precisa de build.

## 1. Supabase
1. Crie um projeto em supabase.com.
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. Em **Project Settings > API**, copie a *Project URL* e a *anon public key*.
4. No arquivo `config.js`, troque `COLE_AQUI_A_URL_DO_SUPABASE` e `COLE_AQUI_A_ANON_KEY` por esses valores.

## 2. GitHub
Crie um repositório e envie todos os arquivos e pastas deste projeto.

## 3. Vercel
Em vercel.com, **Add New > Project**, importe o repositório e clique em **Deploy** (sem configurar nada).

## Endereços
- `seusite.vercel.app/operador` para o tablet da linha (deixe este endereço salvo/adicionado à tela inicial)
- `seusite.vercel.app/lider` para os líderes
- `seusite.vercel.app/admin` para o administrador
- `seusite.vercel.app/farinha` para o operador de ponte rolante (Abastecimento Farinha)
- `seusite.vercel.app/treinamento` para treinamentos (dados fictícios, só no navegador)

Cada endereço só aceita o login do seu perfil.

## Acessos iniciais (troque no painel Admin)
| Acesso | Turno | Senha |
|---|---|---|
| Operador | 1º / 2º / 3º | 1111 / 2222 / 3333 |
| Líder | 1º / 2º / 3º | lider1 / lider2 / lider3 |
| Administrador | - | admin123 |

No painel Admin: cadastre usuários e senhas, produtos e receitas de batimento. A meta do dia é definida pelo líder, no acesso dele.

Se você já rodou uma versão anterior do `schema.sql`, apague as tabelas antigas (ou crie um projeto novo) antes de rodar esta.

## Excel do histórico (admin)
No `/admin`, em Histórico de produção, escolha o dia e o turno e clique em **Baixar Excel**. O arquivo segue o formulário FM-000219 (uma página por produto, com 37 lotes por página) e já vem configurado para imprimir em A4.
A geração roda em uma função da Vercel (`api/excel.py`); o arquivo `requirements.txt` instala o que ela precisa. Se já tinha rodado o `schema.sql`, rode também `supabase/migracao-excel.sql`.

## Abastecimento de farinha
- No `/admin`, em Usuários, crie um acesso do tipo **farinha** (sem turno) com a senha do operador de ponte rolante. Em **Moinhos de farinha** cadastre os moinhos (já vêm Bunge e Realta).
- No `/farinha`, o operador informa moinho e lote de cada moega e vê o histórico de trocas.
- A troca só vale a partir da batelada seguinte à que já está carregada na balança. Cada batelada guarda a mescla usada.
- Na masseira, depois de escolher a Diosna, aparece a mescla atual (logo e lote de cada moinho), os avisos de troca e o botão CIENTE.
- Logos: `img/moinhos/bunge.png`, `img/moinhos/realta.png` (nome em minúsculas).
- No histórico do admin: **Baixar Excel** (formulário FM-000219), **Excel da farinha** (moinho e lote por batelada, arquivo separado) e **Excluir** produção.
- Se o banco já existe, rode `supabase/migracao-farinha.sql` no SQL Editor.

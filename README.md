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
- `seusite.vercel.app/gestor` para o gestor (gráficos e análises da produção)
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

## Report de produção do dia (líder)
- No `/lider`, o botão **Gerar report de produção do dia** abre o report do dia/turno escolhido, já preenchido com os dados do sistema: planejado (a meta), massas por produto, total de pacotes (massas × 60), reprocesso MR0036 (reprocesso congelado × 22,5 kg), moinhos usados e absorção da farinha. O líder pode editar qualquer campo.
- O modelo é o "REPORT DE PRODUÇÃO DIÁRIA JBT": uma coluna por produto (até 2 por bloco; com 3 ou mais, o Excel ganha outro bloco). No `/admin`, em Produtos, cadastre o **código** de cada produto (ex.: PF0005), que aparece no report.
- **Nº da ordem:** clique no campo e bipe o código de barras (leitor USB/Bluetooth que digita o código); o Enter passa para o próximo produto. Também dá para tocar em **Ler com a câmera** (celular ou tablet): no Chrome do Android usa o leitor nativo e nos demais navegadores carrega uma biblioteca de leitura. O site precisa estar em https (a Vercel já está) e o navegador pede permissão da câmera na primeira vez.
- **Absorção da farinha:** é uma só, geral (não por moinho). O operador de ponte rolante digita a % no campo **Absorção da farinha** da tela inicial de `/farinha` e toca em **Salvar absorção**. O report já vem com esse valor (o que valia no fim da produção), e o líder pode editar.
- **Absenteísmo:** o admin cadastra os colaboradores por turno e os motivos. No report o líder escolhe só quem faltou (colaborador + motivo) e toca em **Adicionar ausente**; não aparece a lista completa e não há porcentagem.
- **Compartilhar report:** gera a imagem do report preenchido (mesmo modelo do Excel) e abre o menu de compartilhamento do celular para escolher o WhatsApp. Se o aparelho não tiver compartilhamento, a imagem é baixada.
- **Salvar / Baixar Excel / Copiar resumo / Recalcular.** O Excel é gerado pela função `api/report.py`.
- Se o banco já existe, rode `supabase/migracao-report.sql` depois `supabase/migracao-report-v2.sql` e por fim `supabase/migracao-report-v3.sql` no SQL Editor.


## Gestor (gráficos e análises)
- Acesso **Gestor** no menu inicial (`/gestor`), só com senha (sem turno). Senha inicial: `admin2580`.
- Mostra, por período (7, 30, 90 dias ou tudo): massas por dia (empilhadas por turno), **dias mais e menos produtivos** (com % da meta), média por dia da semana, comparação dos turnos (massas/hora, temperatura, meta atingida, reprocesso), massas por produto, horário de pico e um resumo escrito da análise.
- O dia em andamento aparece nos gráficos (mais claro), mas só entra nos rankings e médias depois de encerrado pelos 3 turnos.
- **Pacotes** contam só a partir de **28/10/2026** (antes o embalamento não estava no sistema). Eles vêm dos pallets da transpaleteira, com ranking de melhor e pior dia, média diária, pacotes por produto e pacotes por massa.
- Instalação: rode `supabase/migracao-gestor.sql` no SQL Editor do Supabase (não mexe no login nem nos usuários existentes). Para trocar a senha, use o `update` que está comentado no começo do arquivo.

# CONTINUAR AQUI — Jogo da Meta Batida · instância oficial da Metta

> Handoff pra qualquer sessão do Claude Code. Idioma: português.
> Esta é a **cópia oficial da Metta** do motor (GitHub da Metta + Supabase da Metta),
> criada em 2026-11-18 a partir do protótipo do Pedro (`PedroNavar/jogo-meta-batida`,
> que continua existindo como ambiente de teste/desenvolvimento). As duas instâncias são
> **independentes**: banco, senhas e clientes de uma não aparecem na outra.

## 1. O que é

Quiz de vendas gamificado (pontuação por velocidade, pódio ao vivo, telão), multi-cliente:
cada cliente da Metta é um *tenant* com marca (logo, cor), lojas, perguntas e rodadas
próprias. Começou **vazio** — nenhum cliente cadastrado.

**Clientes:** `vilarejo` (desde 2026-11-19), cópia fiel do cliente Vilarejo do protótipo do
Pedro: mesmo id, lojas, perguntas, rodadas, jogadores, respostas e as **mesmas senhas** de
gerente e admin (os hashes foram copiados). A logo está em `frontend/img/logo-vilarejo-branca.png`
deste repositório. Link: `.../jogo-meta-batida/?c=vilarejo`. A Vilarejo continua também no
protótipo; daqui pra frente as duas cópias andam separadas (rodada jogada numa não aparece na outra).

`protocolo-metta` (desde 2026-11-19): "Time Metta", teste interno do time da Metta sobre o
Protocolo M.E.T.T.A. 1 loja ("Metta"), 20 perguntas no bloco "Protocolo METTA" (tema = fase,
tipo = nível), rodada "Protocolo M.E.T.T.A · Teste do time" de 18 s por pergunta. Para entrar
no pódio, o time escolhe o cargo Vendedor (Regional e Outro ficam fora do pódio).
Desde 2026-11-24 o cliente tem `cargo_fixo = 'Time Metta'` e `rotulo_loja = 'setor'`: o
jogador não escolhe cargo, escolhe o setor (Consultoria, Projetos, Marketing, Mentoria,
Comercial, ADM, cadastrados como lojas 01–06), não vê o link de criar rodada, e o ranking
tem uma lista só. A rodada tem `responsavel = 'Tiago'` e `publico = {Time Metta}`. Qualquer
cliente pode usar essas duas colunas; vazias, nada muda. O pódio agora exclui só
Regional e Outro (antes incluía só Vendedor e Gerente; para os cargos padrão, dá no mesmo).

## 2. Onde está tudo

| O quê | Onde |
|---|---|
| Código | GitHub `metta-brasil-tech/jogos-e-ferramentas-de-habilitacao`, pasta `jogo-meta-batida/` (o repositório vai guardar outros jogos/ferramentas da Metta, cada um na sua pasta) |
| Site (GitHub Pages) | `https://metta-brasil-tech.github.io/jogos-e-ferramentas-de-habilitacao/jogo-meta-batida/` |
| Criar cliente novo | `.../jogo-meta-batida/clientes.html` (senha master) |
| Supabase | projeto `rcmspjlocnuugcsfzles` ("JOGOS E FERRAMENTAS DE HABILITAÇÃO"), us-east-2 |
| Edge Function | `https://rcmspjlocnuugcsfzles.supabase.co/functions/v1/api/<rota>` |
| Publishable key (pública, vai no frontend) | `sb_publishable_l22yITYLod8mBjxNnK3BFA_LkQj1MIZ` |

**Senhas:** nenhuma senha fica em texto puro neste repositório. A senha master foi gerada
e mostrada ao Pedro uma vez, em chat, em 2026-11-18. Senhas de gerente/admin de cada
cliente são definidas por quem cria o cliente, na tela `clientes.html`.

## 3. Como usar (fluxo do dia a dia)

1. `clientes.html` → senha master → cria o cliente (nome, slug, URL da logo, cor, senha
   de gerente, senha de admin). Saem 4 links prontos, todos com `?c=<slug>`.
2. Admin do cliente (`admin.html?c=<slug>`) → cadastra lojas, perguntas (em lote, por
   bloco), importa lista de nomes e cria a rodada (nasce travada).
3. Compartilha o link do jogo e do telão; quando todos estiverem a postos, "Começar para
   todos". Cada jogador recebe a própria ordem embaralhada das perguntas.
4. Ao final: ranking, detalhe por jogador e exportação em CSV ou Excel colorido.

**Todo cliente é resolvido por `?c=<slug>` na URL.** Sem `?c=`, o backend responde
"Cliente não encontrado" (nesta instância ele nunca cai num cliente padrão).

## 4. Como operar o Supabase desta instância

- A CLI só roda via `npx --yes supabase ...` nesta máquina, **de dentro da pasta
  `jogo-meta-batida/`** (é onde fica o `supabase/`).
- Esta pasta está linkada ao projeto da Metta. **Use sempre o token da conta da Metta por
  comando**, sem trocar o login global (que é a conta pessoal do Pedro):
  `SUPABASE_ACCESS_TOKEN=<token da Metta> npx --yes supabase <comando> --yes </dev/null`.
  O token não fica salvo aqui; peça ao Pedro (gerado em supabase.com/dashboard/account/tokens,
  logado como Metta).
- Mudança de banco = nova migration em `supabase/migrations/<timestamp>_nome.sql`, depois
  `db push --remote --yes`.
- Deploy da função: `functions deploy api --no-verify-jwt --yes` (o `--no-verify-jwt` é
  obrigatório: o jogador usa token próprio, não JWT do Supabase).
- Migration que define senha: aplicar com o valor, depois **redigir o arquivo** (trocar o
  valor por um comentário) antes do commit.
- Há um pre-commit hook de segurança (global, versionado no cérebro do Pedro) que barra
  commit com cara de segredo. Placeholder em código: use `"placeholder"`, não `"TODO-hash"`.

## 5. GitHub desta instância

- `gh` nesta máquina tem duas contas: `Metta-Brasil` e `PedroNavar`. Antes de qualquer
  push aqui: `gh auth switch --user Metta-Brasil`; depois, se for mexer no protótipo
  pessoal, voltar com `gh auth switch --user PedroNavar`.
- Deploy do site é automático (`.github/workflows/pages.yml`, na RAIZ do repositório) a
  cada push em qualquer `*/frontend/`. O workflow monta o site com uma subpasta por jogo;
  pra publicar um jogo novo, acrescentar a pasta dele no passo "Montar o site".
- A organização está no plano **free**: GitHub Pages só funciona com o repositório
  **público** — por isso ele é público (decisão do Pedro em 2026-11-18). Foi testado de
  verdade: o repositório nasceu privado e a API do GitHub recusou ligar o Pages
  ("Your current plan does not support GitHub Pages for this repository", HTTP 422).
- Esta pasta local tem `credential.helper` apontando pro `gh` (`git config --local`), então
  `git push` usa a conta ativa do `gh` — por isso a conta ativa precisa ser `Metta-Brasil`.
  Sem isso, o git usava o login salvo da conta pessoal e respondia "Repository not found". Se um projeto futuro precisar de código privado: repositório privado +
  Cloudflare Pages (grátis) ou assinar o GitHub Team. Nunca commitar senha ou token.

## 6. Diferenças em relação ao protótipo do Pedro

- Sem nenhum dado de cliente (as migrations de Sipolatti/Vilarejo/testes não foram
  trazidas — só as 6 de estrutura).
- Sem subpastas de cliente no frontend; logos e títulos genéricos (Metta).
- `tenantPorSlug()` sem `?c=` devolve "não encontrado" em vez do primeiro cliente.

## 7. Limitações conhecidas

- Logo é URL de imagem (sem upload de arquivo/Storage).
- O título da aba do navegador não troca por cliente (trocam a logo, a cor e a frase acima do
  título da entrada, coluna `tenant.sobretitulo`; vazia = "VENDA 4.0 E PRODUTOS").
- Admin sem sessão: a senha vai em cada chamada; o link do CSV/Excel leva a senha na URL
  (decisão do Pedro em 2026-11-14 — não trocar sem ele pedir).
- Pódio "por loja" ainda calcula o top-3 geral.

## 8. Regras de negócio que o backend honra

1. Gabarito só no servidor (só aparece pro admin, no detalhe por jogador).
2. Pontuação 500–1000 por velocidade, 0 se erra ou se o tempo esgota.
3. Lista de perguntas congela na entrada do 1º jogador; cada jogador tem ordem própria.
4. Rodada encerrada não reabre. 5. Resposta repetida → 409.
6. Nome único por rodada (admin pode "liberar"). 7. Regional e Outro jogam mas não entram
   no pódio. 8. Tudo por cliente (tenant).

Contrato completo da API (do sistema antigo, referência): `docs/contrato-api.md`.

## 9. Instância "Foco" (consultores) e logo por bloco (2026-11-26)

- Cliente `foco`: admin único dos consultores (`admin.html?c=foco`). Cada consultor cria um
  **bloco de perguntas** por cliente final (aba Perguntas → "+ Novo bloco de perguntas") e,
  ao criar, pode anexar a **logo do cliente** (PNG/JPG/WebP, reduzida a 600 px no navegador).
  A logo é editável (anexar/trocar/remover) e aparece no jogo e no telão das rodadas daquele
  bloco, junto da logo da Metta. Dados: tabela `bloco_config(tenant_id, nome, logo_url)` e
  bucket público `logos` (Storage); rota `bloco-salvar` da função `api`.
- Tempo: cada pergunta tem o próprio tempo (obrigatório, padrão 30 s); a rodada não escolhe tempo.
- Rodada criada pelo gerente pede o nome da rodada.
- Resposta mais rápida: a próxima pergunta é carregada durante o feedback
  (`GET /jogador?previa=1`, não inicia o relógio) e o ranking ao vivo sai em segundo plano.
- Todos os consultores usam a mesma senha de admin; qualquer um edita qualquer bloco.


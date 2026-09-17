# DDRESS — venda e aluguer de vestidos

Loja online da **DDRESS** (Luanda): peças para **comprar** e para **alugar**, secções **Mulher**,
**Homem** e **Criança**, **prova no ateliê** marcada peça a peça e **painel de gestão** por perfis.

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL
(Supabase em produção, PGlite embutido na demonstração) · Vitest + Testing Library · Playwright.

Em produção: **https://ddress.vercel.app**

---

## Estado do projecto

| Fase | Âmbito (SOW v2.1) | Estado |
|---|---|---|
| **1 — Frontend** | Identidade visual, loja, área do cliente, painel dos cinco perfis internos, fluxos de reserva, prova, pagamento, entrega, recolha e higienização com dados simulados, testes de interface | **Concluída — aguarda aprovação da DDRESS** |
| **2 — Backend, dados, E2E e deployment** | Supabase, autenticação e RBAC em produção, integrações (e-mail, WhatsApp, Telegram), CEGID, relatórios PDF, conteúdos, notificações | Por iniciar — ver [O que falta para a Fase 2](#o-que-falta-para-a-fase-2) |

Desvio assumido face ao SOW na Fase 1: em vez de simular APIs com MSW, o site corre sobre um
PostgreSQL **embutido** (PGlite) com dados de demonstração. É o mesmo código, as mesmas
consultas e as mesmas migrações da produção — a Fase 2 só troca a ligação.

---

## 1. Pôr a funcionar no computador

Precisa só de **Node.js 20+**. Não é preciso instalar base de dados.

```bash
npm install
npm run dev
```

Abra **http://localhost:3000**. No primeiro arranque o site cria a base embutida em
`.dados/pglite` e carrega a demonstração: 16 peças, 6 meses de pedidos fechados, pedidos em
curso e provas marcadas. Todos os clientes são fictícios.

Para recomeçar do zero: pare o servidor, apague a pasta `.dados` e arranque de novo
(ou `npm run db:reset`). Se a base ficar danificada — por exemplo, servidor terminado à
força — o arranque põe-na de parte e cria outra automaticamente.

### Contas de demonstração (só na base embutida)

| Perfil | E-mail | Palavra-passe | Onde entra |
|---|---|---|---|
| Administrador | `admin@ddress.ao` | `admin123` | Tudo |
| Funcionário | `domingos@ddress.ao` | `funcionario123` | Pedidos, provas, alugueres, entregas, peças, clientes |
| Funcionária | `ana@ddress.ao` | `funcionario123` | Igual ao funcionário |
| Suporte técnico | `suporte@ddress.ao` | `suporte123` | Resumo, pedidos, auditoria e definições |
| Contabilista | `contabilidade@ddress.ao` | `conta123` | Resumo e relatórios, com exportação |
| Motorista | `motorista@ddress.ao` | `motorista123` | Só entregas e recolhas |
| Cliente | `cliente@exemplo.ao` | `cliente123` | Loja e conta de cliente |

Numa base de dados real estas contas **não** ficam com estas palavras-passe (ver secção 5).

---

## 2. Regras do negócio que o código aplica

### Aluguer — disponibilidade (`src/lib/availability.ts`)

- **Peça sem reserva → disponível.**
- **Peça com reserva → sai do catálogo**; não se aceita outra reserva por cima.
- Volta a estar disponível **no dia seguinte ao fim da última reserva activa**, mais os dias de
  higienização definidos na peça.
- Com vários exemplares (`rentalStock > 1`) a regra aplica-se por exemplar.
- Duas reservas em simultâneo nunca ficam com o mesmo exemplar no mesmo período.

### Preço

Calculado **sempre no servidor**: dias × preço diário. Nas peças com **pacote de
fim-de-semana** (campo "Preço fim-de-semana" em *Painel → Peças*), um aluguer que começa à
sexta-feira e dura 2 a 4 dias paga o valor do pacote, sempre que for mais barato. A caução é
somada ao pagamento e devolvida no painel quando a peça volta em bom estado.

### Prova no ateliê

- **Reside em Luanda** → prova obrigatória, com hora marcada.
- **Reside fora de Luanda** → prova dispensada, com morada e declaração de responsabilidade.
- O calendário é **por peça**: só oferece dias em que o ateliê está aberto, com antecedência
  mínima, com cabine livre e com **aquela peça fisicamente no ateliê**.

### Expiração das reservas sem prova (`src/lib/expiracao.ts`)

Uma reserva de aluguer que exige prova **expira se não tiver prova marcada para, no mínimo,
24 horas antes do dia do levantamento**. O pedido é cancelado, a peça volta ao site e fica
registado na auditoria.

- As 24 horas mudam-se em *Painel → Definições*.
- Conta como prova uma marcação por confirmar, confirmada ou realizada até ao limite; faltas e
  cancelamentos não contam. Pedidos já confirmados pela loja e provas dispensadas não expiram.
- O cliente vê o limite no calendário e na página do pedido; o calendário só oferece horas
  dentro do limite; o painel mostra as *Reservas sem prova* com as horas que faltam.
- A expiração corre ao consultar a disponibilidade e numa tarefa diária
  (`/api/tarefas/expirar-reservas`, agendada em `vercel.json`).

### Devolução e higienização

O funcionário regista o dia real da devolução e o dia em que a peça volta ao site. Entre os
dois, a peça fica `EM_HIGIENIZACAO` e **fora do catálogo**; no dia indicado volta sozinha.

### Do pedido à entrega

```
NOVO → RECEBIDO → AGUARDA_PROVA → CONFIRMADO → PAGO → PRONTO → ENTREGUE   → CONCLUÍDO
                                                             ↘ EM_ALUGUER → DEVOLVIDO → CONCLUÍDO
```

### Perfis e permissões (RBAC)

Cada área do painel tem três níveis por perfil: **sem acesso**, **ver** ou **ver e alterar**.
O padrão está em `src/lib/permissoes.ts`; o administrador muda-o em **Painel → Permissões**
(guardado na tabela `role_permissions`, com registo na auditoria). A mesma matriz decide a
navegação, a entrada de cada página (formulários ficam só de leitura sem edição) e **cada
acção do servidor** (`exigirSeccao(área, "editar")`). Equipa e Permissões são sempre só do
administrador.

### Colecções, Quem somos e parceiros

- **Colecções** (`/colecoes/[slug]`): vídeo de abertura, fotografias e as peças, filtráveis
  por aluguer ou compra. Criadas e ordenadas em *Painel → Colecções*.
- **Quem somos** (`/quem-somos`): texto, destaques (+3000 mulheres, +300 peças, recolha
  gratuita, telefone), vídeo e galeria — tudo em *Painel → Conteúdos*.
- **Maquilhagem e sapatos** (`/maquilhagem`): a cliente pede maquilhagem à parceira
  (Val Makeup Antoluv) ou sapatos — escolhe modelos pela procura ou pede sugestão. Pode também
  acrescentá-los no checkout. A loja trata em *Painel → Solicitações*: estados, nota interna,
  sapatos sugeridos e ligações de WhatsApp para a cliente e a parceira.
- **Sapatos sugeridos** por peça: *Painel → Peças → (peça)*; aparecem em “Complete o look”.

### Página inicial e conteúdos no painel

O vídeo de fundo e os slides da página inicial vivem em *Painel → Conteúdos →
Página inicial*; a página Quem somos em *Painel → Conteúdos*. Enquanto não
houver slides guardados, o site usa os textos instalados em
`src/conteudo/slides-inicio.ts`.

### Ficheiros e facturas

O painel carrega fotografias, vídeos e PDF (limites: 8 MB imagem, 60 MB vídeo,
12 MB documento). Com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` definidos,
os ficheiros vão para o Supabase Storage (bucket `ddress`, público); no
computador ficam em `public/carregados`. A factura do CEGID anexa-se ao
pedido em *Painel → Pedidos → (pedido) → Documentos* e a cliente vê-a na
página do pedido dela. O relatório mensal tem versão em folha A4:
*Painel → Relatórios → Imprimir / PDF*.

### Contas

“Esqueci-me” envia uma ligação que serve uma vez e expira numa hora. Oito
tentativas erradas no mesmo e-mail travam a entrada durante 15 minutos
(o dobro por endereço). Tudo fica em *Painel → Auditoria → Entradas nas contas*.

### Notificações

Um pedido novo, cada mudança de estado relevante e cada solicitação criam avisos:
no site (área da cliente e *Painel → Notificações*, com contador), por e-mail para a
cliente, a loja (e-mail das Definições) e a parceira, e no Telegram da equipa quando
`TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` existirem. Os avisos têm chave única, por isso
nunca saem repetidos. Sem SMTP/Resend configurado, ficam “por configurar” e podem ser
reenviados — ver `.env.example`.

---

## 3. Identidade visual

Detalhe completo em [`docs/DESIGN.md`](docs/DESIGN.md).

- **Cor**: tirada do logótipo — ouro sobre tecido preto, marfim nas zonas de leitura.
  Tokens em `src/app/globals.css`; o painel usa os mesmos nomes com valores escuros
  (`.tema-escuro`).
- **Tipografia**: fonte da Apple (SF Pro, via `-apple-system`) na interface, com Inter como
  equivalente noutros sistemas; **Bodoni Moda** nos títulos. Fontes servidas pelo próprio site.
- **Página inicial**: vídeo da colecção em slides (`src/conteudo/slides-inicio.ts`). No
  telemóvel ocupa o ecrã; no computador fica num painel vertical com fundo desfocado. Quem
  tem movimento reduzido ou poupança de dados vê a imagem parada.
- **Painel**: modo escuro inspirado no modelo de referência — barra lateral, indicadores,
  gráfico de faturação, acções rápidas, pedidos com progresso.

### Trocar o vídeo ou as fotografias

- Vídeo: `public/video/` — ver [`public/video/LEIA-ME.md`](public/video/LEIA-ME.md).
- Peças: as imagens actuais são desenhos provisórios em `public/img/`. Coloque as fotografias
  (900 × 1200 px) e indique o caminho em *Painel → Peças*. O carregamento pelo painel é da Fase 2.

---

## 4. Testes

```bash
npm test          # Vitest: disponibilidade, preços, calendário, expiração, permissões, componentes (53 testes)
npm run e2e:contas     # contas, telemóvel e mapa
npm run e2e:ficheiros  # carregamentos, facturas e relatório
npm run e2e       # percursos num navegador real contra http://localhost:3100
npm run capturas  # capturas a 390/768/1360 px com verificação de transbordo
```

Os percursos e as capturas precisam do site a correr (`npx next dev -p 3100`) e usam o
Chromium do Playwright, ou o Edge/Chrome instalados. Última execução: perfis 13/13,
cliente 10/10, painel 15/15, conteúdos 19/19, contas 11/11, ficheiros 6/6.

---

## 5. Publicar (Vercel + Supabase)

O projecto já está ligado à Vercel: cada `git push` para `main` publica.
O script `vercel-build` corre `src/db/implantar.ts` antes de `next build`.

**Sem base de dados configurada**, a Vercel usa a base embutida de demonstração (recriada a
cada arranque a frio; pedidos criados podem desaparecer). Serve para aprovar a Fase 1.

**Para ligar o Supabase** (projecto DDRESS):

1. Vercel → projecto *ddress* → **Storage / Integrations** → ligar o **Supabase** e escolher o
   projecto **DDRESS**. A integração cria `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` e
   `SUPABASE_JWT_SECRET`. (Alternativa: definir `DATABASE_URL` e `DATABASE_URL_DIRECT` à mão —
   ver `.env.example`.)
2. Vercel → *Settings → Environment Variables* → `DDRESS_SENHA_ADMIN` com a palavra-passe da
   conta de administrador (mínimo 10 caracteres). Opcional: `AUTH_SECRET` e `CRON_SECRET`.
3. **Redeploy**. A implantação aplica as migrações, carrega a demonstração se a base estiver
   vazia — com as contas de demonstração **sem acesso** — e cria o administrador
   **atendimentoddress@gmail.com** com a palavra-passe definida.
4. Confirme em **/api/saude**: `modo` deve dizer `postgresql` e `base.responde` `true`.
   O endpoint só indica que variáveis existem; nunca mostra valores.
5. E-mails: defina `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (palavra-passe de aplicação do Gmail
   atendimentoddress@gmail.com) ou `RESEND_API_KEY`.
6. Ficheiros: em Supabase → **Storage**, criar o bucket **ddress** (público) e definir na
   Vercel `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
7. Opcional: `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` para a equipa receber os pedidos no
   Telegram; `NEXT_PUBLIC_SITE_URL` com o endereço final.

**/api/saude** passa a mostrar também, em `servicos`, se o e-mail, os ficheiros e o Telegram
estão configurados.

Nenhum segredo entra no repositório — o repositório é **público**.

---

## O que falta para a Fase 2

- Supabase ligado na Vercel (secção 5) e, antes de abrir ao público, limpeza dos dados de
  demonstração.
- Importar os vestidos reais do catálogo de WhatsApp (as colecções Gala, Noite e Cerimónia são
  provisórias).
- Restantes conteúdos no painel: menus, FAQ e campanhas (página inicial, colecções, Quem
  somos, parceiros e documentos já se gerem no painel).
- Storage ligado na Vercel (o carregamento já está feito; falta o bucket e as chaves).
- Factura CEGID: anexação manual já feita; integração automática depende da API e licença.
- Credenciais de e-mail na Vercel (o envio já está feito); WhatsApp Business API e Telegram;
  newsletter com consentimento e avisos de disponibilidade.
- Relatórios: CSV para Excel e folha A4 para PDF já feitos; falta envio automático mensal.
- Auditoria de preços e stock ao nível do campo (recuperação de palavra-passe, limite de
  tentativas e auditoria de contas já feitos).
- Pagamento com cartão, se houver contrato com operador.

---

## 6. Onde está cada coisa

```
src/
  app/(loja)/          loja e área do cliente
  app/admin/           painel de gestão (acoes.ts = operação, acoes-conteudos.ts = colecções,
                       conteúdos, parceiros, solicitações, notificações, permissões)
  app/api/             disponibilidade, orçamento, pedidos, marcações, sessões, relatórios,
                       tarefas agendadas e /api/saude
  components/          interface da loja (HeroInicio, CartaoProduto, CalendarioProva…)
  components/admin/    PainelShell, GraficoArea e formulários do painel
  conteudo/            textos e vídeo da página inicial
  db/                  schema, ligação, migrações, semente, implantação
  lib/                 regras de negócio: armazenamento, contas, telegram, availability,
                       expiracao, reservas, pedidos,
                       marcacoes, permissoes, auth, conteudos, solicitacoes, notificacoes,
                       email, whatsapp, auditoria
drizzle/               migrações SQL versionadas
scripts/               testes de percurso e capturas
docs/DESIGN.md         sistema visual
```

# DDRESS — loja online com venda, aluguer e prova no ateliê

Loja de roupa para **Homem**, **Mulher** e **Criança**, com peças para **comprar** e peças
para **alugar**, marcação de **prova no ateliê** peça a peça, e um **painel de gestão** onde
o funcionário recebe o pedido e fecha a venda.

Feito com Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Drizzle ORM e PostgreSQL.

---

## 1. Pôr a funcionar no seu computador

Precisa de **Node.js 20 ou mais recente** e de uma base de dados **PostgreSQL**.

```bash
# 1. instalar as bibliotecas
npm install

# 2. criar o ficheiro de configuração
cp .env.example .env
#    abra o .env e preencha DATABASE_URL e AUTH_SECRET
#    para gerar um segredo:  openssl rand -base64 48

# 3. criar as tabelas na base de dados
npm run db:push

# 4. encher a loja com dados de demonstração (catálogo, contas, pedidos)
npm run db:seed

# 5. arrancar
npm run dev
```

Abra **http://localhost:3000**.

### Contas criadas pelo seed

| Quem | E-mail | Palavra-passe |
| --- | --- | --- |
| Administrador | `admin@ddress.ao` | `admin123` |
| Funcionário | `domingos@ddress.ao` | `funcionario123` |
| Funcionária | `ana@ddress.ao` | `funcionario123` |
| Cliente | `cliente@exemplo.ao` | `cliente123` |

> **Antes de ir para produção**: apague estas contas ou mude as palavras-passe em
> *Painel → Equipa*, e gere um `AUTH_SECRET` novo.

---

## 2. Como funciona o negócio (as regras que o código aplica)

### Venda

O cliente escolhe o tamanho, junta ao carrinho e finaliza. O stock baixa quando o pedido é
criado e volta a subir se o pedido for cancelado. A prova no ateliê é **opcional** nas peças
de venda.

### Aluguer — a regra da disponibilidade

Esta é a regra central da loja, e está implementada em `src/lib/availability.ts`:

- **Peça sem reserva → está disponível.**
- **Peça com reserva → sai do catálogo.** Não se aceita nova reserva por cima.
- **A peça volta a estar disponível no dia seguinte ao fim da última reserva ativa**, mais os
  dias de higienização definidos no produto.

Quando uma peça tem mais do que um exemplar (`rentalStock > 1`), a regra aplica-se por
exemplar: só desaparece do site quando **todos** estiverem reservados.

Reservas nos estados `CANCELADA` e `DEVOLVIDA` deixam de contar.

### Devolução e higienização — quem decide é o funcionário

Quando a peça volta, o funcionário regista no painel **duas datas**:

- **A peça voltou ao ateliê em** — o dia real da devolução, que pode não ser o combinado.
- **Disponível outra vez a partir de** — vem sugerida com os dias de higienização do produto,
  mas é editável: se a lavandaria atrasar ou aparecer um arranjo, empurra-se a data.

Entre esses dois momentos a reserva fica em `EM_HIGIENIZACAO` e a peça **continua fora do
site**, mesmo que o aluguer já tenha acabado no papel. No dia indicado, a peça volta sozinha
ao catálogo — não é preciso ninguém fazer nada. Se a higienização acabar mais cedo, o botão
*"Higienização concluída — libertar já"* devolve a peça ao site na hora.

Isto regista-se em dois sítios: na ficha do pedido (secção *Devolução e higienização*) e no
mapa em *Painel → Alugueres*, que serve também para as peças alugadas ao balcão. Fica tudo no
histórico do pedido, com data, notas e o nome de quem registou.

O preço é calculado **sempre no servidor** (`orcamentoAluguer`): dias × preço diário, ou o
pacote de fim-de-semana quando o período começa à sexta-feira e o pacote sai mais barato.
A caução é somada ao pagamento e devolvida no painel quando a peça volta em bom estado.

### Prova no ateliê — calendário por peça

O calendário é gerado **para cada peça** (`calendarioDeProva`). Um horário só é oferecido
quando:

1. o ateliê está aberto nesse dia da semana e não é feriado;
2. respeita a antecedência mínima e o horizonte de marcações;
3. **aquela peça está fisicamente no ateliê** nesse dia — ou seja, não está alugada;
4. ainda há cabine livre naquele horário;
5. aquela peça não está a ser provada por outro cliente à mesma hora.

Tudo isto se configura em *Painel → Definições*: dias abertos, horas, duração da prova,
número de cabines, antecedência mínima e feriados.

### Do pedido à entrega

```
NOVO → RECEBIDO → AGUARDA_PROVA → CONFIRMADO → PAGO → PRONTO → ENTREGUE  → CONCLUÍDO
                                                              ↘ EM_ALUGUER → DEVOLVIDO → CONCLUÍDO
```

O funcionário faz o pedido andar no painel. Cada passagem de estado ajusta a reserva da peça:
confirmar segura-a, entregar marca-a como fora, devolver liberta-a, cancelar desfaz tudo e
repõe o stock.

### Pagamentos

Quatro métodos, todos suportados:

- **Multicaixa Express** — o cliente paga para o número da loja e indica a referência.
- **Transferência bancária** — mostra os dados da conta; o cliente envia o comprovativo e o
  funcionário valida no painel.
- **Na entrega ou no ateliê** — paga quando levanta.
- **Cartão Visa/Mastercard** — a opção só aparece no checkout quando existe `STRIPE_SECRET_KEY`
  no `.env`. A ligação ao Stripe ainda tem de ser feita (ver secção 6).

---

## 3. O painel de gestão

Em **/admin**, para quem tenha conta de funcionário ou administrador.

| Secção | Para quê |
| --- | --- |
| **Resumo** | O que precisa de atenção hoje: pedidos por receber, provas do dia, devoluções previstas e em atraso. |
| **Pedidos** | Receber o pedido, confirmar pagamentos, fazer o pedido andar, devolver a caução, deixar notas internas. Cada pedido tem histórico de tudo o que aconteceu e quem fez. |
| **Provas** | Agenda do ateliê, duas semanas de cada vez. Confirmar, marcar como realizada, registar faltas e escrever as medidas depois da prova. |
| **Alugueres** | Todas as reservas ativas, com a data de devolução, a data em que cada peça volta ao site e o estado da higienização. Permite registar devoluções, ajustar as datas de higienização, bloquear uma peça à mão (aluguer ao balcão, arranjos) e libertar peças. |
| **Peças** | Catálogo: criar e editar peças, preços de venda e de aluguer, caução, stock por tamanho. |
| **Clientes** | Quem comprou, quanto gastou, quantas provas fez — com conta ou sem conta. |
| **Equipa** | *(só administrador)* contas de acesso ao painel. |
| **Definições** | *(só administrador)* dados da loja, contas de pagamento e horários do ateliê. |

---

## 4. Trocar as fotografias das peças

As imagens do catálogo são desenhos temporários, em `public/img/*.svg`. Para pôr as
fotografias reais:

1. Coloque as fotos em `public/img/` (recomendado: 900 × 1200 px, JPG ou WebP).
2. Em *Painel → Peças*, abra a peça e escreva o caminho no campo **Imagem**, por exemplo
   `/img/vestido-bordeaux.jpg`.

Também pode apontar para um endereço completo de um serviço de imagens.

---

## 5. Publicar na internet

A forma mais simples é **Vercel** (aplicação) + **Neon** ou **Supabase** (base de dados), com
plano gratuito suficiente para começar.

1. Crie a base de dados no Neon/Supabase e copie a *connection string*.
2. Envie este projecto para um repositório Git.
3. Na Vercel, importe o repositório e defina as variáveis de ambiente:
   `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`.
4. Na primeira vez, corra as migrações contra a base de dados de produção:

```bash
DATABASE_URL="a-sua-ligacao" npm run db:push
DATABASE_URL="a-sua-ligacao" npm run db:seed     # opcional: só se quiser os dados de exemplo
```

Depois disto, cada `git push` publica a versão nova.

---

## 6. O que fica por ligar

Estas peças ficaram preparadas no código, mas precisam de contas externas para funcionar:

- **Pagamento com cartão (Stripe).** O checkout já esconde a opção quando não há chave. Falta
  criar a sessão de pagamento e o *webhook* de confirmação.
- **Avisos por WhatsApp ou SMS.** Hoje o cliente vê o estado na página do pedido e o
  funcionário liga-lhe. Para avisos automáticos é preciso uma conta de API (por exemplo Twilio
  ou a API do WhatsApp Business).
- **Envio de e-mails** (confirmação de pedido e lembrete de prova). Precisa de um serviço de
  envio, como Resend ou Brevo.
- **Carregamento de fotografias pelo painel.** Neste momento indica-se o caminho da imagem;
  falta o botão para enviar o ficheiro directamente.

---

## 7. Testes

```bash
npm test                        # regras de disponibilidade, higienização, preços e calendário (25 testes)
node scripts/e2e-cliente.mjs    # percurso do cliente: escolher, marcar prova, fazer pedido
node scripts/e2e-painel.mjs     # percurso do funcionário no painel
```

Os dois últimos abrem um navegador a sério contra o site em `http://localhost:3100`
(arranque-o com `npx next dev -p 3100`) e deixam as imagens do percurso em `/tmp/wil-e2e`.

---

## 8. Onde está cada coisa

```
src/
  app/
    (loja)/            páginas do cliente: início, colecção, peça, carrinho,
                       checkout, pedido, marcação, conta
    admin/             painel de gestão  (acoes.ts = tudo o que o funcionário faz)
    api/               endpoints: disponibilidade, orçamento, pedidos, marcações, sessões
  components/          interface (carrinho, calendário de prova, formulários)
  db/
    schema.ts          modelo de dados completo, comentado
    seed.ts            catálogo e dados de demonstração
  lib/
    availability.ts    REGRAS DE NEGÓCIO: disponibilidade, preços, calendário
    pedidos.ts         criação do pedido (recalcula tudo no servidor)
    marcacoes.ts       agenda do ateliê
    auth.ts            sessões e permissões
scripts/               geração das imagens e testes de percurso
```

Comece por `src/lib/availability.ts` — é aí que vive a regra do aluguer.

---

## 9. Segurança — o que já está feito

- Palavras-passe guardadas com bcrypt; sessões em *cookie* `httpOnly` assinado (JWT).
- O painel valida a sessão no servidor em **cada** acção — nunca confia no navegador.
- Preços, disponibilidade e horários são **sempre recalculados no servidor** ao criar o
  pedido: alterar valores no navegador não muda nada.
- O painel e as rotas internas ficam fora dos motores de busca (`robots.ts`).

Antes de abrir ao público: gere um `AUTH_SECRET` novo, mude as palavras-passe de demonstração
e sirva o site por HTTPS (a Vercel faz isso automaticamente).

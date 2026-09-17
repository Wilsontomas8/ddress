# CLAUDE.md — DDRESS

Instruções permanentes para trabalhar neste repositório.

## Projecto

Loja online da **DDRESS — Venda e Aluguer de Vestidos** (Luanda). Fornecedor: WIL IT Soluções.
Âmbito: SOW v2.1 em duas fases. **Fase 1 (frontend) concluída**, a aguardar aprovação;
**Fase 2** (Supabase, integrações, CEGID, PDF, notificações) por iniciar. Ver `README.md`.

**Modelo de execução:** Wilson Tomás decide e valida; Claude implementa. Decisões de negócio,
preços e conteúdo institucional são da DDRESS — se não estão no código ou no README, perguntar.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estrito · Tailwind CSS 4 (tokens em
`src/app/globals.css`) · Drizzle ORM · PostgreSQL (Supabase em produção; PGlite embutido sem
`DATABASE_URL`/`POSTGRES_URL`) · Zod · Lucide · Vitest + Testing Library · Playwright ·
Vercel. Gestor de pacotes: **npm**. Idioma da interface: **português de Angola**.

## Comandos

```bash
npm run dev            # sem base de dados: usa .dados/pglite com demonstração
npx tsc --noEmit       # tipos
npm test               # Vitest
npx next dev -p 3100   # depois: npm run e2e  e  npm run capturas
npm run db:generate    # nova migração depois de mudar src/db/schema.ts
```

Não correr `next build` com o servidor de desenvolvimento ligado na mesma pasta: partilham
`.next` e o servidor fica com erros até ser reiniciado.

## Regras não negociáveis

1. **O repositório é público.** Nenhum segredo, connection string ou palavra-passe real entra
   em ficheiros, comentários ou commits. Configuração de produção faz-se na Vercel.
2. **Regras de negócio vivem num só sítio** e o servidor recalcula sempre:
   disponibilidade e preço em `src/lib/availability.ts`, expiração em `src/lib/expiracao.ts`,
   permissões em `src/lib/permissoes.ts`.
3. **RBAC validado no servidor** em cada página e acção; esconder um botão não é controlo.
4. **Mudança de schema = migração** (`npm run db:generate`), nunca `db:push` em produção.
5. **Dados de demonstração só fictícios.** Numa base real a semente corre em modo `publica`
   (contas de demonstração sem acesso).
6. **Nada dado como concluído sem prova**: `tsc`, `npm test` e, em mudanças de interface ou
   fluxo, `npm run e2e` e `npm run capturas`.

## Interface

- Cores só por tokens (`marfim-*`, `tinta-*`, `ouro-*`, `superficie`, `preto`) e estados por
  `selo tom-*`. Nunca a paleta padrão do Tailwind. Detalhe em `docs/DESIGN.md`.
- Títulos em Bodoni Moda (`font-display`); interface em SF Pro/Inter (`font-sans`).
- O painel é escuro por `.tema-escuro` (mesmos tokens, outros valores).
- Acessibilidade: foco visível, `prefers-reduced-motion`, rótulos em todos os campos,
  alvos ≥44px no telemóvel, nada só pela cor.
- Kwanzas inteiros, formatados com `formatKz`; datas civis em UTC, mostradas em hora de Luanda.

## Git

Um commit por passo, mensagem em português no imperativo (`Acrescenta…`, `Corrige…`), com
corpo a explicar o porquê. `main` publica na Vercel a cada push.

## Contactos da loja

E-mail: `atendimentoddress@gmail.com` · Instagram: `@ddress_aluguer_de_vestidos`.
Telefone, IBAN e Multicaixa na semente são **de exemplo** até a DDRESS indicar os reais.

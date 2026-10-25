# Wind Ops

Base de um webapp local-first para registrar problemas em elevadores de torres eólicas. **Esta entrega não implementa login, issues, persistência offline ou push.** Integrações estão preparadas, com rotas de sincronização bloqueadas até existir autorização.

## Desenvolvimento no WSL

Requisitos: Node da `.node-version`, pnpm 10.34.8 e Docker Engine com Compose v2. O projeto fica em `/home/leodevanda/proj-pessoais/windops`.

```bash
corepack enable
corepack prepare pnpm@10.34.8 --activate
pnpm install --frozen-lockfile
cp .env.example .env
pnpm infra:up
pnpm db:migrate
pnpm --filter @windops/contracts build
pnpm dev
```

Frontend: http://localhost:5173. API: http://localhost:3000/api/health/live.
Documentação local: http://localhost:3000/api/docs. Mailpit: http://localhost:8025.

A prontidão em `/api/health/ready` exige PostgreSQL e Electric saudáveis. A API pode iniciar com as dependências indisponíveis, mas não fica pronta. A rota `/api/sync/:collection` responde 503 intencionalmente.

```bash
pnpm check
pnpm db:generate
pnpm db:migrate
pnpm test:integration
pnpm infra:down
```

`infra:down` preserva volumes. Não execute remoção de volumes sobre dados necessários. A migração inicial cria apenas a fundação de workspaces e limita a instalação a um registro; não cria usuários nem credenciais padrão.

## Organização

- `apps/web`: React/Vite, Router, Tailwind, configuração ShadcnUI e botão base.
- `apps/api`: monólito Fastify, módulos, adaptadores e Drizzle.
- `packages/contracts`: schemas Zod e tipos públicos.
- `infra`: Compose, Dockerfiles, Caddy e modelo de ambiente.
- `.agent/architeture.md`: arquitetura e operação.
- `.agent/memory.md`: decisões completas e situação real.
- `.agent/tasks/README.md`: convenções e índice das tasks executáveis, com checkboxes e evidências.
- `.agent/tasks/roadmap`: as 11 etapas originais do produto, mantidas como visão geral.
- `.agent/tasks/01-fundacao`: primeira slice executável; modelagem, banco seguro, autenticação, autorização e interfaces iniciais.

A próxima task é [F01 — Modelagem do banco](.agent/tasks/01-fundacao/01-modelagem-banco.md). As tasks seguintes detalham dependências, implementação e testes; criar seus planos não significa que as funcionalidades estejam prontas.

## Referências visuais — Pencil/pen.dev

O proprietário mantém os arquivos `.pen` de layouts mobile e design system em uma pasta local do Windows, fora deste repositório. Eles servem somente como guia de desenvolvimento e não serão copiados para o projeto nem commitados. O código implementado a partir deles é versionado normalmente; build, CI e execução não dependem dos arquivos de design. O visual atual é provisório.

Com o Pencil/pen.dev aberto no Windows, o Codex CLI no WSL2 consulta as referências pelo MCP do aplicativo Windows. Confirmar com o proprietário o documento a usar e conferir o arquivo ativo antes da leitura. A pasta definitiva é uma escolha local do proprietário. Não alterar os designs sem solicitação explícita nem inventar layouts finais quando a referência estiver indisponível.

## Entrega

CI valida código, migrações, Electric e imagens em runner Linux. Deploy automático após CI da main fica condicionado à variável `DEPLOY_ENABLED=true`. Consulte a arquitetura para preparar a VPS, credenciais e domínio antes de habilitar.

Validação feita nesta sessão e limitações estão registradas em `.agent/memory.md`. Nunca confunda um workflow escrito com execução bem-sucedida no GitHub.

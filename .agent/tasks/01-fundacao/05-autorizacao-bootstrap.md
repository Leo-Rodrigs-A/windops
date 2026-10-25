# F05 — Autorização por workspace e bootstrap

## Status e dependências

Concluída em 25/10/2026. Depende de [F03](03-schema-migracoes.md) e [F04](04-autenticacao.md); ambas concluídas.

- [x] Task concluída.

## Objetivo e escopo

Dar acesso à home somente a membros autorizados, fornecer contexto real para a interface e preparar o primeiro administrador de forma explícita. Não implementar criação pública de workspace, convites nem gestão completa de cargos/membros.

## Plano de implementação

- [x] Criar serviço público de autorização em `workspaces`, consumindo identidade já validada pelo serviço público de `identity`. Cada consulta protegida exige segunda etapa concluída e membership ativa no workspace.
- [x] Validar workspace e cargo no servidor; ignorar workspace/role enviados fora da rota prevista. A revogação vale na próxima requisição, sem depender da expiração do cookie ou de cache frontend.
- [x] Implementar `GET /api/me` com identidade mínima e memberships ativas, sem dados de autenticação internos. Conta órfã recebe lista vazia. Contratos compartilhados/OpenAPI e erros 401/403 definidos.
- [x] Implementar `GET /api/workspaces/:workspaceId/context` com nome do workspace e cargo, usando o guard comum. Não retorna usuários, issues fictícias ou dados de outros tenants.
- [x] Testar matriz de acesso: visitante/desafio pendente sem contexto; órfão somente com identidade; Técnico/Administrador no próprio workspace. `authorizeWorkspace` aceita lista de cargos para operações futuras; não cria endpoints administrativos vazios.
- [x] Fornecer `apps/api/scripts/bootstrap-workspace.sql`: transação advisory-locked exige UUID explícito de usuário existente/verificado e workspace; cria somente o workspace piloto, é no-op ao repetir e aborta conflitos sem promoção silenciosa.
- [x] Documentar o procedimento operacional para conferir conta/IDs, executar bootstrap com credencial administrativa separada e confirmar o resultado. Bootstrap não roda no startup nem seleciona o primeiro cadastro; nenhum segredo ou senha padrão em seeds.
- [x] Criar fixtures isoladas de admin, técnico, usuário de outro workspace, órfão, usuário não verificado e sessão pendente. A integração remove o índice singleton somente no banco descartável de teste; schema normal permanece restrito.

### Procedimento administrativo de bootstrap

1. Crie e verifique a conta pelo fluxo normal de autenticação; consulte seu UUID explicitamente: `SELECT id, email, email_verified FROM public.auth_users WHERE email = '<email normalizado>';`. Confirme `email_verified = true` e copie o UUID exibido. Não escolha uma conta por ordem de cadastro.
2. Gere previamente um UUID para o workspace e escolha o nome definitivo. Revise usuário, workspace e banco alvo antes de executar.
3. Em desenvolvimento, execute o SQL com o papel administrativo local, nunca com `windops_app`:

   ```sh
   docker compose -f infra/compose.dev.yml exec -T postgres \
     psql -X -v ON_ERROR_STOP=1 \
       -v workspace_id='<uuid-do-workspace>' \
       -v workspace_name='Wind Ops' \
       -v user_id='<uuid-do-usuario-verificado>' \
       -U windops -d windops -f - \
       < apps/api/scripts/bootstrap-workspace.sql
   ```

   Em produção, use `psql` contra uma conexão administrativa obtida por canal operacional seguro e passe os mesmos parâmetros com `-f apps/api/scripts/bootstrap-workspace.sql`. Não salve essa credencial no ambiente de runtime nem em logs.

4. Confirme o resultado pelos UUIDs: `SELECT w.id, w.name, m.user_id, m.role, m.revoked_at FROM public.workspaces w JOIN public.workspace_members m ON m.workspace_id = w.id WHERE w.id = '<uuid-do-workspace>';`. Deve existir um vínculo ativo `admin` para o UUID selecionado.
5. Repetir os mesmos parâmetros não altera dados. Usuário ausente/não verificado, workspace diferente ou vínculo conflitante abortam a transação; investigue e corrija explicitamente, sem trocar o usuário automaticamente.

## Testes e aceite

- [x] API rejeita visitante, sessão pré-código, workspace forjado e membership revogada; guards são exercitados no servidor.
- [x] Técnico/admin acessam o próprio contexto; usuário de A não lê B; órfão não recebe contexto.
- [x] `GET /api/me` expõe só identidade mínima e memberships ativas; imports respeitam os `index.ts` públicos.
- [x] Bootstrap repetido é no-op; não promove técnico; falha para usuário ausente/não verificado e workspace conflitante.
- [x] `pnpm check` final e integração PostgreSQL/Electric passam; endpoints constam no OpenAPI sem CRUD de domínio.

## Evidências

Concluída em 25/10/2026. `pnpm check`, `pnpm test:workspaces-integration` e `pnpm test:integration` passaram. A integração usa PostgreSQL descartável e cobre guards, duas memberships/tenants, órfão, sessão pendente, revogação imediata, bootstrap idempotente e falhas de pré-condição. Fixtures usam usuários sintéticos; nenhum usuário real foi promovido. O procedimento operacional está documentado acima; bootstrap real ainda requer execução administrativa explícita.

- [x] Task concluída.

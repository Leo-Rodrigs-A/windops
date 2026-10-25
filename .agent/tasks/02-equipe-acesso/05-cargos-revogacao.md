# E05 — Promoção e revogação de membros

## Status e dependências

Concluída em 25/10/2026. Depende de E02 e E04, concluídas.

- [x] Task concluída.

## Objetivo e escopo

Permitir que admin promova técnico e revogue membership técnica sem excluir identidade, dados históricos ou acesso do usuário a outro workspace.

## Plano de implementação

- [x] Implementar comandos pelo serviço público de workspaces, validando sessão completa e cargo admin no servidor.
- [x] Promover técnico ativo do mesmo workspace; promoção repetida do mesmo alvo já admin retorna estado atual sem incremento adicional.
- [x] Revogar membership por `revoked_at`, preservando a linha para referências históricas. Não apagar conta, sessões globais ou registros de outros tenants.
- [x] Rejeitar remoção de admin e auto-revogação. A rota de cargo aceita somente promoção a admin; rebaixamento, exclusão global e sucessão ficam fora desta slice.
- [x] Adicionar `revision` à membership. Cada mudança de cargo, revogação e reativação incrementa o valor; comandos exigem a revisão que o admin observou. Locks são workspace → membership do ator admin → membership alvo.
- [x] Invalidar convites não terminais para o e-mail do membro revogado dentro da mesma transação. Aceite posterior usa o lock de workspace e só reintegra com convite emitido depois da revogação.
- [x] Confirmar perda de acesso na próxima requisição e manter sessões/identidade globais; limpeza de cache offline permanece para a slice offline.
- [x] Retry de remoção aceita o resultado já revogado somente quando a revisão atual é exatamente a produzida pelo comando original. Se convite posterior reativou a membership, a revisão muda e retry antigo recebe conflito.
- [x] Documentar rotas, payload `expectedRevision`, respostas e erros 403/404/409 no OpenAPI.

## Validação e aceite

- [x] Admin promove/remove técnico no workspace; técnico recebe 403 e membership de outro workspace recebe 404.
- [x] Outro admin e o próprio ator não podem ser removidos; nenhuma regra depende do singleton para autorização.
- [x] Corridas promoção/remoção e aceite/remoção serializam pelo workspace; retry após reintegração não altera o estado mais novo.
- [x] Conta removida permanece autenticável e `/api/me` não lista o workspace; histórico/membership permanece no banco.
- [x] Convite antigo é invalidado; convite novo pode reintegrar e incrementa revisão.
- [x] Integração PostgreSQL descartável, 16 testes Vitest, Biome, boundary check, TypeScript e builds passam. `pnpm check` não pôde ser invocado porque o shim local do pnpm aponta para um alvo temporário removido; os comandos equivalentes de cada etapa foram executados diretamente.
- [x] Migração aplicada ao banco dev persistente e permissões verificadas.

## Evidências

Implementadas as rotas `PATCH /api/workspaces/:workspaceId/members/:membershipId/role` e `POST /api/workspaces/:workspaceId/members/:membershipId/revoke`, com autorização tenant no serviço público de `workspaces`, transações e respostas OpenAPI estruturadas. `workspace_members.revision` é monotônica; alteração exige `expectedRevision`, retry de remoção só repete o resultado quando não houve transição posterior. Revogação marca `revoked_at`, incrementa revisão e invalida convites pendentes para o endereço do membro atomicamente. A identidade e sessões permanecem intactas. Nenhum admin ou o próprio ator pode ser removido.

Validação: suíte `test:workspaces-integration` passou em PostgreSQL/Mailpit descartáveis com isolamento, promoção, promoção repetida sem efeitos, bloqueio de admin/auto-revogação, técnico e membership estrangeira, corrida promoção/revogação, invalidação de convite, próxima requisição negada, reintegração por convite novo e retry antigo conflitante. Migração `0003_workspace_member_revision` aplicada ao dev persistente; `db:permissions` passou. 16 testes Vitest, Biome, limites de módulos, TypeScript de contracts/API/web e builds passaram. A chamada literal `pnpm check` ficou indisponível nesta sessão porque o executável pnpm local aponta para arquivo temporário removido; executados diretamente lint, typecheck, testes e builds equivalentes. Frontend de equipe e limpeza de cache offline não fazem parte da E05; seguem para E06 e slice offline. Nenhuma alteração foi aplicada a convites/usuários reais.

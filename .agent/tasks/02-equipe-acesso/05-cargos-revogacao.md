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
- [x] Proteger outro admin e o último administrador. Permitir auto rebaixamento para Técnico ou saída quando restar outro admin ativo.
- [x] Adicionar `revision` à membership. Cada mudança de cargo, revogação e reativação incrementa o valor; comandos exigem a revisão que o admin observou. Locks são workspace → membership do ator admin → membership alvo.
- [x] Invalidar convites não terminais para o e-mail do membro revogado dentro da mesma transação. Aceite posterior usa o lock de workspace e só reintegra com convite emitido depois da revogação.
- [x] Confirmar perda de acesso na próxima requisição e manter sessões/identidade globais; limpeza de cache offline permanece para a slice offline.
- [x] Retry de remoção aceita o resultado já revogado somente quando a revisão atual é exatamente a produzida pelo comando original. Se convite posterior reativou a membership, a revisão muda e retry antigo recebe conflito.
- [x] Documentar rotas, payload `expectedRevision`, respostas e erros 403/404/409 no OpenAPI.

## Validação e aceite

- [x] Admin promove/remove técnico no workspace; técnico recebe 403 e membership de outro workspace recebe 404.
- [x] O próprio admin pode se rebaixar ou sair se outro admin ativo permanecer; o último admin recebe conflito e deve promover um técnico antes.
- [x] Corridas promoção/remoção e aceite/remoção serializam pelo workspace; retry após reintegração não altera o estado mais novo.
- [x] Conta removida permanece autenticável e `/api/me` não lista o workspace; histórico/membership permanece no banco.
- [x] Convite antigo é invalidado; convite novo pode reintegrar e incrementa revisão.
- [x] Integração PostgreSQL descartável, 16 testes Vitest, Biome, boundary check, TypeScript e builds passam. `pnpm check` não pôde ser invocado porque o shim local do pnpm aponta para um alvo temporário removido; os comandos equivalentes de cada etapa foram executados diretamente.
- [x] Migração aplicada ao banco dev persistente e permissões verificadas.

## Evidências

As rotas `PATCH /api/workspaces/:workspaceId/members/:membershipId/role` e `POST /api/workspaces/:workspaceId/members/:membershipId/revoke` usam autorização tenant, transações e `expectedRevision`. Um admin só altera o próprio cargo para Técnico; outro admin não pode rebaixá-lo nem removê-lo. Auto rebaixamento/saída verifica sob lock do workspace se há outro admin ativo, serializando alterações concorrentes e protegendo o último. Revogação incrementa revisão e invalida convites pendentes do endereço na transação; identidade e sessões globais são preservadas.

Validação em 25/10 passou em banco descartável: admin se rebaixa quando outro admin permanece, o segundo admin pode promovê-lo novamente, saída própria revoga o acesso na requisição seguinte e o admin restante não consegue sair nem se rebaixar. Os mesmos bloqueios de último admin foram exercitados antes de haver sucessor. A regra não exige migração; nenhum dado dev real foi alterado.

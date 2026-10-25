# F03 — Schema e migrações da fundação

## Status e dependências

- [x] Task concluída em 25/10/2026. Depende de [F01](01-modelagem-banco.md) e [F02](02-postgres-seguro.md).

- [x] Task concluída.

## Objetivo e escopo

Implementar o dicionário aprovado da fundação: tabelas de identidade e desafios necessárias ao provedor, workspaces e memberships. Não criar ainda parques, issues, convites ou tabelas de sincronização/notificações operacionais.

## Plano de implementação

- [x] Gerar o schema compatível com Better Auth 1.7.12 e configuração explícita em `identity`; revisar os nomes e campos emitidos. Drizzle/SQL versionado segue como via única, sem auto-DDL em startup.
- [x] Implementar em `workspaces` a membership N:N com cargo Administrador/Técnico e os campos, índices e constraints definidos em F01. Preservar a tabela existente e seu limite singleton; não converter cargo em atributo global do usuário.
- [x] Materializar somente o desafio adicional aprovado em F01, sem duplicar tabelas Better Auth. Campos e limites persistentes dão suporte às transações de consumo/reenvio que F04 implementará.
- [x] Manter ownership dos módulos sem imports privados. A FK cruzada `workspace_members.user_id → auth_users.id` foi adicionada em SQL revisado, fora do schema privado de `identity`.
- [x] Criar `0001_auth_core.sql` após `0000_workspace_foundation.sql`, sem alterar a migração aplicada; atualizar journal/snapshot e revisar SQL gerado, privilégios e índices.
- [x] Aplicar migrações com credencial dedicada e lock consultivo PostgreSQL na mesma conexão. Encerrar conexão em sucesso/falha; runtime permanece sem DDL automático.
- [x] Adaptar o teste de integração atual para validar singleton com ou sem workspace preexistente e rollback transacional. O teste descartável de upgrade remove o índice singleton somente nessa base e verifica múltiplas memberships/workspaces.
- [x] Documentar evolução/rollback: backup antes de mudanças destrutivas futuras e sem rollback automático; imagem/runtime validada.

## Testes e aceite

- [x] Aplicação em banco vazio e upgrade de `0000` com workspace existente; migração concorrente e reaplicação sem perda de dados.
- [x] Constraints rejeitam membership duplicada, cargo inválido, usuário/workspace inexistente, desafio duplicado/limites inválidos e identidade externa duplicada.
- [x] Testar UUIDs, FK de sessão/desafio/membership, timestamps de expiração e journal.
- [x] Executar migração pela imagem da API; runtime opera por DML após grants e replicação não lê tabelas privadas.
- [x] `pnpm check`, testes de migração/PostgreSQL/Electric aprovados; `.agent/database.md` distingue schema implementado de domínios planejados.

## Evidências

Concluída em 25/10/2026. Adicionados `identity/schema.ts`, `workspace_members`, a migração `0001_auth_core.sql`, mapeamento Better Auth 1.7.12 e serialização por advisory lock. Sem rotas de autenticação. `pnpm check` passou (lint, limites, types, 9 testes e builds); `drizzle-kit check` aprovou journal/snapshots. `pnpm db:empty-check` passou com instalação vazia, execuções concorrentes, upgrade de `0000` preservando workspace, fixture multi-tenant descartável, constraints, restart e grants. A imagem `windops-api:f03` foi construída e executou o migrador contra o banco local; o banco existente recebeu a migração aditiva e foi reprovisionado. Replicação não tem SELECT em auth/challenge/memberships. Não habilitados Better Auth routes, Neon ou OAuth real. Rollback de schema é operacional por backup/restauração, nunca automático.

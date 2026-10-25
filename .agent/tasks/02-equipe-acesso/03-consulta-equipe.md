# E03 — Consulta administrativa da equipe

## Status e dependências

Concluída em 25/10/2026. Depende de E02, concluída.

- [x] Task concluída.

## Objetivo e escopo

Permitir que admin consulte membros do próprio workspace e contas sem membership ativa em qualquer workspace. Consultar uma conta não concede acesso nem aceita convite por ela.

## Plano de implementação

- [x] Implementar consultas de membros/diretório em `workspaces`, autorizadas para admin com sessão completa e membership ativa verificada em cada requisição.
- [x] Usar os métodos públicos de `identity` para ler apenas ID, nome, e-mail e data de criação; não retornar sessão, senha, OAuth ou estado de verificação.
- [x] Listar somente memberships ativas no workspace solicitado; a próxima página usa cursor por UUID, limite 1–100 (padrão 25) e ordenação estável.
- [x] Listar contas verificadas sem membership ativa em qualquer workspace. Membership revogada isolada não impede reaparecer como órfão; membership ativa em outro workspace impede listagem.
- [x] Excluir contas ainda não verificadas do diretório. Isso não altera a condição de e-mail verificado exigida para aceite de convite.
- [x] Implementar busca por nome/e-mail com escape de curingas e paginação cursor; validar parâmetros e contratos sem campos adicionais.
- [x] Tratar lista vazia, cursor inválido, workspace forjado, usuário técnico, sessão sem segunda etapa, conta de outro workspace e membership revogada.
- [x] Documentar rotas no OpenAPI e atualizar serviços públicos de identity/workspaces.

## Validação e aceite

- [x] Admin consulta membros de A e órfãos; não vê usuários exclusivos de B, inclusive com busca por e-mail exato.
- [x] Técnico, visitante, sessão pré-código e admin revogado não acessam o diretório.
- [x] Conta com membership revogada em A, mas ativa em B, não aparece como órfã; conta só com vínculo revogado pode aparecer.
- [x] Paginação, busca e DTOs não contornam o filtro tenant nem retornam campos sensíveis.
- [x] Integração usa banco descartável com dois tenants; índice singleton é removido somente na fixture.
- [x] `pnpm check` e integração de workspaces passaram; evidências e índice atualizados.

## Evidências

Implementados `GET /api/workspaces/:workspaceId/members` e `GET /api/workspaces/:workspaceId/directory`, documentados no OpenAPI. Admin autorizado vê memberships ativas de seu workspace e contas verificadas sem membership ativa em qualquer workspace. Usuários ligados a outro workspace são excluídos antes de busca; emails não verificados não são mostrados. Respostas contêm somente campos de identidade e membership necessários.

`pnpm check` passou (lint/boundaries, typecheck, 16 testes e builds). `pnpm test:workspaces-integration` passou em PostgreSQL descartável com dois workspaces: incluiu páginas sem repetição, busca exata que não revela usuário de B, membership revogada com vínculo ativo em outro workspace, técnico, sessão pendente e admin revogado. Nenhuma migração foi aplicada ao banco dev persistente. A tela administrativa ainda não existe; implementação visual fica para E06.

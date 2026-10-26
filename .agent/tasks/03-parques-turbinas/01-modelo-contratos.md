# P01 — Modelo e contratos

## Status

Planejada

- [ ] Task concluída

## Objetivo

Definir o catálogo e seus contratos antes da persistência e dos endpoints.

## Estado atual

Slices 01 e 02 concluídas. O módulo parks contém somente um entrypoint vazio; não há catálogo implementado. Este plano não comprova execução das dependências.

## Dependências

Slices 01 e 02 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Contratos compartilhados e documentação do banco; sem migração aplicada, SQL em dev ou rotas de negócio nesta task.

## Plano de implementação

- [ ] Registrar em `.agent/database.md` o modelo de parks e turbines: UUID estável, workspace_id, code, created_at, updated_at e revision; park_id obrigatório na turbina. Definir representação de atividade para integração futura, sem habilitar desativação.
- [ ] Definir normalização e validação de códigos P01…PX/T01…TX, limites e equivalência de zeros à esquerda; registrar exemplos válidos/inválidos antes de gerar a migração. Não fixar quantidade de equipamentos em oito.
- [ ] Definir unicidade de parque por workspace e de turbina por parque, incluindo FK composta tenant. Manter park_id imutável na edição; transferência entre parques fica fora do escopo.
- [ ] Definir contratos Zod de leitura, criação e edição; expectedRevision obrigatório na edição, respostas mínimas e erros padronizados. Escolher paginação com ordenação estável e limites explícitos.
- [ ] Documentar matriz: admin cria/edita/consulta; técnico consulta; órfão, revogado e sessão sem segunda etapa não acessam. Workspace recebido nunca substitui autorização.
- [ ] Especificar serviços públicos de parks para futuras issues validarem localização e atividade no contexto de uma transação. Documentar estratégia de locks para futura corrida criação de issue versus desativação, sem implementar issues.
- [ ] Registrar endpoints planejados: GET/POST parks, GET/PATCH parks/:parkId e GET/POST parks/:parkId/turbines, GET/PATCH parks/:parkId/turbines/:turbineId, todos sob /api/workspaces/:workspaceId.

## Contratos e dados afetados

Contratos compartilhados e documentação do banco; sem migração aplicada, SQL em dev ou rotas de negócio nesta task. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [ ] Testar validações, limites, normalização, paginação e expectedRevision. Conferir matriz de permissão e executar pnpm check para alterações de contratos.
- [ ] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Planejamento em 26/10/2026. Implementação e validações desta task ainda não executadas.


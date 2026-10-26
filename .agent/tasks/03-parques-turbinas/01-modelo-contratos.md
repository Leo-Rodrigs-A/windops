# P01 — Modelo e contratos

## Status

Concluída em 26/10/2026.

- [x] Task concluída

## Objetivo

Definir o catálogo e seus contratos antes da persistência e dos endpoints.

## Estado atual

Slices 01 e 02 concluídas. O módulo parks contém somente um entrypoint vazio; não há catálogo implementado. Este plano não comprova execução das dependências.

## Dependências

Slices 01 e 02 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Contratos compartilhados e documentação do banco; sem migração aplicada, SQL em dev ou rotas de negócio nesta task.

## Plano de implementação

- [x] Registrar modelo relacional e marcador futuro de atividade em `.agent/database.md`.
- [x] Definir normalização: remover espaços externos, uppercase ASCII, formato `P|T` + 2–6 algarismos ASCII, zeros significativos e sem limite fixo de quantidade.
- [x] Definir unicidade, integridade tenant, UUID estável, parque imutável da turbina e exclusão física fora do escopo.
- [x] Definir DTOs Zod estritos, create/update, revisão obrigatória, paginação `limit` 1–100, busca até 100 caracteres e ordenação `code ASC, id ASC` com cursor UUID.
- [x] Documentar matriz: admin escreve; ambos os cargos consultam; sessão completa e membership ativa são obrigatórias.
- [x] Especificar API pública futura de parks e ordem de locks parque→turbina para concorrência com issues.
- [x] Registrar endpoints previstos sob `/api/workspaces/:workspaceId`.

## Contratos e dados afetados

Contratos compartilhados e documentação do banco; sem migração aplicada, SQL em dev ou rotas de negócio nesta task. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [x] Testar validações, limites, normalização, paginação e expectedRevision. Conferir matriz de permissão e executar `pnpm check`.
- [x] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Implementação em 26/10/2026: adicionados schemas/tipos Zod estritos para parques, turbinas, parâmetros, criação/edição e páginas; normalização de códigos e queries coberta por testes. `.agent/database.md` registra colunas, integridade tenant, revisão otimista, paginação, autorização, endpoints planejados e protocolo futuro de concorrência com issues.

Validação: `pnpm check` foi iniciado, mas ficou sem saída e sem processo de verificação observável, então foi interrompido. Os equivalentes executados diretamente passaram: Biome em 132 arquivos, checagem de boundaries, typecheck de contracts e Vitest (9 testes). `git diff --check` passou. Sem migração SQL, rotas, acesso ao banco ou alteração do banco dev. Constraints e locks serão confirmados em P02/P04 e na integração com issues; ainda não estão implementados.

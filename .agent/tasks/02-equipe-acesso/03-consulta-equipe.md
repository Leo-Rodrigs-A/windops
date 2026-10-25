# E03 — Consulta administrativa da equipe

## Status e dependências

Planejada. Depende de E02.

- [ ] Task concluída.

## Objetivo e escopo

Permitir que admin consulte membros do próprio workspace e contas sem membership ativa em qualquer workspace. Consultar uma conta não concede acesso nem aceita convite por ela.

## Plano de implementação

- [ ] Implementar consultas e serviço público de workspaces com autorização admin baseada em sessão completa e membership ativa.
- [ ] Obter somente ID, nome e e-mail necessários pelo serviço público de identity; manter dados de sessão, senha, OAuth e verificação internos.
- [ ] Listar membros ativos com cargo e metadados mínimos; definir filtro explícito de revogados se necessário ao fluxo de reintegração.
- [ ] Listar órfãos considerando ausência de vínculos ativos em todos os workspaces. Não revelar contas exclusivas de outro workspace, mesmo em busca por e-mail exato.
- [ ] Definir tratamento de contas ainda não verificadas sem permitir que essa consulta substitua a verificação no aceite.
- [ ] Implementar busca e paginação limitadas, ordenação estável, validação de entradas e DTOs dos contratos E02.
- [ ] Tratar pesquisa sem resultados, workspace inexistente/forjado e perda de membership durante navegação.
- [ ] Documentar endpoints no OpenAPI e atualizar os limites públicos dos módulos.

## Validação e aceite

- [ ] Admin vê membros de A e órfãos; não vê usuários exclusivos de B.
- [ ] Técnico, visitante, sessão pré-código e admin revogado não acessam o diretório.
- [ ] Conta com vínculo revogado e outro vínculo ativo não aparece como órfã.
- [ ] Paginação/busca não contornam o filtro tenant nem expõem campos sensíveis.
- [ ] Integração usa banco descartável com dois tenants; singleton só é removido na fixture.
- [ ] `pnpm check` e integração de workspaces passam; evidências e índice atualizados.

## Evidências

Pendente. Nenhum endpoint novo de diretório implementado.

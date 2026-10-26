# P03 — Consultas do catálogo

## Status

Planejada

- [ ] Task concluída

## Objetivo

Disponibilizar parques e turbinas para ambos os cargos com autorização no servidor.

## Estado atual

Slices 01 e 02 concluídas. O módulo parks contém somente um entrypoint vazio; não há catálogo implementado. Este plano não comprova execução das dependências.

## Dependências

P01 e P02 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

GETs do catálogo, DTOs públicos e serviços parks; sem escrita, sync, cache durável ou acesso Electric.

## Plano de implementação

- [ ] Implementar repositórios locais de parks e serviços públicos de listagem/detalhe, sem importar repositórios ou schema de workspaces.
- [ ] Reutilizar serviços públicos de identidade/workspace para sessão completa e membership ativa em cada requisição.
- [ ] Registrar GETs previstos em P01 com schemas/OpenAPI; filtrar sempre por workspace e conferir park_id na consulta de turbina.
- [ ] Implementar limites, busca e paginação definidos em P01, com ordenação estável e estado vazio; não revelar existência de IDs de outro tenant.
- [ ] Exportar consulta/validação de localização pelo index público de parks, preparada para composição transacional posterior sem dependência circular com issues.
- [ ] Cobrir órfão, técnico, admin, revogação, sessão incompleta e troca maliciosa de IDs usando banco descartável.

## Contratos e dados afetados

GETs do catálogo, DTOs públicos e serviços parks; sem escrita, sync, cache durável ou acesso Electric. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [ ] Integração de leitura com dois tenants, parque sem turbinas, catálogo vazio, paginação e combinações inválidas workspace/parque/turbina. Executar pnpm check e integração do domínio.
- [ ] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Planejamento em 26/10/2026. Implementação e validações desta task ainda não executadas.

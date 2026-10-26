# P02 — Schema, migração e privilégios

## Status

Planejada

- [ ] Task concluída

## Objetivo

Persistir o catálogo com integridade tenant e preservar o banco existente.

## Estado atual

Slices 01 e 02 concluídas. O módulo parks contém somente um entrypoint vazio; não há catálogo implementado. Este plano não comprova execução das dependências.

## Dependências

P01 concluída. Ver [índice da slice](README.md).

## Escopo e exclusões

Tabelas parks/turbines, migração/journal e provisionamento de grants quando necessário; sem endpoints ou telas.

## Plano de implementação

- [ ] Implementar schema no módulo parks e gerar a próxima migração Drizzle conforme journal existente, sem editar migrações já aplicadas.
- [ ] Criar unicidades, FKs compostas e índices para consultas por workspace/parque; impor revisão positiva, campos obrigatórios e política de códigos definida em P01 no banco.
- [ ] Impedir exclusão em cascata que apague histórico futuro; não criar tabela elevadores nem inserir parques/turbinas fictícios no banco de dev.
- [ ] Conceder somente privilégios necessários ao papel da API; manter DDL com migrador. Não adicionar catálogo à publicação Electric antes do proxy autorizado e da slice offline.
- [ ] Validar instalação vazia, upgrade desde schema atual, reaplicação/concorrência do migrador e violações de integridade em banco descartável com dois tenants.
- [ ] Após testes, aplicar migração pelo fluxo regular ao dev persistente, preservando contas, memberships e convites; conferir versão aplicada sem divulgar credenciais.

## Contratos e dados afetados

Tabelas parks/turbines, migração/journal e provisionamento de grants quando necessário; sem endpoints ou telas. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [ ] Verificar duplicidade no mesmo escopo, códigos iguais em parques/workspaces distintos, FK entre tenants, revisão e grants. Rodar pnpm check, drizzle-kit check e checks de banco/contêiner adequados; documentar rollback operacional sem prometer downgrade destrutivo.
- [ ] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Planejamento em 26/10/2026. Implementação e validações desta task ainda não executadas.


# P04 — Cadastro e edição administrativa

## Status

Planejada

- [ ] Task concluída

## Objetivo

Permitir que administradores cadastrem e corrijam códigos sem sobrescrever alterações concorrentes.

## Estado atual

Slices 01 e 02 concluídas. O módulo parks contém somente um entrypoint vazio; não há catálogo implementado. Este plano não comprova execução das dependências.

## Dependências

P01–P03 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

POST/PATCH de parks/turbines, revisão e erros de conflito; sem histórico de issues, outbox offline ou notificações.

## Plano de implementação

- [ ] Implementar POST/PATCH de parques e turbinas nos contratos previstos; permitir somente admin ativo com segunda etapa concluída.
- [ ] Definir ordem de locks compatível com alterações de membership, revalidando cargo dentro da transação para corridas com revogação/rebaixamento.
- [ ] Normalizar entradas no servidor, derivar escopo autorizado e validar vínculo da turbina; não aceitar workspace_id/park_id alternativos por mass assignment.
- [ ] Usar unicidade PostgreSQL para duas criações simultâneas e devolver conflito útil; não depender de consulta prévia para prevenir duplicidade.
- [ ] Aplicar edição com expectedRevision e incremento atômico; revisão obsoleta retorna conflito sem sobrescrever dados. Definir resposta para retry após timeout, sem duplicar criação com o mesmo código.
- [ ] Preservar UUIDs e relacionamentos ao renomear; não permitir mover turbina, excluir, desativar ou reativar nesta slice.
- [ ] Testar corridas de escrita e de perda de permissão; expor apenas serviços públicos para futuras integrações.

## Contratos e dados afetados

POST/PATCH de parks/turbines, revisão e erros de conflito; sem histórico de issues, outbox offline ou notificações. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [ ] Integrações para técnico proibido, admin revogado, duplicidade concorrente, edição obsoleta, retry e IDs de outro tenant. Conferir persistência após reinício da API e rodar pnpm check.
- [ ] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Planejamento em 26/10/2026. Implementação e validações desta task ainda não executadas.


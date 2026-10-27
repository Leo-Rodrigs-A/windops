# S02 — Armazenamento local e fila durável

## Status

Planejada

- [ ] Task concluída

## Objetivo

Persistir dados e intenções no aparelho antes do feedback de gravação e recuperar o trabalho após interrupções.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

## Dependências

S01 concluída quanto ao modelo e à prova de persistência.

## Escopo e exclusões

Armazenamento e fila local; sem habilitar envio automático ou considerar estado local confirmado no servidor.

## Plano de implementação

- [ ] Implementar o adaptador escolhido na S01, schemas/migrações locais e partições por conta/workspace; não usar localStorage para dados operacionais/fila.
- [ ] Gravar comando e projeção local em transação ou journal comprovado; só retornar salvo no aparelho após commit durável. Em erro, preservar o formulário e permitir nova tentativa sem falso sucesso.
- [ ] Implementar estados persistidos de pendente, em envio, aguardando autenticação/elegibilidade, conflito, rejeitado e confirmado aguardando réplica; recuperação de envio interrompido reutiliza a identidade original.
- [ ] Persistir dependências de criação e mutações da mesma issue. Separar revisão base do servidor das revisões da projeção local; impedir envio de descendente antes da confirmação do predecessor.
- [ ] Implementar exclusão mútua/lease recuperável entre abas sem depender de um processo vivo; idempotência do servidor continua necessária se dois envios escaparem.
- [ ] Garantir upgrade local sem limpeza automática e exportação versionada de pendências com texto, localização, IDs e motivo do bloqueio, sem segredos. Exportação não equivale a sincronização nem a importação automática.
- [ ] Definir tratamento de quota, armazenamento negado/corrompido e remoção automática de dados pelo navegador; solicitar persistência quando suportado sem prometer proteção contra limpeza manual ou desinstalação. Remover apenas cache reconstruível, nunca pendências silenciosamente.

## Contratos e dados afetados

Modelo local versionado de réplica, intenções e outbox; recibos PostgreSQL sync_commands existentes continuam sendo a prova de confirmação remota, não uma fila no aparelho.

## Testes e aceite

- [ ] Criar e editar offline, encerrar abruptamente o processo e reabrir: conteúdo e dependências reaparecem uma vez.
- [ ] Simular quota, falha de transação, schema antigo, duas abas e lease abandonada; ausência de espaço impede confirmação de salvamento.
- [ ] Exportar e inspecionar pendências em fixture sem cookies/tokens; migração mantém dados e nunca remove comandos não confirmados.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

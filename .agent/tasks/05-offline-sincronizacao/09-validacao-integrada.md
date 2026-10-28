# S09 — Validação integrada de campo e encerramento

## Status

Planejada

- [ ] Task concluída

## Objetivo

Comprovar o percurso campo→aparelho→servidor→outro aparelho, com perdas e conflitos controlados.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

S08 concluída em 28/10/2026 com validação desktop no Preview de build. Por decisão do proprietário, validação real em Android/iPhone e contexto HTTPS de aparelho serão executados em produção nesta S09; não declarar suporte móvel antes desses testes.

## Dependências

S01–S08 concluídas para o escopo declarado; decisões temporais e limites de suporte registrados.

## Escopo e exclusões

Validação, correções e documentação; não implantar produção nem antecipar notificações/reabertura.

## Plano de implementação

- [ ] Executar pnpm check, integrações auth/workspaces/parks/issues e novos checks significativos de storage, sync e proxy. Se o comando agregado travar, registrar tempo/saída e equivalentes diretos sem declarar pnpm check aprovado.
- [ ] Executar matriz com dois tenants, admin/técnicos, múltiplas contas/abas e dois aparelhos: preparação completa, modo avião, criação/edição/atendimento/conclusão, encerramento e restart físico, reconexão e consulta por outro membro.
- [ ] Induzir falha antes do commit local, durante envio, depois do commit PostgreSQL e antes do ACK/réplica; contar issues, revisões, eventos e recibos. Repetir retries e resnapshot sem duplicação.
- [ ] Validar corrida de atendimento, revisão, equipamento arquivado/excluído, logout, expiração/segunda etapa, revogação, alteração de cargo, exportação e isolamento de conta/workspace.
- [ ] Verificar quota/armazenamento negado, cache parcial, migração local, atualização de service worker, suspensão/retomada e reset de réplica; nenhum descarte silencioso ou sucesso sem persistência.
- [ ] Com migrations/grants alterados, executar instalação vazia, upgrade preservando dados, reaplicação, restart, restore, privilégios e isolamento Electric real; inspecionar publicação e superfície de rede.
- [ ] Registrar evidências datadas em Android/Chrome e iPhone/Safari (navegador e instalado) com versões/modo/aparelho e aceite do proprietário. Indisponibilidade é lacuna explícita; não concluir suporte de plataforma apenas por emulação ou por aceite de slice anterior.
- [ ] Encerrar apenas servidores/exposições temporários criados nesta validação e conferir regras de rede. Não apagar inventário real; usar fixtures acordadas/descartáveis.
- [ ] Atualizar tarefas, índice, arquitetura, database, memória e roadmaps 05–08/11 conforme entregas reais. Registrar pendências de notificações, reabertura, arquivo/restauração e produção; sugerir commit em português.

## Contratos e dados afetados

Todos os contratos/modelos desta slice; matriz de evidências com ambiente, cenário, resultado e limite. Recibos remotos e fila local devem ser distinguidos no relatório.

## Testes e aceite

- [ ] Nenhum texto/comando desaparece em encerramento, restart, conflito, expiração ou update; exportação permite recuperação de rejeitados.
- [ ] Nenhum acesso cross-tenant/cross-account, atalho de segunda etapa, exposição Electric ou duplicação de efeito em retry.
- [ ] Somente marcar task/slice e suporte de dispositivos como concluídos após evidência correspondente; aceite funcional do proprietário não substitui prova de durabilidade.
- [ ] Garantia declarada: envio com aplicativo aberto/retomado e conectado, não envio garantido em segundo plano.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

# I08 — Validação integrada e encerramento

## Status

Planejada

- [ ] Task concluída

## Objetivo

Comprovar o fluxo online completo e documentar a base entregue para offline/sync.

## Estado atual

Planejada em 26/10/2026. I01–I07 e I09 foram implementadas; falta a validação integrada final, o percurso manual autenticado e as verificações de dispositivo descritas abaixo. Este documento não comprova esses itens.

## Dependências

I01–I07 e I09 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Validação, correções necessárias e documentação; não implementar antecipadamente as etapas 07–11.

## Plano de implementação

- [ ] Executar pnpm check e integrações issues, parks, workspaces e autenticação. Se o shim voltar a travar, registrar saída/tempo e equivalentes diretos; nunca declarar pnpm check aprovado sem evidência.
- [ ] Validar migração vazia/repetida, upgrade preservando catálogo e contas, restart, restore e privilégios com comandos existentes; conferir publicação Electric sem novas tabelas privadas.
- [ ] Reexecutar matriz tenant/ator/revisão e corridas das I04–I06 com conexões reais e fixtures descartáveis; induzir falha antes do commit e perda da resposta após commit.
- [ ] Comprovar persistência de issues/eventos/recibos após restart e replay sem duplicação; separar essa garantia PostgreSQL de persistência local ainda inexistente.
- [ ] Combinar percurso manual no dev: admin e técnico criam/atendem, autor edita, admin libera, consulta de logs e lifecycle de equipamento. Não apagar inventário real para produzir evidência; usar fixtures acordadas.
- [ ] Validar desktop e Android físico; tentar iPhone se disponível e registrar indisponibilidade sem marcar validação feita. Encerrar servidores/exposição temporários e conferir portproxy/firewall quando usados.
- [ ] Atualizar tasks, índice, memória, arquitetura, database e roadmap com o que efetivamente passou. Offline, reabertura e arquivo de issues continuam posteriores; não declarar lifecycle completo.
- [ ] Registrar dependências para próxima slice: persistência local/outbox durável, proxy Electric, reconciliação, restart do aparelho, exportação de pendências, expiração/revogação e conflitos; notificações e reabertura continuam posteriores. Sugerir commit em português.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Aceite: criação/edição/atendimento autorizados; histórico imutável e sem duplicação; equipamentos com referências atuais ou históricas preservados; exclusão sem histórico segura contra concorrência.
- [ ] Aceite: fluxo UI validado, dados sobrevivem restart do servidor, nenhuma promessa offline, evidências datadas e limitações explícitas. Marcar conclusão somente após executar as entregas.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: task planejada; nenhuma implementação, migração, teste de aplicação ou validação funcional executada nesta preparação. Preencher evidência da execução futura com data e resultados reais.

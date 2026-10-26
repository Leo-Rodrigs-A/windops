# Slice 04 — Registro e atendimento

## Status

Em andamento desde 26/10/2026; I01 concluída e I02 é a próxima task.

- [ ] Slice concluída

## Resultado esperado

Membros ativos registram chamados de texto em parque/turbina, consultam histórico, editam suas próprias issues abertas e iniciam/devolvem atendimento. Admin pode liberar atendimento. Gravações online persistem no PostgreSQL com revisão e retries idempotentes. O catálogo ganha exclusão sem histórico e arquivamento/restauração com histórico, protegidos contra criação concorrente de issues.

## Ordem e dependências

Slices [01](../01-fundacao/README.md), [02](../02-equipe-acesso/README.md) e [03](../03-parques-turbinas/README.md) concluídas. Começar pela I01 e executar na ordem abaixo. O lifecycle pendente do roadmap 05 é resolvido dentro desta slice; não exigir conclusão integral da etapa 05 (que inclui offline) para iniciar issues.

| Task | Dependências |
| --- | --- |
| [I01 — Modelo, regras e contratos](01-modelo-contratos.md) | Slices 01–03 concluídas. |
| [I02 — Schema, migrações e privilégios](02-schema-migracoes.md) | I01 concluída, incluindo decisões do agregado. |
| [I03 — Consultas autorizadas e histórico](03-consultas-historico.md) | I01 e I02 concluídas. |
| [I04 — Registro, edição e comandos idempotentes](04-registro-edicao.md) | I01–I03 concluídas. |
| [I05 — Início, devolução e liberação de atendimento](05-atendimento.md) | I04 concluída. |
| [I06 — Exclusão, arquivamento e restauração de equipamentos](06-lifecycle-equipamentos.md) | I01–I05 concluídas. |
| [I07 — Interfaces de chamados e lifecycle do catálogo](07-interfaces.md) | I03–I06 concluídas. |
| [I08 — Validação integrada e encerramento](08-validacao-integrada.md) | I01–I07 concluídas. |

- [x] I01 — Modelo, regras e contratos — concluída em 26/10/2026; contratos Zod e decisões do agregado registrados.
- [ ] I02 — Schema, migrações e privilégios
- [ ] I03 — Consultas autorizadas e histórico
- [ ] I04 — Registro, edição e comandos idempotentes
- [ ] I05 — Início, devolução e liberação de atendimento
- [ ] I06 — Exclusão, arquivamento e restauração de equipamentos
- [ ] I07 — Interfaces de chamados e lifecycle do catálogo
- [ ] I08 — Validação integrada e encerramento

## Limites e decisões de escopo

- Recorte online da [etapa 06](<../00 - roadmap/06-issues.md>) e lifecycle de equipamentos da [05](<../00 - roadmap/05-parks.md>). Não representa o fluxo de campo offline pronto.
- Texto obrigatório, sem título/fotos/materiais; um elevador por turbina. Ambos os cargos trabalham em issues; criador edita somente próprias abertas; não há atribuição a terceiros.
- Estados operacionais desta slice: Pendente e Em andamento. Conclusão, espera do criador de uma hora, relato, reabertura, arquivos/reativação de issues e restauração de relato permanecem na [etapa 08](<../00 - roadmap/08-lifecycle.md>). Arquivar equipamento não arquiva automaticamente suas issues.
- Antecipar somente o núcleo de eventos append-only de audit e recibos idempotentes de sync necessário à transação online. A etapa 08 amplia o histórico; a [07](<../00 - roadmap/07-offline.md>) integra persistência local/outbox, proxy Electric e reconciliação. Não duplicar recibos ao evoluir sync.
- Sem campainha, push, e-mail de eventos ou worker/outbox de notificações agora. Eventos têm IDs estáveis para futura deduplicação; etapa 09 deve integrar agendamento transacional e definir corte de ativação sem notificações retroativas acidentais. Não declarar pipeline completo de notificações entregue.
- Não ampliar publicação/grants Electric, habilitar PWA ou chamar memória otimista de persistência durável. `/api/sync/:collection` continua fechado até implementação autorizada de shapes.
- Decisões registradas na I01: arquivo de parque bloqueado se alguma turbina tiver issue aberta; arquivo de turbina bloqueado se tiver issue aberta; turbinas arquivadas individualmente permanecem arquivadas ao restaurar parque. Referências históricas de localização impedem exclusão física. Com os estados desta slice todas as issues são abertas; arquivo com histórico só pode ocorrer após a etapa 08 adicionar status fechado.
- Sessão completa, membership ativa e isolamento tenant em toda operação, inclusive replay. Locks seguem protocolo único com workspaces/parks; módulos só conversam por serviços públicos.
- UI segue Shadcn e referência Pencil externa reconfirmada na I07. Não inventar layout definitivo nem alterar designs; indisponibilidade impede apenas trabalho visual dependente, sem invalidar trabalho independente de backend.
- Não popular inventário nem excluir dados dev automaticamente; fixtures descartáveis para corridas e exclusões. Ajustes mobile antigos da slice 02 continuam adiados.

## Aceite da slice

- [ ] Registro/edição/atendimento conforme ator, tenant, estado e revisão, sem atribuição a terceiros.
- [ ] Mutação, evento e recibo atômicos; restart/retry não duplicam dados ou histórico.
- [ ] Lista/detalhe/histórico paginados e autorizados, inclusive atores removidos e equipamentos arquivados.
- [ ] Lifecycle do catálogo preserva referências atuais/históricas e resolve corridas com gravação de issues.
- [ ] Interface conectada à API real, conflitos explícitos e percurso validado em desktop/mobile com limitações registradas.
- [ ] Validações/documentação concluídas; offline, lifecycle completo de issues e notificações permanecem explicitamente futuros.

## Evidência do planejamento

26/10/2026: criadas oito tasks I01–I08. I01 implementada em contratos compartilhados e modelo; veja a evidência na task. A validação integrada da slice continua pendente. A implementação futura ainda não inclui endpoints nem alteração do banco.

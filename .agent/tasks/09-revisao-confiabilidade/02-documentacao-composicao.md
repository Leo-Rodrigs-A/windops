# R02 — Documentação e composição da auditoria

## Status

Concluída em 30/10/2026.

- [x] Task concluída

## Objetivo

Alinhar documentação ao produto implementado e tornar explícita a dependência de auditoria em notificações.

## Escopo e exclusões

README, referências de arquitetura e composição de AuditService. Sem alteração das regras de notificação, novas abstrações de banco ou mudança de API HTTP.

## Estado atual

README ainda nega funcionalidades existentes e aponta F04 como próxima tarefa. AuditService tem createNotificationsService como default do parâmetro. O caminho architeture.md é usado pelas instruções do proprietário e muitos links: renomear sem compatibilidade quebraria a descoberta.

## Dependências

R01 e Q05 concluídas; concluir R01A (sanitização de logs) antes da alteração de fonte. Confirmar todos os consumidores/factories na versão corrente.

## Plano

- [x] Atualizar README: funcionalidades implementadas, setup/auth opt-in/bootstrap, comandos realmente disponíveis, situação atual e limites móveis/produção.
- [x] Corrigir nome canônico para architecture.md com atualização dos links internos; manter architeture.md como ponte de compatibilidade para instruções externas. Não apagar histórico nem alterar instruções externas silenciosamente.
- [x] Injetar NotificationsService explicitamente em auditoria; remover import/factory concreta default e ajustar composição e todos os testes/fixtures consumidores.
- [x] Preservar o mesmo cliente transacional na gravação de evento e intenção de notificação; não enviar efeitos externos dentro da transação.
- [x] Verificar rollback de auditoria/notificação juntos, destinatários e idempotência na integração de issues; ampliar teste somente onde faltar evidência.
- [x] Executar `pnpm check`, integração de issues e validação de links; registrar evidências e atualizar índice/memória.
- [x] Detalhar R03 com fronteiras transacionais encontradas em R01, incluindo retornos de erro e tratamento de falha no rollback.

## Contratos e dados afetados

Assinatura interna de factory e composição. Contratos HTTP, schemas, recibos, payloads e regras de entrega permanecem compatíveis. Renomeação documental mantém caminho legado utilizável.

## Testes e aceite

Nenhum consumidor depende da criação implícita de notificações; uma falha transacional não deixa evento/outbox parcial. README não promete funcionalidades ou validações indisponíveis. Links novos e legado resolvem a arquitetura.

## Evidências

30/10/2026 — README atualizado para o escopo entregue, setup de Auth opt-in, bootstrap explícito, comandos existentes e limites de validação. `.agent/architecture.md` tornou-se canônico e `.agent/architeture.md` permanece como ponte; links internos foram migrados. `createAuditService` agora exige `NotificationsService`; composição de produção e quatro consumidores da integração injetam a mesma instância, e `appendIssueEvent` continua usando o cliente recebido pela transação. `pnpm check` passou (61 testes e builds); `pnpm test:issues-integration` passou em PostgreSQL descartável, cobrindo rollback, destinatários, atomicidade e retries/idempotência existentes. Links verificados e `git diff --check` aprovado. Nenhum contrato, schema ou efeito externo foi alterado.

R03 foi detalhada em [03-transacoes-erros.md](03-transacoes-erros.md), com pontos de transação, comportamento de rollback e classificador de erros a estudar; implementação não iniciada.


Atualização de dependência — 30/10/2026: Q05 e slice 08 concluídas com aceite funcional do proprietário em Chrome/Edge (admin/técnico) e checks registrados. O bloqueio Q05 mencionado no planejamento original está resolvido. R01 é a próxima execução; nenhuma task R foi implementada por este encerramento.


## Refinamento pela R01

Migrar createAuditService em server.ts e as quatro chamadas de issues-read-flow.mjs (incluindo realAudit usado no failpoint). Reutilizar instância notifications composta, mantendo o cliente da transação de issues; não transformar appendIssueEvent em conexão independente. Revisar README e resumo atual da arquitetura, hoje misturado com estados históricos. Aceite: integração de rollback/evento/outbox e destinatários já existente permanece aprovada, sem exigir push externo. Referência: [A02/A03 na baseline](baseline-r01.md).

# I04 — Registro, edição e comandos idempotentes

## Status

Concluída em 26/10/2026

- [x] Task concluída

## Objetivo

Criar e editar chamados online sem duplicar dados ou histórico em retries.

## Estado atual

POST/PATCH de issues e a composição atômica issue/evento/referência/recibo estão implementados. Próxima task: I05. O proxy Electric permanece fechado.

## Dependências

I01–I03 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Criação Pendente e edição de conteúdo aberto pelo criador; sem fila local, worker, notificações ou transições de atendimento.

## Plano de implementação

- [x] Implementar serviço público mínimo de sync para recibos e de audit para append de eventos, compondo mesma conexão/transação com issues; não ativar proxy Electric.
- [x] Revalidar sessão/membership dentro da operação, usar locks definidos em I01 e serviço público parks para localização ativa; ator e tenant não são aceitos como autoridade no corpo.
- [x] Criar issue com UUID do cliente e evento de criação na mesma transação do recibo; colisão de UUID com outro comando nunca sobrescreve nem revela dado externo.
- [x] Editar texto/localização somente pelo criador em Pendente ou Em andamento, com expectedRevision; manter responsável e registrar antes/depois. Se a localização não mudar, seguir decisão I01 sobre equipamento arquivado.
- [x] Manter referência histórica ao equipamento anterior ao editar localização; novo destino deve estar ativo. Uma falha em evento/recibo desfaz toda a operação.
- [x] Repetição com mesma chave/payload retorna resultado confirmado sem novo evento; chave reutilizada com conteúdo diferente conflita. Após resposta perdida, reutilizar a mesma chave, inclusive depois de reiniciar a API.
- [x] Preservar conteúdo do cliente ao retornar conflito de revisão; não aplicar last-write-wins silencioso nem declarar rascunho em memória como durável.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [x] Criar integração de issues em banco descartável e script documentado no package.json; testar ambos os cargos, edição alheia negada, localização externa/inativa e transação revertida por falha injetada.
- [x] Testar comandos simultâneos iguais, payload divergente, UUID duplicado, retry após resposta perdida/recriação do serviço e retry após revogação negado; verificar uma issue/evento/recibo e isolamento entre atores/tenants.
- [x] Testar edição concorrente e sincronização de criação/mudança de localização com locks e consultas de lifecycle; executar pnpm check e integrações de issues/parks/workspaces afetadas.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: implementados `POST /api/workspaces/:workspaceId/issues` e `PATCH /api/workspaces/:workspaceId/issues/:issueId`, serviços públicos de append em `audit`, recibos em `sync`, lock/validação de equipamentos em `parks` e autorização transacional com membership ID. Atualizados exports de `issues`, `app.ts`, `server.ts` e refinamento do contrato PATCH para exigir localização completa em conjunto. Integração PostgreSQL descartável registrada em `pnpm test:issues-integration` (script `apps/api/scripts/issues-read-flow.mjs`): ambos os cargos, auth incompleta/órfão/revogação, localização externa/inativa/arquivada, edição alheia, revisão concorrente, mesma chave concorrente, payload divergente, UUID duplicado dentro e fora do tenant, retry após recriar o serviço, retry negado após revogação, falha injetada com rollback, referências históricas e locks contra lifecycle. Integrações `pnpm test:parks-integration` e `pnpm test:workspaces-integration` passaram.

Biome em 156 arquivos, boundaries, typechecks contracts/API/web, 19 testes Vitest e builds API/web passaram. `pnpm check` ficou sem saída por 40s e terminou em timeout 124; os equivalentes diretos foram executados. A integração de workspaces imprime erros SQL esperados nos cenários negativos de bootstrap e termina com sucesso. Nenhuma migration ou dado do banco dev alterado nesta task; não há lifecycle HTTP ainda, que permanece na I06.

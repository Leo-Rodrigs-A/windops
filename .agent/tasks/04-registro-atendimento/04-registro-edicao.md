# I04 — Registro, edição e comandos idempotentes

## Status

Planejada

- [ ] Task concluída

## Objetivo

Criar e editar chamados online sem duplicar dados ou histórico em retries.

## Estado atual

Planejamento em 26/10/2026. Slice 03 concluída; issues e audit têm somente entrypoints vazios e sync retorna 503. As entregas desta slice ainda não existem. As dependências abaixo precisam ser executadas e verificadas; este documento não comprova implementação.

## Dependências

I01–I03 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Criação Pendente e edição de conteúdo aberto pelo criador; sem fila local, worker, notificações ou transições de atendimento.

## Plano de implementação

- [ ] Implementar serviço público mínimo de sync para recibos e de audit para append de eventos, compondo mesma conexão/transação com issues; não ativar proxy Electric.
- [ ] Revalidar sessão/membership dentro da operação, usar locks definidos em I01 e serviço público parks para localização ativa; ator e tenant não são aceitos como autoridade no corpo.
- [ ] Criar issue com UUID do cliente e evento de criação na mesma transação do recibo; colisão de UUID com outro comando nunca sobrescreve nem revela dado externo.
- [ ] Editar texto/localização somente pelo criador em Pendente ou Em andamento, com expectedRevision; manter responsável e registrar antes/depois. Se a localização não mudar, seguir decisão I01 sobre equipamento arquivado.
- [ ] Manter referência histórica ao equipamento anterior ao editar localização; novo destino deve estar ativo. Uma falha em evento/recibo desfaz toda a operação.
- [ ] Repetição com mesma chave/payload retorna resultado confirmado sem novo evento; chave reutilizada com conteúdo diferente conflita. Após resposta perdida, reutilizar a mesma chave, inclusive depois de reiniciar a API.
- [ ] Preservar conteúdo do cliente ao retornar conflito de revisão; não aplicar last-write-wins silencioso nem declarar rascunho em memória como durável.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Criar integração de issues em banco descartável e script documentado no package.json; testar ambos os cargos, edição alheia negada, localização externa/inativa e transação revertida por falha injetada.
- [ ] Testar comandos simultâneos iguais, payload divergente, UUID duplicado, timeout após commit, restart e retry; verificar uma issue/evento/recibo, isolamento entre atores/tenants e retry após revogação negado.
- [ ] Testar edição concorrente e edição de localização versus arquivo/exclusão; executar pnpm check e integrações de issues/parks/workspaces afetadas.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: task planejada; nenhuma implementação, migração, teste de aplicação ou validação funcional executada nesta preparação. Preencher evidência da execução futura com data e resultados reais.

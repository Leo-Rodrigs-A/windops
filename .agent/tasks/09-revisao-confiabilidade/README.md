# Slice 09 — Revisão técnica e confiabilidade

## Status

Concluída em 30/10/2026; R01, R01A e R02–R08 concluídas. Não representa certificação de aplicação “100%” nem entrega de produção.

- [x] Slice concluída

## Resultado esperado

Reduzir acoplamento e responsabilidades acumuladas, corrigir defeitos demonstrados e tornar os fluxos críticos verificáveis sem alterar contratos ou perder garantias de segurança e persistência. Conclusão exige evidências por fluxo, e não somente arquivos menores ou checks verdes.

## Base e limites da análise

Inspeção estática confirmou README descrevendo uma fundação já superada, factory concreta de notificações como default em audit/service.ts, transações repetidas em issues/parks/workspaces e concentração de frontend em pages e store offline. Contagens de linhas e problemas do zip são hipóteses a revalidar em R01, não uma auditoria completa do estado atual.

Não considerar automaticamente defeitos: composição explícita em app.ts, ausência de herança, uso direto de PostgreSQL ou quantidade de testes unitários. Testes de banco continuam necessários para locks, autorização transacional, constraints e idempotência. Não criar framework de módulos, repository genérico, máquina de estados genérica ou novas dependências sem ganho demonstrado.

## Dependências

Ler [arquitetura](../../architecture.md), [memória](../../memory.md) e [convenção](../README.md). R01 pode começar com Q05 aberta, registrando suas lacunas. Refactors de comportamento começam somente após o aceite Q05, ou após resolver explicitamente seus bloqueios no escopo de R01 sem marcar ensaios indisponíveis como aprovados. Slices 01–07 fornecem a base de regressão, não evidência automática desta entrega.

## Sequência e detalhamento progressivo

R03–R08 estão detalhadas a partir dos achados A01–A13. Antes de executar cada etapa, incorporar ao arquivo executável os resultados da anterior, arquivos afetados, falhas encontradas e testes necessários.

| Etapa | Entrega planejada                                                                                                               | Dependência                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| R01   | [Auditoria reproduzível e baseline](01-auditoria-baseline.md)                                                                   | Base atual; registrar e resolver dependência Q05 |
| R02   | [Documentação e composição da auditoria](02-documentacao-composicao.md)                                                         | R01; Q05 para alteração de fonte                 |
| R03   | [Transações e erros](03-transacoes-erros.md) — executor pequeno, preservação de locks/rollback e tradução de erros de domínio   | R02                                              |
| R04   | [Interfaces Workspaces](04-interfaces-workspaces.md) — separar autorização, membros e convites; manter facade/export compatível | R03                                              |
| R05   | [Domínio Issues](05-dominio-issues.md) — separar políticas, orquestração e SQL; preservar hashes/recibos                        | R04                                              |
| R06   | [Frontend por feature](06-frontend-features.md) — issues, equipe e parques, com estados/filtros/foco preservados                | R05                                              |
| R07   | [Store offline](07-store-offline.md) — separar persistência, projeção e fila mantendo atomicidade e journal                     | R06                                              |
| R08   | [Aceite integrado](08-aceite-integrado.md) — fechar matriz A01–A13, regressões e pendências com evidência                       | R07                                              |

R01–R08 concluídas. A matriz final cobre os achados conhecidos A01–A13 e não equivale a garantia absoluta de ausência de defeitos.

## Invariantes obrigatórios

- Monólito modular; acesso entre módulos somente por serviços públicos. Novos repositories são internos ao módulo.
- Tenant e membership ativa revalidados dentro da mesma transação de escrita. Preservar ordem de locks, último admin e revogação concorrente.
- Auditoria, comandos/recibos e intenção de notificação permanecem atômicos; e-mail externo após commit, sem retry implícito que duplique efeitos.
- Classificador PostgreSQL pode identificar SQLSTATE/constraint; domínio decide se 23505/23503 significa conflito, inexistência ou falha inesperada. Não converter toda falha em resposta de negócio.
- Não mudar contratos HTTP, IDs, chaves de idempotência, hashes, timestamps/cursores, regras da hora, lifecycle ou payloads persistidos como efeito incidental de refactor.
- Journal e outbox mantêm compatibilidade, partição, restart, retry, conflito, exportação e proteção de pendências na poda. Alteração de schema precisa de plano próprio de migração/compatibilidade.
- Shapes continuam definidos no servidor; nenhum filtro/tabela arbitrário do cliente. Auth preserva segunda etapa e vinculação verificada.
- Nenhum layout novo: manter interface existente; referência .pen externa só após confirmar documento, sem edição implícita.

## Matriz de revisão e aceite

- [x] Inventário por severidade com reprodução, evidência, responsável por etapa e teste de regressão quando necessário; nenhum defeito crítico/alto conhecido sem solução ou decisão explícita do proprietário.
- [x] Auth/tenant: segunda etapa, vínculo verificado, acesso cross-tenant, revogação e último administrador preservados.
- [x] Catálogo/issues: validação, concorrência, lifecycle, espera da hora, idempotência e auditoria/notificação atômicas preservadas.
- [x] Consultas: filtros, cursor, respostas tardias, paginação e ordenação corretos nas três listas; Q05 encerrada com suas evidências próprias.
- [x] Offline: perda de rede, reabertura, ACK perdido, retry/conflito, quota simulada, poda, exportação e partição preservados com dados anteriores ao refactor.
- [x] PWA/dev: alternância Preview/Vite, worker antigo, atualização com fila pendente, hooks e HMR verificados segundo aceite registrado em Q05/R06; confirmação do proprietário separada de automação.
- [x] Interface: duas contas/cargos, estados vazio/carregando/erro/parcial, teclado/foco, temas e larguras responsivas; confirmação manual separada de automação.
- [x] Documentação corresponde ao código; limites e instruções de operação reproduzíveis, links válidos.
- [x] `pnpm check` e integrações apropriadas passaram; regressões corrigidas, recursos de teste encerrados e dados operacionais preservados.

## Estratégia de verificação

Cada refactor deve conservar uma baseline e adicionar testes de comportamento nas fronteiras alteradas. Políticas puras recebem testes unitários de decisões/limites; SQL, transações e concorrência continuam em PostgreSQL descartável. Modularizar scripts de integração se ajudar diagnóstico, sem retirar cenários para acelerar artificialmente. R08 executa pnpm check e integrações auth/workspaces/parks/issues; mudanças de infraestrutura/schema exigem também checks de instalação, upgrade, restore e privilégios pertinentes. Não repetir checks sem mudança ou dúvida que justifique.

## Exclusões e limites

Sem novas funcionalidades, deploy, provisionamento externo, troca de banco/bibliotecas, redesenho visual ou migração geral de schema. Validação física Android/iPhone, quota/evicção real, HTTPS e recuperação em produção permanecem na etapa 11. Segurança aqui é revisão e regressão do escopo conhecido, não pentest/certificação. Pendências impeditivas de aceite não podem ser transferidas para produção apenas para fechar a slice.

## Evidências

30/10/2026 — Slice planejada; análise confrontada parcialmente com fontes locais. Evidências de execução foram acrescentadas por task; testes anteriores não fecharam a slice automaticamente.

Verificação documental: três documentos novos e 5 links locais conferidos; git diff --check aprovado. Nenhuma fonte alterada nesta preparação; pnpm check e integrações não executados para o planejamento.


Atualização de dependência — 30/10/2026: Q05 e slice 08 concluídas com aceite funcional do proprietário em Chrome/Edge (admin/técnico) e checks registrados. O bloqueio Q05 mencionado no planejamento original está resolvido.


## Execução R01

- [x] R01 — baseline e inventário concluídos.
- [x] [R01A — Sanitização dos logs HTTP](01a-sanitizacao-logs.md): achado alto A01 corrigido; `pnpm check` e integração auth aprovados.

[Inventário R01](baseline-r01.md) registra checks/integrações aprovados e aceite da alternância Preview/Vite pelo proprietário. A01 foi resolvido na R01A; R02 alinhou documentação/composição e validou atomicidade. Próxima etapa: R03.

30/10/2026 — R01A concluiu serializer do logger sem query/fragmento, cobertura da captura real do logger e integração auth; veja [evidências R01A](01a-sanitizacao-logs.md). Nenhuma limpeza de logs históricos foi feita.

- [x] [R02 — Documentação e composição da auditoria](02-documentacao-composicao.md): README/arquitetura alinhados e `NotificationsService` injetado explicitamente.
- [x] [R03 — Transações e erros PostgreSQL](03-transacoes-erros.md): executor compartilhado em issues/parks, mapeamento por constraint e regressão de falhas transacionais.
- [x] [R04 — Interfaces Workspaces](04-interfaces-workspaces.md): interfaces por capacidade, consumidores mínimos e verificador de fronteiras com cobertura de aliases/imports dinâmicos.
- [x] [R05 — Domínio e orquestração de Issues](05-dominio-issues.md): policies puras extraídas, hash compartilhado com vetores de compatibilidade e integrações issues/parks aprovadas.
- [x] [R06 — Frontend por feature](06-frontend-features.md): módulos e hook por feature; `pnpm check` e aceite manual Chrome/Edge confirmados pelo proprietário.
- [x] [R07 — Store offline](07-store-offline.md): persistência/retenção, reconciliação e fila separadas, com facade e transação IndexedDB preservadas.

30/10/2026 — R02 concluída: `pnpm check` (61 testes/builds), `pnpm test:issues-integration` e links passaram. Próxima: R03.

30/10/2026 — R03 concluída: `pnpm check` (68 testes/builds), `pnpm test:issues-integration`, `pnpm test:parks-integration` e `pnpm test:workspaces-integration` passaram. Próxima: R04.

30/10/2026 — R04 concluída: `pnpm check` (71 testes/builds) e integrações auth/workspaces/issues/parks passaram. Próxima: R05.

30/10/2026 — R05 concluída: `pnpm check` (76 testes/builds), integrações issues/parks aprovadas. Policies fora da orquestração SQL; hash canônico comum preservando vetores de receipt.

30/10/2026 — R06 concluída: `pnpm check` (81 testes/builds) aprovado; proprietário confirmou validação funcional pós-refactor em Chrome/Edge, cargos e estados. Próxima: R07.

30/10/2026 — R07 concluída: `pnpm check` (81 testes/builds) e provas offline (27 testes direcionados) passaram. Fachada, DB v2, export v1 e commit IndexedDB atômico preservados. Próxima: R08.

30/10/2026 — R08 e slice 09 concluídas: `pnpm check` (81 testes/builds) e integrações auth, workspaces, parks e issues passaram em bancos descartáveis. Matriz A01–A13 fechada em [baseline R01](baseline-r01.md). A12 registra como melhoria futura E2E browser automatizado; o aceite Chrome/Edge é confirmação manual do proprietário. Produção, dispositivos móveis, quota/eviction física e pentest não foram declarados.

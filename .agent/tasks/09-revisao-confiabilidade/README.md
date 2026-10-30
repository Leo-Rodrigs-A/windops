# Slice 09 — Revisão técnica e confiabilidade

## Status

Em andamento; R01 concluída em 30/10/2026. R01A é a próxima execução. Planejada originalmente em 30/10/2026 a pedido do proprietário, usando a análise SOLID fornecida como guia e inspeção do repositório atual. Não representa certificação de aplicação “100%” nem entrega de produção.

- [ ] Slice concluída

## Resultado esperado

Reduzir acoplamento e responsabilidades acumuladas, corrigir defeitos demonstrados e tornar os fluxos críticos verificáveis sem alterar contratos ou perder garantias de segurança e persistência. Conclusão exige evidências por fluxo, e não somente arquivos menores ou checks verdes.

## Base e limites da análise

Inspeção estática confirmou README descrevendo uma fundação já superada, factory concreta de notificações como default em audit/service.ts, transações repetidas em issues/parks/workspaces e concentração de frontend em pages e store offline. Contagens de linhas e problemas do zip são hipóteses a revalidar em R01, não uma auditoria completa do estado atual.

Não considerar automaticamente defeitos: composição explícita em app.ts, ausência de herança, uso direto de PostgreSQL ou quantidade de testes unitários. Testes de banco continuam necessários para locks, autorização transacional, constraints e idempotência. Não criar framework de módulos, repository genérico, máquina de estados genérica ou novas dependências sem ganho demonstrado.

## Dependências

Ler [arquitetura](../../architeture.md), [memória](../../memory.md) e [convenção](../README.md). R01 pode começar com Q05 aberta, registrando suas lacunas. Refactors de comportamento começam somente após o aceite Q05, ou após resolver explicitamente seus bloqueios no escopo de R01 sem marcar ensaios indisponíveis como aprovados. Slices 01–07 fornecem a base de regressão, não evidência automática desta entrega.

## Sequência e detalhamento progressivo

Apenas R01/R02 possuem plano detalhado nesta preparação. Antes de iniciar cada etapa seguinte, criar seu arquivo executável com resultados da anterior, arquivos afetados, falhas e testes necessários.

| Etapa | Entrega planejada                                                                                                                                                                  | Dependência                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| R01   | [Auditoria reproduzível e baseline](01-auditoria-baseline.md)                                                                                                                      | Base atual; registrar e resolver dependência Q05 |
| R02   | [Documentação e composição da auditoria](02-documentacao-composicao.md)                                                                                                            | R01; Q05 para alteração de fonte                 |
| R03   | Transações e erros: extrair executor pequeno, preservar locks/rollback e traduzir erros no domínio; helpers HTTP só onde contratos coincidirem                                     | R02                                              |
| R04   | Workspaces: separar autorização, membros e convites; consumidores dependem da menor interface necessária; manter exports públicos compatíveis durante migração                     | R03                                              |
| R05   | Issues: separar políticas puras, orquestração e SQL; comandos explícitos e tabela de regras somente se tornar invariantes mais legíveis; repositório interno de escopo demonstrado | R04                                              |
| R06   | Front por feature: começar issues, extrair consultas/ações/componentes, depois equipe e parques; manter primitives Shadcn compartilhadas                                           | R05                                              |
| R07   | Store offline: separar persistência, projeção e fila por responsabilidade sem dividir a atomicidade; preservar API/fachada e journal existente                                     | R06                                              |
| R08   | Revisão funcional, segurança e aceite integrado final; encerrar pendências ou documentar exclusões aceitas com destino                                                             | R07                                              |

R01 concluída; demais etapas pendentes. Ajustar recortes depois da auditoria, sem expandir automaticamente para todo o backlog.

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

- [ ] Inventário por severidade com reprodução, evidência, responsável por etapa e teste de regressão quando necessário; nenhum defeito crítico/alto conhecido sem solução ou decisão explícita do proprietário.
- [ ] Auth/tenant: segunda etapa, vínculo verificado, acesso cross-tenant, revogação e último administrador preservados.
- [ ] Catálogo/issues: validação, concorrência, lifecycle, espera da hora, idempotência e auditoria/notificação atômicas preservadas.
- [ ] Consultas: filtros, cursor, respostas tardias, paginação e ordenação corretos nas três listas; Q05 encerrada com suas evidências próprias.
- [ ] Offline: perda de rede, reabertura, ACK perdido, retry/conflito, quota simulada, poda, exportação e partição preservados com dados anteriores ao refactor.
- [ ] PWA/dev: alternância Preview/Vite, worker antigo, atualização com fila pendente, hooks e HMR verificados em navegador; correção anterior não é considerada validada visualmente por build.
- [ ] Interface: duas contas/cargos, estados vazio/carregando/erro/parcial, teclado/foco, temas e larguras responsivas; confirmação manual separada de automação.
- [ ] Documentação corresponde ao código; limites e instruções de operação reproduzíveis, links válidos.
- [ ] pnpm check e integrações apropriadas passaram; regressões corrigidas, recursos de teste encerrados e dados operacionais preservados.

## Estratégia de verificação

Cada refactor deve conservar uma baseline e adicionar testes de comportamento nas fronteiras alteradas. Políticas puras recebem testes unitários de decisões/limites; SQL, transações e concorrência continuam em PostgreSQL descartável. Modularizar scripts de integração se ajudar diagnóstico, sem retirar cenários para acelerar artificialmente. R08 executa pnpm check e integrações auth/workspaces/parks/issues; mudanças de infraestrutura/schema exigem também checks de instalação, upgrade, restore e privilégios pertinentes. Não repetir checks sem mudança ou dúvida que justifique.

## Exclusões e limites

Sem novas funcionalidades, deploy, provisionamento externo, troca de banco/bibliotecas, redesenho visual ou migração geral de schema. Validação física Android/iPhone, quota/evicção real, HTTPS e recuperação em produção permanecem na etapa 11. Segurança aqui é revisão e regressão do escopo conhecido, não pentest/certificação. Pendências impeditivas de aceite não podem ser transferidas para produção apenas para fechar a slice.

## Evidências

30/10/2026 — Slice planejada; análise confrontada parcialmente com fontes locais. Nenhuma refatoração implementada por este planejamento. Evidências de execução serão acrescentadas por task; testes anteriores não fecham esta slice.

Verificação documental: três documentos novos e 5 links locais conferidos; git diff --check aprovado. Nenhuma fonte alterada nesta preparação; pnpm check e integrações não executados para o planejamento.


Atualização de dependência — 30/10/2026: Q05 e slice 08 concluídas com aceite funcional do proprietário em Chrome/Edge (admin/técnico) e checks registrados. O bloqueio Q05 mencionado no planejamento original está resolvido. R01 é a próxima execução; nenhuma task R foi implementada por este encerramento.


## Execução R01

- [x] R01 — baseline e inventário concluídos.
- [ ] [R01A — Sanitização dos logs HTTP](01a-sanitizacao-logs.md): achado alto A01, executar antes de R02.

[Inventário R01](baseline-r01.md) registra checks/integrações aprovados e aceite da alternância Preview/Vite pelo proprietário. Nenhuma refatoração entregue; A01 bloqueia encerramento da slice. Ordem revisada: R01A → R02 → R03–R08.

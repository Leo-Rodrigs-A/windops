# Q03 — Projeção e cache local de histórico

## Status

Planejada.

- [ ] Task concluída

## Objetivo

Unificar a seleção local com as regras de consulta e limitar histórico armazenado, preservando trabalho não sincronizado e compatibilidade com o journal instalado.

## Escopo e exclusões

Seletores, reconciliação e retenção no armazenamento existente. Não criar outro banco de fila, limpar dados para resolver incompatibilidade nem replicar todo o histórico. Arquivados continuam online.

## Estado atual

`recordServerIssuePage` persiste projeções, enquanto `pruneReplicaCache` atua sobre linhas inativas da réplica. Helpers da página tratam `serverActive=false` como conclusão. Home pode sinalizar `completeActiveSnapshot` quando recebe a última página isolada. Esses caminhos precisam de correção e testes específicos, sem substituir o sender já validado.

## Dependências

[Q01](01-regras-consulta.md) e [Q02](02-api-consultas.md).

## Plano

- [ ] Extrair apenas a lógica necessária para selecionar e ordenar projeções por lista/P/T, com precedência Q01. Incluir timestamp de ordenação adequado sem usar relógio local como autorização.
- [ ] Remover a inferência de conclusão baseada somente em saída do shape. Usar estado/revisão/ACK conhecidos; arquivo não entra no Histórico de concluídas. Preservar pendência quando a causa da saída ainda for desconhecida.
- [ ] Impedir que uma página HTTP, especialmente filtrada ou final, marque outras issues como inativas. Deixar comprovação de snapshot para o percurso autorizado completo da réplica, preservando checkpoints existentes.
- [ ] Fazer consulta remota e overlay reagirem ao journal: conclusão pendente prevalece sobre versão antiga em andamento; ACK e tombstone não apagam relato nem duplicam resultado. Reabertura e reativação com revisão nova removem entradas históricas obsoletas quando observadas.
- [ ] Aplicar retenção também às projeções de histórico recebidas pela API, sem exigir que exista linha de réplica correspondente. Reutilizar limites de 250 issues/1.000 eventos inativos; não podar dados ativos nem dependências de comandos pendentes, em envio, aguardando sessão/elegibilidade/réplica, rejeitados ou em conflito.
- [ ] Manter projeção, identidade mínima, referências, metadados e exclusões consistentes na transação local. Não limpar recibos/cadeias de comandos como efeito colateral da poda. Cache não deve permitir reintroduzir revisão antiga sobre uma nova conhecida.
- [ ] Preservar formato existente quando possível; se houver evolução local, ler registros antigos sem apagar/recriar partição. Distinguir página consultada de cobertura completa; falta em página filtrada não prova exclusão.
- [ ] Testar quota/falha de commit, fechamento/reabertura do store e retry; falha ao guardar cache pode permitir mostrar resposta online, mas não pode alegar persistência nem perder fila. Rodar `pnpm check`.

## Contratos e dados afetados

`local-issue-store.ts`, seletores extraídos de `issues-pages.tsx` e testes de store/réplica/sender pertinentes. Partição continua por account/workspace. Sem segredo/token ou e-mail adicionado a metadados; sem migration PostgreSQL.

## Testes e aceite

Cobrir histórico obtido só via API acima do limite, mistura API/Electric, issue arquivada, tombstone sem causa, revisão atrasada e concluída local. Reiniciar o store após poda e após ACK; conferir comandos, texto, relato, referências e exportação intactos. Incluir snapshot paginado que antes marcaria registros alheios como inativos e leitura de journal anterior sem reset.

## Evidências

28/10/2026 — Lacunas identificadas por leitura de código; testes de regressão e implementação ainda não executados. Retenção declarada nesta task é objetivo, não comportamento já comprovado.

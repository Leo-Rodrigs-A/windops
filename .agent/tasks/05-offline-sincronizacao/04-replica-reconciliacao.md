# S04 — Réplica local e reconciliação

## Status

Planejada

- [ ] Task concluída

## Objetivo

Construir consultas locais consistentes sem apagar alterações pendentes quando a réplica mudar.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

## Dependências

S02 e S03 concluídas.

## Escopo e exclusões

Leitura sincronizada, retomada e retenção; não substituir regras de autorização por confiança no cache.

## Plano de implementação

- [ ] Integrar coleções TanStack e cliente Electric ao adaptador comprovado, sempre pelo proxy e dentro da partição ativa. Persistir dados e checkpoint de forma recuperável para não pular alterações após crash.
- [ ] Preparar catálogo e issues ativas com logs/dependências necessários. Exibir prontidão offline somente após snapshot inicial completo e durável, não após primeira página ou simples conexão.
- [ ] Manter réplica do servidor separada de intenções locais; reaplicar projeção pendente deterministicamente e sinalizar concorrência. Uma atualização remota não apaga texto nem resolve conflito por último timestamp.
- [ ] Reconciliar ACK do comando e réplica em qualquer ordem: manter resposta confirmada até observar revisão correspondente ou posterior, sem regressão visual e sem duplicar evento. Não exigir publicação de recibos privados para isso.
- [ ] Tratar tombstones, resets/expiração de handle, resnapshot e issue que sai do conjunto ativo após conclusão. Preservar logs, localização e conteúdo dependentes de fila; não interpretar saída de shape como exclusão física.
- [ ] Permitir Histórico online e concluídas já disponíveis em cache, incluindo conclusão local pendente; distinguir ausência de cache de lista vazia. Definir retenção/limpeza limitada para histórico sem pendências.
- [ ] Manter referências legíveis de equipamento arquivado e ator revogado sem replicar dados privados de identidade. Cache incompleto não pode inventar nomes ou disponibilidade do equipamento.

## Contratos e dados afetados

Coleções locais de issues/eventos/catálogo e metadados de checkpoint/ACK. Servidor segue dono de revision e de timestamps autoritativos.

## Testes e aceite

- [ ] Intercalar ACK antes/depois da réplica, revisão remota mais nova e perda de resposta; nenhuma regressão nem duplicação.
- [ ] Concluir issue que sai do shape enquanto outro comando depende dela; preservar registros e mostrar conflito quando aplicável.
- [ ] Reiniciar durante snapshot, delta e resnapshot; recuperação não pula dados nem mistura partições; cache parcial não recebe selo de pronto.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

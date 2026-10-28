# Slice 06 — Ciclo de vida das issues

## Status

Em andamento desde 28/10/2026.

- [ ] Slice concluída

## Resultado esperado

Admins reabrem issues com confirmação e auditoria. Criadores arquivam suas Pendentes; admins arquivam Pendentes/Em andamento e reativam como Pendente. Arquivadas têm consulta própria. Nenhuma transição apaga logs ou pendências locais de outro dispositivo.

## Análise da base e prioridade

Slices 01–05 concluídas: identidade com segunda etapa, autorização tenant, equipe, catálogo/lifecycle de equipamentos, registro/atendimento/conclusão, journal IndexedDB, proxy Electric, reconciliação e PWA. Último commit observado: `11a5ff6`, encerramento da validação offline local; árvore limpa antes deste planejamento.

A inspeção de contratos, schema e serviço de issues confirma somente created/edited/started/returned/released/completed, três estados e ausência de arquivo/reabertura. O módulo notifications ainda é um entrypoint vazio. Por isso, completar a etapa 08 do roadmap é o próximo incremento coerente antes da etapa 09, que depende dos eventos do ciclo completo.

O ponto crítico é preservar pendências quando arquivo/conclusão removem uma issue do shape e serializar transições com edição, atendimento e lifecycle de equipamentos.

## Dependências e limites

- Base: [slice 04](../04-registro-atendimento/README.md) e [slice 05](../05-offline-sincronizacao/README.md). Regras em [memória](../../memory.md) e [arquitetura](../../architeture.md).
- Recorte da [etapa 08](<../00 - roadmap/08-lifecycle.md>). Conclusão e relato offline já existem; ampliar apenas lifecycle faltante e consultas indispensáveis de Arquivadas.
- Decisão do proprietário: novas mutações são somente online; criador pode arquivar sua própria issue Pendente. Reabertura e reativação exigem parque e turbina ativos. Não adicionar novos comandos duráveis offline nesta slice.
- Preservar monólito modular, serviços públicos, autorização por tenant, idempotência e eventos append-only. Nenhum Electric público ou filtro arbitrário.
- Sem campainha/Web Push, exclusão global de conta, filtros avançados, deploy ou decomposição de todo o backlog. Eventos novos deixam base para notificações futuras, sem alegar outbox de entrega implementada.
- Design externo somente como referência confirmada. Planejamento não define layout final.
- S09 é evidência browser/desktop; Android/iPhone/HTTPS e quota/evicção reais continuam na produção. Não repetir a matriz já aprovada sem mudança que justifique regressão.

## Ordem e dependências

Executar L01→L02→L03→L04→L05→L06. Questões de produto da L01 bloqueiam somente implementação dependente delas.

- [x] [L01 — Contratos e invariantes](01-contratos-invariantes.md) — depende de Slices 04 e 05.
- [ ] [L02 — Persistência e auditoria](02-schema-auditoria.md) — depende de L01.
- [ ] [L03 — Comandos de ciclo de vida](03-comandos-transacionais.md) — depende de L01 e L02.
- [ ] [L04 — Consultas e reconciliação](04-consultas-replica.md) — depende de L02 e L03.
- [ ] [L05 — Interfaces e confirmações](05-interface.md) — depende de L03 e L04.
- [ ] [L06 — Validação integrada e encerramento](06-validacao-integrada.md) — depende de L01–L05.

## Aceite da slice

- [ ] Matriz de permissões e transições respeitada, inclusive Concluída não arquivável.
- [ ] Reabertura limpa relato; reativação remove atendimento; logs permanecem íntegros.
- [ ] Retry não duplica evento; revogação, revisão e concorrência são verificadas no servidor.
- [ ] Arquivadas consultáveis; saída/retorno da réplica não perde fila ou texto local.
- [ ] Interface confirmada, integrações aprovadas e limitações documentadas.

## Evidência da L01

28/10/2026: revisados arquitetura/memória, índices e evidências das slices anteriores, roadmap 08–11, histórico Git, contratos/schema/serviço de issues, módulo notifications e pontos de reconciliação. Seis tasks preparadas; nenhuma implementação, migração ou teste da aplicação executado. Verificação documental registrada no índice geral.

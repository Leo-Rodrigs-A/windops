# Slice 06 — Ciclo de vida das issues

## Status

Em andamento desde 28/10/2026.

- [x] Slice concluída

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
- [x] [L02 — Persistência e auditoria](02-schema-auditoria.md) — depende de L01.
- [x] [L03 — Comandos de ciclo de vida](03-comandos-transacionais.md) — depende de L01 e L02.
- [x] [L04 — Consultas e reconciliação](04-consultas-replica.md) — depende de L02 e L03.
- [x] [L05 — Interfaces e confirmações](05-interface.md) — concluída; validações manuais finais reportadas pelo usuário.
- [x] [L06 — Validação integrada e encerramento](06-validacao-integrada.md) — depende de L01–L05.

## Aceite da slice

- [x] Matriz de permissões e transições respeitada, inclusive Concluída não arquivável.
- [x] Reabertura limpa relato; reativação remove atendimento; logs permanecem íntegros.
- [x] Retry não duplica evento; revogação, revisão e concorrência são verificadas no servidor.
- [x] Arquivadas consultáveis; saída/retorno da réplica não perde fila ou texto local.
- [x] Interface confirmada, integrações aprovadas e limitações documentadas.

## Evidências da slice

28/10/2026 — L04 concluída com validação automatizada e integração PostgreSQL. O proprietário transferiu o percurso manual com Electric e recuperação de conflito para a interface da L05, pois a execução pelo Scalar é lenta.

28/10/2026 — L05: adicionada a tela Arquivados com pesquisa e paginação, ações de reativação/reabertura/arquivo com confirmação, mensagens de conexão e integração pelo cliente API. `pnpm check` passou (lint, typecheck, 54 testes e builds). Conferido WindOps.pen: há referências de lista mobile e componentes, sem tela Arquivados dedicada; o documento não foi alterado. No browser admin foram conferidos tema claro/escuro, estados vazios desktop/mobile, foco inicial, ciclo de Tab, cancelamento/Escape, restauração de foco e árvore de acessibilidade. Foi corrigida a restauração de foco, além da navegação inferior mobile ausente e do rótulo inglês. A issue de teste foi reativada e conferida em Pendentes, onde permanece. A simulação offline validou a mensagem e a ocultação da ação, mas sem cortar a rede real. O usuário reportou que os percursos manuais finais (timeout/retry, cache, pendência local, leitor de tela e preservação de conclusão offline/Cloud) estão funcionando. A validação de Electric e conflito real continua na L06.

28/10/2026 — L03 concluída: comandos transacionais, autorização, idempotência e locks validados na integração PostgreSQL; `pnpm test:issues-integration` e `pnpm check` passaram. Ver [L03](03-comandos-transacionais.md).

28/10/2026 — L06 concluída: `pnpm check` e integrações auth/workspaces/parks/issues passaram; ciclo completo, equipamento inativo, revogação, espera de uma hora, conflitos e corridas verificados em PostgreSQL descartável. Testes offline cobrem restart/reconciliação e replay de resposta perdida sem duplicar evento; proprietário confirmou o percurso funcional no front. Containers PostgreSQL/Electric/Mailpit saudáveis. Sem mudança de fonte/schema/infra. Limites de dispositivos móveis, HTTPS em aparelho e quota/evicção física permanecem na produção. Ver [L06](06-validacao-integrada.md).

28/10/2026 — L02: migration 0011, espelho Electric e validação descartável de instalação/upgrade/restart/grants aprovados. 53 testes e `pnpm check` passaram. Ver [L02](02-schema-auditoria.md).

## Evidência da L01

28/10/2026: revisados arquitetura/memória, índices e evidências das slices anteriores, roadmap 08–11, histórico Git, contratos/schema/serviço de issues, módulo notifications e pontos de reconciliação. Seis tasks preparadas; nenhuma implementação, migração ou teste da aplicação executado. Verificação documental registrada no índice geral.

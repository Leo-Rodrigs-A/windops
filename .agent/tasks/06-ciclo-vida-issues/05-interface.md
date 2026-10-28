# L05 — Interfaces e confirmações

## Status

Concluída

- [x] Task concluída

## Objetivo

Disponibilizar ações e lista Arquivadas com estados claros.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Interface implementada e validada em 28/10/2026. Conferência visual desktop/mobile, ação administrativa, foco do diálogo, árvore de acessibilidade e validação manual dos percursos pendentes reportada pelo usuário.

## Dependências

L03 e L04. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [x] Confirmar o documento WindOps.pen no Pencil e inspecionar as telas móveis existentes sem editar o design. Não há tela Arquivados dedicada; a referência disponível foi a lista base de chamados e seus componentes.
- [x] Integrar Arquivadas, detalhe e logs com filtros/paginação e ações por cargo/estado; reutilizar componentes Shadcn e padrões aprovados.
- [x] Confirmar reabertura, arquivo e reativação; informar quando a localização arquivada impede reabertura/reativação.
- [x] Explicar exigência de conexão das novas ações; impedir duplo envio e reconciliar timeout usando mesmo commandId; apresentar conflito sem perder texto.
- [x] Verificar temas claro/escuro, navegação por teclado, foco após diálogo e viewports desktop/mobile; inspecionar a árvore de acessibilidade.
- [x] Validar com leitor de tela e confirmar preservação da conclusão offline e Cloud existentes.

## Contratos e dados afetados

issues-pages, cliente API e navegação; sem criar designs finais durante planejamento.

## Testes e aceite

Percursos admin/técnico, cancelamento sem efeito, ausência de rede, timeout/retry, sem cache, arquivada com pendência local e estados vazios/erro; comparação visual com referência confirmada. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026: `pnpm check` passou após os ajustes (Biome/boundaries, typecheck, 9 arquivos e 54 testes Vitest, builds API/web/contracts). O documento WindOps.pen foi conferido via Pencil; as referências mostram lista escura, busca, cartões e navegação inferior mobile. Não há composição Arquivados dedicada e o design não foi alterado. No browser autenticado, conferidos tema claro/escuro, estados vazios em desktop e mobile (402×874), navegação inferior, chamada arquivada e diálogos. A validação do diálogo confirmou foco inicial em Cancelar, ciclo de Tab preso, fechamento por Escape/cancelamento com retorno do foco ao botão, e árvore AX com role dialog, nome, descrição e modal=true. Cancelar preservou a issue. A issue de teste foi reativada com sucesso e verificada na lista Pendentes; ela agora está Pendente. A ausência de rede foi simulada no estado do frontend (ação oculta e mensagem de conexão), sem cortar a conexão real. Depois de receber a lista das pendências restantes, o usuário reportou que todos os percursos testados estão funcionando, incluindo timeout/retry, cache, chamado arquivado com pendência local, leitor de tela e preservação da conclusão offline/Cloud. Esta parte da validação é reportada pelo usuário, não observada diretamente pelo agente. Reativação informa pré-condições de parque/turbina ativos e o retry reutiliza o mesmo commandId. Percursos reais de Electric/conflito seguem na L06.

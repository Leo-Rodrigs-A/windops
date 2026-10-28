# L05 — Interfaces e confirmações

## Status

Planejada

- [ ] Task concluída

## Objetivo

Disponibilizar ações e lista Arquivadas com estados claros.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Base das slices 04/05 implementada; esta task ainda não foi executada. Diagnóstico e regras no índice da slice.

## Dependências

L03 e L04. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [ ] Reconfirmar documento Pencil pretendido pelo MCP Windows antes de usá-lo; inspecionar referências disponíveis sem editar designs. Se faltar referência, obter composição autorizada antes do layout final.
- [ ] Integrar Arquivadas, detalhe e logs com filtros/paginação e ações por cargo/estado; reutilizar componentes Shadcn e padrões aprovados.
- [ ] Confirmar reabertura, arquivo e reativação; informar quando a localização arquivada impede reabertura/reativação.
- [ ] Explicar exigência de conexão das novas ações; impedir duplo envio e reconciliar timeout usando mesmo commandId; apresentar conflito sem perder texto.
- [ ] Verificar temas, teclado, foco após diálogo, leitor de tela e viewports desktop/mobile; preservar conclusão offline e Cloud existentes.

## Contratos e dados afetados

issues-pages, cliente API e navegação; sem criar designs finais durante planejamento.

## Testes e aceite

Percursos admin/técnico, cancelamento sem efeito, ausência de rede, timeout/retry, sem cache, arquivada com pendência local e estados vazios/erro; comparação visual com referência confirmada. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026: planejamento documental. Implementação e testes desta task não executados.

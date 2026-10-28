# L04 — Consultas e reconciliação

## Status

Planejada

- [ ] Task concluída

## Objetivo

Integrar Arquivadas e mudanças de lifecycle à leitura local sem perder pendências.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Base das slices 04/05 implementada; esta task ainda não foi executada. Diagnóstico e regras no índice da slice.

## Dependências

L02 e L03. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [ ] Adicionar consulta paginada de Arquivadas com filtros parque/turbina, ordenação recente primeiro e detalhe/log autorizado; separar de abertas e concluídas.
- [ ] Excluir arquivadas dos shapes ativos no servidor; reabertas/reativadas voltam à réplica. Nunca aceitar table/where do cliente.
- [ ] Tratar remoção do shape sem apagar comando pendente, texto ou dependências; após conflito buscar estado autorizado online e oferecer recuperação existente.
- [ ] Evitar que réplica atrasada reverta ACK/revisão ou que cache antigo reapresente issue arquivada como editável; verificar reinício e troca de conta.
- [ ] Manter Arquivadas online ou cache explicitamente disponível, sem replicar todo histórico; testar cliente anterior e upgrade IndexedDB se houver mudança de formato.

## Contratos e dados afetados

Contratos de consulta, proxy, espelhos, réplica/journal e retenção; comandos offline existentes preservados.

## Testes e aceite

Electric real: saída/retorno do shape, evento, ACK antes/depois da réplica; fila pendente em outra sessão, restart, revisão obsoleta, isolamento e falha de armazenamento. Rodar `pnpm check` para alterações de fonte.

## Evidências

28/10/2026: planejamento documental. Implementação e testes desta task não executados.

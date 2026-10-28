# L04 — Consultas e reconciliação

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Integrar Arquivadas e mudanças de lifecycle à leitura local sem perder pendências.

## Escopo e exclusões

Recorte da [slice 06](README.md). Sem notificações, deploy ou expansão das ações offline.

## Estado atual

Consultas e reconciliação implementadas; proprietário transferiu a validação manual de saída/retorno do Electric e recuperação de conflito para o percurso da interface na L05.

## Dependências

L02 e L03. Ler arquitetura, memória e decisões de L01 antes de implementar.

## Plano

- [x] Adicionar consulta paginada de Arquivadas com filtros parque/turbina, ordenação recente primeiro e detalhe/log autorizado; separar de abertas e concluídas.
- [x] Excluir arquivadas dos shapes ativos no servidor; reabertas/reativadas voltam à réplica. Nunca aceitar table/where do cliente.
- [x] Tratar remoção do shape sem apagar comando pendente, texto ou dependências; após conflito buscar estado autorizado online e oferecer recuperação existente.
- [x] Evitar que réplica atrasada reverta ACK/revisão ou que cache antigo reapresente issue arquivada como editável; cobrir reinício e resposta atrasada nos testes locais.
- [x] Manter Arquivadas disponíveis online, sem replicar todo histórico; campo opcional mantém compatibilidade com journal antigo.

## Contratos e dados afetados

Contratos de consulta, proxy, espelhos, réplica/journal e retenção; comandos offline existentes preservados.

## Testes e aceite

`pnpm check` e integração PostgreSQL aprovados. A validação manual da saída/retorno do shape e recuperação de conflito será feita na L05 pela interface, conforme decisão do proprietário; não usar Scalar para esse percurso.

## Evidências

28/10/2026: planejamento documental. Implementação e testes desta task não executados.

28/10/2026: contrato status=archived; consultas tenant com filtros parque/turbina e cursor por archived_at/id descendentes; listas usuais excluem arquivadas. Referências de equipamento não contam arquivadas como abertas. Journal preserva archivedAt, calcula atividade pelo estado, rejeita novas mutações em arquivo conhecido e ignora respostas mais antigas que ACK/servidor. Campo opcional mantém leitura de journals anteriores sem upgrade destrutivo. Teste de restart IndexedDB cobre pendência/conflito, arquivo, resposta atrasada e reativação. `pnpm check` passou (54 testes); integração PostgreSQL de issues passou. Por decisão do proprietário, validação manual com Electric real e recuperação online de conflito foi transferida para o fluxo de interface da L05, pois fazê-la pelo Scalar é lento.

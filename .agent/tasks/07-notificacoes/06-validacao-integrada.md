# N06 — Validação integrada e encerramento

## Status

Planejada

- [ ] Task concluída

## Objetivo

Comprovar os fluxos e registrar limites de entrega e dispositivos.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Planejamento; nenhuma implementação desta task executada. Diagnóstico da base no índice da slice.

## Dependências

N01–N05.

## Plano

- [ ] Executar pnpm check e integrações afetadas, migration/upgrade/restore/grants em PostgreSQL descartável conforme mudanças; registrar comandos e resultados.
- [ ] Executar matriz evento/canal/destinatário com duas contas e dois tenants, autor excluído, membros revogados, leitura individual e múltiplas subscrições.
- [ ] Exercitar offline/lote definido em N01, restart antes/depois do commit, retry e falha pós-aceite externo; verificar contagens de eventos, avisos e intenções.
- [ ] Validar campainha no front e push real em navegador compatível; mock não fecha aceite de entrega real. Registrar separadamente envio aceito, exibição e clique.
- [ ] Manter Android/iPhone instalado, HTTPS em aparelho e quota/evicção como validações de produção já acordadas; não declarar suporte sem evidência nem repetir bateria offline aceita sem risco novo.
- [ ] Atualizar índice, memória, arquitetura e roadmap somente conforme evidências. Propor commit em português e manter pendências técnicas explícitas.

## Contratos e dados afetados

Integrações, evidências e documentação; nenhuma implantação de produção implícita.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026: task planejada; implementação e testes de aplicação não executados.

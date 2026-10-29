# N06 — Validação integrada e encerramento

## Status

- Concluída em 28/10/2026.

- [x] Task concluída

## Objetivo

Comprovar os fluxos e registrar limites de entrega e dispositivos.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Validação integrada concluída em PostgreSQL descartável e pelo percurso real de front reportado pelo proprietário. Os limites de dispositivos móveis e produção seguem no roadmap 11.

## Dependências

N01–N05.

## Plano

- [x] Executar pnpm check e integrações afetadas, migration/upgrade/restore/grants em PostgreSQL descartável conforme mudanças; registrar comandos e resultados.
- [x] Executar matriz evento/canal/destinatário com duas contas e dois tenants, autor excluído, membros revogados, leitura individual e múltiplas subscrições.
- [x] Exercitar offline/lote definido em N01, restart antes/depois do commit, retry e falha pós-aceite externo; verificar contagens de eventos, avisos e intenções.
- [x] Validar campainha no front e push real em navegador compatível; mock não fecha aceite de entrega real. Registrar separadamente envio aceito, exibição e clique.
- [x] Manter Android/iPhone instalado, HTTPS em aparelho e quota/evicção como validações de produção já acordadas; não declarar suporte sem evidência nem repetir bateria offline aceita sem risco novo.
- [x] Atualizar índice, memória, arquitetura e roadmap somente conforme evidências. Propor commit em português e manter pendências técnicas explícitas.

## Contratos e dados afetados

Integrações, evidências e documentação; nenhuma implantação de produção implícita.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026 — `pnpm check` passou: Biome/boundaries, typecheck, 54 testes Vitest e builds.

28/10/2026 — Passaram `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, `pnpm test:parks-integration` e `pnpm test:issues-integration`, todos em PostgreSQL descartável. A integração issues verificou rollback antes do commit e replay idempotente após reiniciar o serviço. A matriz de notificações verificou dois tenants, ator excluído, membro revogado, isolamento de aviso, leitura individual/idempotente, paginação, duas subscrições por destinatário e supressão do push pendente quando a conclusão chega antes do claim. O worker recuperou lease, retry após `503` e resposta perdida após aceite externo: a intenção/avisos permanecem únicos no banco, mas o retry pode chamar o provedor novamente (at-least-once). N01 não requer transação de lote; o teste cobre a ordem dos eventos sincronizados antes do claim.

28/10/2026 — `pnpm db:empty-check` passou: instalação vazia, migrações idempotentes, restart, grants e upgrade desde 0004 preservando workspace/identidade/catálogo. `pnpm db:restore-check` passou com 13 migrations e schema de issues restaurado. N02/N04 já registram validações de grants e worker em instalação/upgrade/restore.

28/10/2026 — N05 foi validada pelo proprietário em Preview HTTPS temporário: a API aceitou a subscrição (`PUT 200`), o proprietário confirmou push exibido e confirmou os cenários de interface/PWA, acessibilidade, temas, viewports, atualização/offline, partição e clique. Isso distingue a entrega real confirmada das simulações de worker acima. Android/iPhone instalados, quota/evicção e HTTPS de produção permanecem para o roadmap 11; nenhum suporte móvel foi declarado.

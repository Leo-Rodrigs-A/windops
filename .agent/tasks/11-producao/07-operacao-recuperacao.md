# D07 — Backups, recuperação e monitoramento

## Status

Planejada

- [ ] Task concluída

## Responsável

Codex; proprietário confirma metas e recebe alertas.

## Objetivo

Tornar falhas detectáveis e recuperação executável antes de uso real.

## Escopo e exclusões

Políticas de backup, alertas e runbooks; nenhuma restauração destrutiva sobre produção para testar.

## Estado atual

Há verificador local de restore e rollback de imagens no script; não há evidência de backup/restore ou alertas operacionais no destino.

## Dependências

D05 e D06 para ensaiar recuperação de release.

## Plano

- [ ] Configurar backup automático/PITR conforme plano escolhido, retenção, acesso restrito, armazenamento fora da máquina quando aplicável e alertas de falha; documentar chaves necessárias sem copiá-las.
- [ ] Restaurar backup do schema atual em banco isolado, verificar identidade/memberships, catálogo, issues/eventos, receipts e outbox; registrar tempos e perda de dados frente a RPO/RTO de D02.
- [ ] Ensaiar retorno para release anterior compatível e recuperação sem release anterior; após restore, tratar slots/replicação, resnapshot e reconciliação de clientes/fila, sem apagar pendências locais ou duplicar eventos.
- [ ] Configurar monitoramento externo HTTPS/readiness, certificados, erros API, disco/memória, WAL/slots, falhas de sync, fila/entrega de e-mail e push; validar alerta sintético chegando ao responsável.
- [ ] Documentar playbooks de indisponibilidade, segredo comprometido/rotação, falha de migration, disco cheio e revogação de acesso; definir responsáveis e manutenção. Backups do servidor não incluem comandos ainda apenas no aparelho.
- [ ] Definir protocolo de medição para carregamento <2s e disponibilidade alvo 99,5%, com cenário/rede/dispositivo, janela, métrica e exclusões. Registrar resultados sem declarar SLA garantido; atualizar README/runbook.

## Contratos e dados afetados

Políticas de backup, alertas e runbooks; nenhuma restauração destrutiva sobre produção para testar.

## Testes e aceite

Restore e recuperação realmente exercitados, tempos registrados e alerta recebido pelo proprietário. Se metas não forem atingidas, registrar correção/decisão antes da liberação.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

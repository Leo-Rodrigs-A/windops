# D07 — Backups, recuperação e monitoramento

## Status

- Concluída em 08/11/2026

- [x] Task concluída

## Responsável

Codex; proprietário confirma metas e recebe alertas.

## Objetivo

Tornar falhas detectáveis e recuperação executável antes de uso real.

## Escopo e exclusões

Políticas de backup, alertas e runbooks; nenhuma restauração destrutiva sobre produção para testar.

## Estado atual

Backup Hostinger de dois snapshots semanais, limites de recuperação e meta de RTO foram aceitos pelo proprietário em D02. O proprietário esclareceu que não houve restore do backup Hostinger: durante D05 ocorreu reboot da VPS e durante D06 ocorreu rollback das imagens após rejeição do release. Esses testes recuperam host/runtime e release, mas não exercitam backup semanal da VM nem restore do banco Neon. Procedimentos de resposta, protocolo de medição e cobertura de monitoramento estão documentados. Os monitores HTTPS estão ativos e o proprietário recebeu alerta de teste; indicadores de host e replicação ficam em revisão manual, sem alertas automáticos.

## Dependências

D05 e D06 para ensaiar recuperação de release.

## Plano

- [x] Registrar a política disponível e aceita: backup automático semanal Hostinger e janela de restauração Neon Free de até 6 horas, sem tratar janela como RPO garantido; RTO-alvo até 1 dia útil, sem SLA. Fonte: [D02](02-escolha-hospedagem.md).
- [x] Registrar que migrações e restauração do banco foram verificadas em bases descartáveis nas slices anteriores, por exemplo [F08](../01-fundacao/08-validacao-integrada.md) e [I08](../04-registro-atendimento/08-validacao-integrada.md); isso valida o procedimento da aplicação, não restauração dos backups de produção.
- [x] Registrar que o reboot ensaiado em D05 e o rollback de imagens rejeitadas em D06 são recuperações de infraestrutura/release, não restore de backup Hostinger ou Neon.
- [x] Verificar por captura e confirmação do proprietário que o backup automático semanal está ativo e há exatamente um ponto disponível, datado de 2026-11-08 06:20 (Brasil, 4,15 GB, Ubuntu 24.04 LTS; estimativa de restauração mostrada: 30 min). Nenhum restore foi iniciado.
- [x] Proprietário confirmou que a configuração Hostinger prevê dois snapshots por semana. A captura anterior mostrava um ponto disponível naquela data; não iniciar restore para conferir o segundo ponto. A janela Neon fica registrada como informação, sem teste de recuperação.
- [x] Conferir no console Neon a janela de histórico/PITR de 6 horas na branch `production`; a captura mostra um timestamp selecionado em 2026-11-08 14:23 America/Sao_Paulo e os botões Preview data/Restore. Isso confirma a janela exibida, não uma restauração nem validação dos dados.
- [x] Decisão do proprietário: retirar do escopo o teste de recuperação Neon. A janela PITR de seis horas fica registrada como informação do console; não criar branch de restore nem restaurar a branch `production`.
- [x] Ensaiar falha de pull antes do rollout e rollback automático de imagens após health failure, preservando a fila PWA pendente e sincronizando a issue uma única vez após reconexão. Evidência em [D06](06-ci-cd.md); isto não comprova compatibilidade de schema com release anterior.
- [x] Documentar recuperação quando ainda não há release anterior: corrigir o candidato e reaplicar SHA aprovado, sem tentar restaurar schema; o primeiro rollout e fluxo do helper estão registrados em [D06](06-ci-cd.md).
- [x] Decisão do proprietário: retirar do escopo D07 o ensaio de rollback de release anterior compatível com schema. O rollback D06 preservou uma fila pendente, mas não foi exercitado contra alteração de schema; não afirmar que essa compatibilidade foi validada.
- [x] Registrar verificações manuais de HTTPS, live/ready, portas públicas e retomada do slot após restart/reboot, já exercitadas em D05/D06; elas são verificações pontuais, não monitoramento contínuo.
- [x] Criar monitores HTTP(s) para `/` e `/api/health/live`; o proprietário forneceu a página pública de status: https://stats.uptimerobot.com/kwNQpc0mCF. Não sondar `/api/health/ready` continuamente.
- [x] Proprietário confirmou ambos os monitores `Up` e recebimento do alerta de teste.
- [x] Definir cobertura: UptimeRobot verifica HTTPS; renovação de certificado fica a cargo do Caddy, sem aviso antecipado de expiração; recursos VPS são revisados semanalmente no hPanel; saúde Electric/slot é conferida após retomadas, reboot e deploy, e sync durante uso normal. Alertas de recursos VPS/WAL/slots/sync não foram configurados; limites documentados em `docs/producao.md`. Proprietário confirmou recebimento do alerta de teste.
- [x] Documentar procedimento atual de deploy/health failure e limite de rollback (o script não reverte schema), além da recuperação da fila PWA observada em D06. Isso não equivale a um runbook integral de incidente.
- [x] Documentar playbooks para restore de banco/host, falha de migration, disco cheio, segredo comprometido/rotação e revogação de acesso; definir responsabilidades e preservar pendências locais. Backups do servidor não incluem comandos ainda apenas no aparelho. Ver seção de recuperação em [docs/producao.md](../../../docs/producao.md).
- [x] Definir protocolo para disponibilidade alvo 99,5% e carregamento <2s, incluindo cenário, dispositivos/redes, janela, métrica e exclusões; registrar que a medição real permanece pendente e não declarar SLA garantido. Ver seção de monitoramento em [docs/producao.md](../../../docs/producao.md).

## Contratos e dados afetados

Políticas de backup, alertas e runbooks; nenhuma restauração destrutiva sobre produção para testar.

## Testes e aceite

Configuração Hostinger de dois snapshots semanais e um ponto disponível registrados; reboot/rollback de release exercitados; runbooks, protocolo e política de monitoramento registrados; monitores HTTP(s) criados, status público divulgado e alerta recebido pelo proprietário. O proprietário retirou os testes de recuperação Neon e rollback compatível com schema do escopo; ambos permanecem documentados como não ensaiados.

## Evidências

Planejamento, auditoria, runbooks e política de monitoramento concluídos em 08/11/2026: proprietário esclareceu que não houve restore de backup Hostinger; os testes foram reboot da VPS em D05 e rollback de imagens rejeitado em D06. Capturas/confirmacão mostram exatamente um backup Hostinger disponível em 2026-11-08 06:20 (4,15 GB, Brasil, Ubuntu 24.04 LTS; restauração estimada em 30 min); proprietário confirmou que a configuração prevê dois snapshots por semana. Essa confirmação de configuração não altera a evidência histórica de um único ponto visível, e não se fará restore para verificar. Console Neon mostra janela PITR de seis horas em `production`; proprietário retirou o teste de recuperação Neon do escopo, sem branch de restore ou ação Restore. Proprietário também retirou do escopo D07 o ensaio de rollback compatível com schema; essa compatibilidade permanece não validada. Foram registrados política de backup/RTO, falha pré-rollout, verificações manuais, fila preservada, runbooks e protocolo SLO. Proprietário confirmou a criação dos dois monitores HTTPS, ambos `Up`, o recebimento do alerta de teste e forneceu a página pública https://stats.uptimerobot.com/kwNQpc0mCF. Cobertura adicional foi definida como revisão manual semanal dos recursos Hostinger e verificação de Electric/slot após retomada, reboot ou deploy, com confirmação de sync no uso normal; não há alertas automáticos para host/WAL/slot/sync nem aviso antecipado de expiração TLS. Não se exige restore de produção nem ensaio de rollback com schema.

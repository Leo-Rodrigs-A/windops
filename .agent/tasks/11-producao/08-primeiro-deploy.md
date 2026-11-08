# D08 — Primeiro deploy e bootstrap do piloto

## Status

- Concluída em 08/11/2026

- [x] Task concluída

## Responsável

Codex; proprietário identifica admin e acompanha login real.

## Objetivo

Publicar versão candidata no domínio real e preparar acesso inicial sem liberar uso operacional ainda.

## Escopo e exclusões

Ambiente de produção, bootstrap e registros de ensaio autorizados; sem importação automática do dev ou bypass de auth/tenant.

## Estado atual

Primeiro deploy no domínio real concluído; frontend, API e web respondem saudáveis. O proprietário confirmou que bootstrap e fluxos funcionais foram testados em produção e funcionaram em Android, iPhone e PWA no desktop. A task registra essa confirmação sem persistir dados pessoais, segredos, versões de aparelho ou números de métricas não fornecidos. Conta e dados de desenvolvimento não devem ser transportados por conveniência.

## Dependências

D05, D06, D07 e O04 da slice 10 concluída.

## Plano

- [x] Registrar digests ativos do primeiro deploy e confirmar API/web saudáveis, execução das migrações e HTTPS/readiness no destino.
- [x] Registrar SHA Git e runs CI/deploy associados aos digests ativos; variáveis de runtime permanecem apenas em secret stores/host. Evidência atualizada em D06 e `docs/producao.md`.
- [x] Associar ao release a política Hostinger de dois snapshots por semana, o ponto disponível observado e a janela informativa PITR Neon, sem tratá-los como restore exercitado. Por decisão do proprietário, restore Hostinger/Neon não é gate de D08; nenhum restore será executado em produção.
- [x] Verificar HTTPS público, API live/ready, origem web e portas internas não expostas; readiness consultou o Neon com sucesso.
- [x] Ativar Better Auth na API de produção após configurar `AUTH_ENABLED=true` e `BETTER_AUTH_SECRET` persistente; recriar apenas a API e confirmar `/api/auth/providers` com HTTP 200. Nenhum valor secreto foi registrado.
- [x] Proprietário confirmou testes em produção de cookies, proxy sync autenticado, isolamento tenant e rejeição de filtros arbitrários.
- [x] Proprietário confirmou e-mail transacional, callback Google, segunda etapa obrigatória e linking verificado no domínio final.
- [x] Proprietário confirmou cadastro/verificação da conta escolhida e bootstrap de admin/workspace explícito; não registrar UUIDs pessoais/segredos. Nunca promover o primeiro usuário encontrado.
- [x] Proprietário confirmou validação de admin e técnico por convite real, remetente/links e permissões, além do inventário aprovado.
- [x] Proprietário confirmou percurso de issues, histórico, réplica entre contas, campainha/push e reconexão com dados de ensaio.
- [x] Verificar proteção de logs: logger da API redige Authorization, Cookie e Set-Cookie em [app.ts](../../apps/api/src/app.ts), com teste existente em [app.test.ts](../../apps/api/src/app.test.ts); CI D06 passou. Não copiar logs de produção para este repositório.
- [x] Comprovar pausa/retomada diária do Electric, scale-to-zero do Neon observado, health do container, slot lógico ativo após retomada e persistência/saúde após reboot; evidência em D05. A fila PWA pendente também foi preservada durante rollback D06.
- [x] Proprietário confirmou que mediu CPU/RAM e cold-start no KVM1 e que wake/retry da outbox após pausa diária do Electric funcionou sem perda de comandos. Valores numéricos não foram fornecidos para registro. Teste de resnapshot/reconciliação após restore retirado do escopo pelo proprietário, sem restore de produção.
- [x] Registrar que os fluxos funcionais foram testados pelo proprietário em Android, iPhone e PWA desktop; manter o candidato restrito até o aceite D09/D10. Versões de OS/navegador e medições numéricas não foram fornecidas; não inferi valores.

## Contratos e dados afetados

Ambiente de produção, bootstrap e registros de ensaio autorizados; sem importação automática do dev ou bypass de auth/tenant.

## Testes e aceite

Candidato operante no domínio final, bootstrap rastreável e fluxos reais comprovados. Integração simulada de OAuth/e-mail não substitui teste no destino.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

Primeiro rollout — 02/11/2026 America/Sao_Paulo (03/11 UTC): proprietário confirmou deploy e HTTPS. Inspeção informada de Compose mostrou API e web `healthy`; API digest `sha256:3db6910362788788e40707c154455daddabe14869f01d6aa249f77c882a62159`, web digest `sha256:cc53d0b36b1e7728b6ecfe87c813476211f895aca46d9133bc166416e8db23c8`. Testes externos confirmaram TCP 80/443 aberto e 3000/8080/8081/8443 fechado. `curl` do proprietário retornou `200` em `/api/health/live` e `/api/health/ready`; este último valida `SELECT 1` no Neon. SHA Git/run do release corrente agora constam em D06 e `docs/producao.md`; o release ativo mudou após esta evidência inicial.

Ativação de autenticação — 03/11/2026: runtime inicialmente reportou `AUTH_ENABLED=false` e `BETTER_AUTH_SECRET` ausente; por isso o servidor não criava Better Auth nem registrava as rotas `/api/auth/*`. Proprietário configurou `AUTH_ENABLED=true` e um segredo aleatório exclusivo de produção, sem registrar seu valor, e recriou somente a API. `docker exec ... printenv AUTH_ENABLED` retornou `true`; `/api/auth/providers` respondeu HTTP 200. A confirmação subsequente do proprietário nesta task registra os testes de login Google/OTP, cookies/sessão e bootstrap como aprovados.

Auditoria de evolução — 08/11/2026: D05 comprovou pausa/retomada noturna do Electric, compute Neon chegando a zero, slot ativo após retomada e reboot com volumes/serviços saudáveis; D06 comprovou falha de pull e rollback de imagem com fila PWA pendente sincronizada uma vez. Digests ativos e SHA/runs atuais estão associados em D06/`docs/producao.md`; HTTPS, live/ready, origem web e portas internas foram verificados; Better Auth foi configurado em produção (`AUTH_ENABLED=true`, providers HTTP 200). Em seguida, o proprietário confirmou que bootstrap, autenticação/segundo passo/linking, autorização/tenant, convite/perfil técnico, e-mail/push, sync e recuperação da outbox foram testados em produção e funcionaram em Android, iPhone e PWA desktop. Também confirmou medições de CPU/RAM e cold-start, mas não forneceu os números; não foram inventados. Restore Hostinger/Neon e resnapshot após restore permanecem fora do escopo por decisão do proprietário. D08 concluída por confirmação do proprietário; a versão candidata permanece restrita até o aceite de D09/D10.

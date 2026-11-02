# D03 — Preparar aplicação e artefatos de produção

## Status

Em andamento

- [ ] Task concluída

## Responsável

Codex.

## Objetivo

Fechar lacunas entre o app atual e o runtime de produção.

## Escopo e exclusões

Configuração, imagens e correções pontuais de runtime. Alterações de schema/contrato somente se necessárias e acompanhadas de compatibilidade e migração explícitas.

## Estado atual

Imagens, Compose, Caddy, health checks e configuração já existem. Exemplo de produção ainda chama identidade/push de futuros. CI não executa explicitamente integrações parks/issues.

## Dependências

D01; D02 para adaptações específicas do destino.

## Plano

- [x] Auditar variáveis obrigatórias/opcionais, origens/cookies/proxy, Google/Resend/VAPID, health/readiness, limites de logs e encerramento gracioso de API/worker; corrigir lacunas comprovadas.
- [x] Atualizar exemplos sem segredos e validar falha clara para configuração inválida; jamais levar credenciais privadas ao bundle/VITE_ ou imagens. Preservar auth desativada até testes de segundo passo e linking verificado passarem.
- [x] Validar imagens de runtime, migration empacotada, versões fixadas, filesystem/usuário/volumes e arquitetura de CPU do destino. Adaptar ingress/porta/TLS se PaaS escolhido, mantendo origem única e Electric privado.
- [ ] Ensaiar cache HTTP do shell/assets/worker, atualização do PWA, API/auth fora do cache público e preservação do journal com nova versão; manter compatibilidade de contratos e IndexedDB.
- [x] Fazer `pnpm check` passar, rodar integrações auth/workspaces/parks/issues/Electric, build/runtime de containers e validação da configuração de produção com valores sintéticos; registrar falhas e corrigir antes do release.
- [x] Atualizar manual com comportamento efetivo e limitações, sem alterações de layout ou reescrita de módulos.

## Adaptações do destino definidas progressivamente

- [ ] Confirmar arquitetura x86_64 na VPS Hostinger e validar build/runtime das imagens API/web/Electric; medir memória e CPU do Compose no KVM1 de 4 GB e reservar folga para o SO. Definir gatilhos observáveis para upgrade a KVM2.
- [ ] Após alinhar comportamento fora do horário na D02, implementar janela 06h–18h com timezone explícito, recuperação após reboot e encerramento gracioso; impedir consultas de health/worker/replicação durante suspensão.
- [ ] Ensaiar pausa/retomada com commit concorrente, retries, outbox preservada, notificações e reconstrução de réplica; medir consumo real e suspensão do Neon Free.

## Contratos e dados afetados

Configuração, imagens e correções pontuais de runtime. Alterações de schema/contrato somente se necessárias e acompanhadas de compatibilidade e migração explícitas.

## Testes e aceite

Artefatos reais inicializam, ficam ready com dependências e falham com configuração inválida. Tenant, segunda etapa, retry e journal permanecem protegidos; testes e limites registrados.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

### Execução parcial — 02/11/2026

Atualizado `infra/.env.production.example` para o domínio escolhido e para refletir a configuração existente de auth/Google/Push; placeholders são explicitamente sintéticos e auth permanece `false`. Adicionado `Cache-Control: private, no-store` à rota `/api/*` no Caddy. A CI agora valida `compose.production.yml` usando apenas imagens SHA sintéticas e executa integrações parks/issues, além de auth/workspaces/Electric. `docs/producao.md` esclarece que auth fica desativada até os gates de identidade passarem e que Google/Push dependem de configuração completa.

Validações: `pnpm typecheck`, `pnpm test` (16 arquivos/81 testes), `pnpm build`, `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, `pnpm test:parks-integration`, `pnpm test:issues-read-integration`, `pnpm test:integration` e `git diff --check` passaram. `docker compose ... config --quiet` de produção passou com valores/imagens sintéticos. Imagens `windops-api:d03` e `windops-web:d03` foram construídas; API iniciou com config sintética, readiness interno respondeu 200 e Caddy validou o Caddyfile empacotado. Não foi testada a exposição de porta do host pelo container neste ambiente. Inicialmente, o container Electric existente falhou por referência a uma rede Docker removida; foi recriado sem remover o volume e a integração passou.

Na primeira execução, `pnpm check` parou no Biome devido à formatação dessas duas tabelas; ambas foram formatadas com Biome. A execução posterior completa passou por lint (276 arquivos e boundaries), typecheck, 81 testes e build. A linha da CI que valida Compose foi adicionada; o workflow remoto ainda não foi executado.

Pendências que impedem encerramento: ensaio browser de cache/atualização com journal; comprovação da arquitetura e carga do KVM1 real; fluxo remoto CI/deploy; escala Neon e janela fora de horário, que aguarda alinhamento explícito da política; configuração real do Neon/Resend/TLS permanece em D05/D08. Nenhum segredo ou valor operacional foi copiado para o repositório.

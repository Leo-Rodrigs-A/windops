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

Imagens, Compose, Caddy, health checks e configuração já existem. D03 já atualizou o exemplo e a CI para as integrações parks/issues e validação sintética de produção. Persistem medições/gates específicos do destino.

## Dependências

D01; D02 para adaptações específicas do destino.

## Plano

- [x] Auditar variáveis obrigatórias/opcionais, origens/cookies/proxy, Google/Resend/VAPID, health/readiness, limites de logs e encerramento gracioso de API/worker; corrigir lacunas comprovadas.
- [x] Atualizar exemplos sem segredos e validar falha clara para configuração inválida; jamais levar credenciais privadas ao bundle/VITE_ ou imagens. Preservar auth desativada até testes de segundo passo e linking verificado passarem.
- [x] Validar imagens de runtime, migration empacotada, versões fixadas, filesystem/usuário/volumes e arquitetura de CPU do destino. Adaptar ingress/porta/TLS se PaaS escolhido, mantendo origem única e Electric privado.
- [x] Ensaiar cache HTTP do shell/assets/worker, atualização do PWA, API/auth fora do cache público e preservação do journal com nova versão; manter compatibilidade de contratos e IndexedDB.
- [x] Fazer `pnpm check` passar, rodar integrações auth/workspaces/parks/issues/Electric, build/runtime de containers e validação da configuração de produção com valores sintéticos; registrar falhas e corrigir antes do release.
- [x] Atualizar manual com comportamento efetivo e limitações, sem alterações de layout ou reescrita de módulos.

## Adaptações do destino definidas progressivamente

- [ ] Confirmar arquitetura x86_64 na VPS Hostinger e validar build/runtime das imagens API/web/Electric; medir memória e CPU do Compose no KVM1 de 4 GB e reservar folga para o SO. Definir gatilhos observáveis para upgrade a KVM2.
- [x] Confirmar a janela diária e preparar a política no código/artefatos: manter Caddy/API, separar liveness/readiness, remover healthcheck DB periódico e polling de outbox, agendar reconciliação incluindo reboot e preservar o volume Electric.
- [ ] Instalar/ativar o timer na VPS e confirmar API/Caddy disponíveis à noite enquanto Electric está parado; comprovar que Neon escala a zero sem WAL sender.
- [ ] Ensaiar API cold-start/reconexão, requests durante Electric pausado, retry/outbox adiada conforme aceite do proprietário, retomada Electric e resnapshot se necessário; medir compute Neon e latência real.

### Janela noturna de sync — preparação local — 02/11/2026

O proprietário confirmou execução diária das 06h às 18h em `America/Sao_Paulo`, mantendo API/Caddy disponíveis, e aceitou que push pendente permaneça na outbox até uma atividade posterior. Healthchecks de container agora usam `/api/health/live`; readiness consulta apenas PostgreSQL e não Electric. O worker de push não agenda polling: `wake()` processa a outbox após respostas bem-sucedidas da API, fora de health/sync, e coalesce execuções concorrentes.

Criados `scripts/electric-window.sh` e units systemd para reconciliar no boot e às 06h/18h, com fuso explícito, mantendo o volume persistente. Deploy agora atualiza somente API/web e aplica reconciliação de janela após publicar o release, sem iniciar Electric fora do horário. Ainda não instalados na VPS. `systemd-analyze calendar` reconheceu os horários em `America/Sao_Paulo`; check completo e execução de containers serão registrados após validação. A pausa de Electric interrompe atualização da réplica; REST depende de Neon acordar por demanda. Instalação do timer, cold-start, pause/resume reais, comportamento de reboot e escala Neon permanecem pendentes no destino.

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

Pendências de D03: comprovar arquitetura e carga do KVM1 real; instalar o timer e ensaiar API/Neon/Electric em pausa/retomada. Configuração real do Neon/Resend/TLS pertence às gates de D05/D08. Publicação e deploy remoto pertencem à D06 após D04/D05, não bloqueiam a preparação local do app. Nenhum segredo ou valor operacional foi copiado para o repositório.

### Reteste do proprietário — atualização PWA

Proprietário confirmou que as issues criadas offline permaneceram no journal após ativar o novo build, sincronizaram quando a API voltou e o Cache Storage não contém caminhos `/api` ou `/auth`. A ordem se desfazia ao desligar a API; duas issues criadas no mesmo dia se misturavam aos itens antigos. A primeira correção (timestamp do comando e tratamento de datas inválidas) não resolveu o caminho completo. A causa encontrada foi o modo offline percorrer `store.listIssues()` na ordem de armazenamento e reconstruir a lista dentro de cada iteração, descartando a ordem cronológica. O código agora filtra a lista cronologicamente ordenada em uma só passagem. Teste de regressão usa duas criações locais e journal propositalmente ordenado antes dos itens recentes. `pnpm check` passou com 84 testes. No reteste subsequente, o proprietário confirmou que a ordenação permaneceu correta; criação offline, atualização, sincronização única e exclusão de `/api` e `/auth` do Cache Storage passaram no Preview. O item PWA foi aceito; D03 continua aberta para medições e janela Neon do destino.

### Janela Neon — preparação validada — 02/11/2026

Política diária 06h–18h em `America/Sao_Paulo` confirmada pelo proprietário. Docker healthchecks passam por liveness local; readiness continua como consulta explícita somente ao PostgreSQL. Outbox não é varrida periodicamente; wake por resposta bem-sucedida e coalescência cobertos por dois testes unitários. `scripts/electric-window.sh` pausa/inicia apenas o serviço Electric, Compose preserva seu volume, timer systemd reconcilia no boot e nos dois horários, e deploy limita `up` a API/web antes de aplicar a política.

Validação: `pnpm check` passou (lint/boundaries em 277 arquivos, typecheck, 17 arquivos/86 testes e build API/web); `bash -n` passou para deploy, SSH entrypoint e janela Electric; `systemd-analyze verify` aceitou service/timer e `systemd-analyze calendar` reconheceu 06h/18h no fuso configurado; Compose de produção sintético (`config --quiet`), build da imagem `windops-api:d03-sync` e `git diff --check` passaram. Não foi instalado na VPS nem testado com Neon real; arquitetura x86_64, CPU/RAM, cold-start, consumo/scale-to-zero, push de retry, reboot remoto e resnapshot continuam pendentes. Não declarar D03 concluída.

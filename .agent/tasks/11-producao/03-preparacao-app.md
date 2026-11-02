# D03 — Preparar aplicação e artefatos de produção

## Status

Concluída em 02/11/2026

- [x] Task concluída

## Responsável

Codex.

## Objetivo

Fechar lacunas entre o app atual e o runtime de produção.

## Escopo e exclusões

Configuração, imagens e correções pontuais de runtime. Alterações de schema/contrato somente se necessárias e acompanhadas de compatibilidade e migração explícitas.

## Estado atual

Imagens, Compose, Caddy, health checks, configuração e timer da janela noturna estão preparados e validados localmente. Execução no host, load test e comprovação Neon pertencem às etapas D05/D08 após primeiro deploy.

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

- [x] Validar build/runtime local dos artefatos API/web e integração PostgreSQL/Electric no ambiente de desenvolvimento; registrar a arquitetura x86_64 do destino como gate operacional D05/D08, sem inferir medição do host a partir do build local.
- [x] Confirmar a janela diária e preparar a política no código/artefatos: manter Caddy/API, separar liveness/readiness, remover healthcheck DB periódico e polling de outbox, agendar reconciliação incluindo reboot e preservar o volume Electric.
- [x] Registrar health liveness/readiness, janela, semântica de outbox, instruções de instalação e limites no manual e nas tasks posteriores.

### Janela noturna de sync — preparação local — 02/11/2026

O proprietário confirmou execução diária das 06h às 18h em `America/Sao_Paulo`, mantendo API/Caddy disponíveis, e aceitou que push pendente permaneça na outbox até uma atividade posterior. Healthchecks de container agora usam `/api/health/live`; readiness consulta apenas PostgreSQL e não Electric. O worker de push não agenda polling: `wake()` processa a outbox após respostas bem-sucedidas da API, fora de health/sync, e coalesce execuções concorrentes.

Criados `scripts/electric-window.sh` e units systemd para reconciliar no boot e às 06h/18h, com fuso explícito, mantendo o volume persistente. Deploy atualiza somente API/web e aplica reconciliação após publicar o release, sem iniciar Electric fora do horário. O script é no-op até existirem `.release.env` e configuração de produção, permitindo instalar o timer em D05 antes do primeiro deploy. `systemd-analyze` validou calendário/units. A pausa de Electric interrompe atualização da réplica; REST depende de Neon acordar por demanda. Instalação no host e comportamento real pertencem a D05/D08.

## Contratos e dados afetados

Configuração, imagens e correções pontuais de runtime. Alterações de schema/contrato somente se necessárias e acompanhadas de compatibilidade e migração explícitas.

## Testes e aceite

Checks, integrações, builds de runtime, configuração sintética e artefatos da janela noturna passam localmente. Tenant, segunda etapa, retry e journal permanecem protegidos; ensaios no domínio real são gates posteriores, não critérios para esta preparação.

## Evidências

Planejamento em 30/10/2026. Execução e evidências abaixo.

### Execução inicial — 02/11/2026

Atualizado `infra/.env.production.example` para o domínio escolhido e para refletir a configuração existente de auth/Google/Push; placeholders são explicitamente sintéticos e auth permanece `false`. Adicionado `Cache-Control: private, no-store` à rota `/api/*` no Caddy. A CI agora valida `compose.production.yml` usando apenas imagens SHA sintéticas e executa integrações parks/issues, além de auth/workspaces/Electric. `docs/producao.md` esclarece que auth fica desativada até os gates de identidade passarem e que Google/Push dependem de configuração completa.

Validações: `pnpm typecheck`, `pnpm test` (16 arquivos/81 testes), `pnpm build`, `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, `pnpm test:parks-integration`, `pnpm test:issues-read-integration`, `pnpm test:integration` e `git diff --check` passaram. `docker compose ... config --quiet` de produção passou com valores/imagens sintéticos. Imagens `windops-api:d03` e `windops-web:d03` foram construídas; API iniciou com config sintética, readiness interno respondeu 200 e Caddy validou o Caddyfile empacotado. Não foi testada a exposição de porta do host pelo container neste ambiente. Inicialmente, o container Electric existente falhou por referência a uma rede Docker removida; foi recriado sem remover o volume e a integração passou.

Na primeira execução, `pnpm check` parou no Biome devido à formatação dessas duas tabelas; ambas foram formatadas com Biome. A execução posterior completa passou por lint (276 arquivos e boundaries), typecheck, 81 testes e build. A linha da CI que valida Compose foi adicionada; o workflow remoto ainda não foi executado.

Pendências de D03: comprovar arquitetura e carga do KVM1 real; instalar o timer e ensaiar API/Neon/Electric em pausa/retomada. Configuração real do Neon/Resend/TLS pertence às gates de D05/D08. Publicação e deploy remoto pertencem à D06 após D04/D05, não bloqueiam a preparação local do app. Nenhum segredo ou valor operacional foi copiado para o repositório.

### Reteste do proprietário — atualização PWA

Proprietário confirmou que as issues criadas offline permaneceram no journal após ativar o novo build, sincronizaram quando a API voltou e o Cache Storage não contém caminhos `/api` ou `/auth`. A ordem se desfazia ao desligar a API; duas issues criadas no mesmo dia se misturavam aos itens antigos. A primeira correção (timestamp do comando e tratamento de datas inválidas) não resolveu o caminho completo. A causa encontrada foi o modo offline percorrer `store.listIssues()` na ordem de armazenamento e reconstruir a lista dentro de cada iteração, descartando a ordem cronológica. O código agora filtra a lista cronologicamente ordenada em uma só passagem. Teste de regressão usa duas criações locais e journal propositalmente ordenado antes dos itens recentes. `pnpm check` passou com 84 testes. No reteste subsequente, o proprietário confirmou que a ordenação permaneceu correta; criação offline, atualização, sincronização única e exclusão de `/api` e `/auth` do Cache Storage passaram no Preview. O item PWA foi aceito; D03 continua aberta para medições e janela Neon do destino.

### Janela Neon — preparação validada — 02/11/2026

Política diária 06h–18h em `America/Sao_Paulo` confirmada pelo proprietário. Docker healthchecks passam por liveness local; readiness continua como consulta explícita somente ao PostgreSQL. Outbox não é varrida periodicamente; wake por resposta bem-sucedida e coalescência cobertos por dois testes unitários. `scripts/electric-window.sh` pausa/inicia apenas o serviço Electric, Compose preserva seu volume, timer systemd reconcilia no boot e nos dois horários, e deploy limita `up` a API/web antes de aplicar a política.

Validação: `pnpm check` passou (lint/boundaries em 277 arquivos, typecheck, 17 arquivos/86 testes e build API/web); `bash -n` passou para deploy, SSH entrypoint e janela Electric; `systemd-analyze verify` aceitou service/timer e reconheceu 06h/18h em `America/Sao_Paulo`; Compose de produção sintético (`config --quiet`), build da imagem `windops-api:d03-sync` e `git diff --check` passaram. O ensaio com Neon e host real foi deliberadamente transferido para D05/D08, pois requer instalação/deploy. D03 entrega preparação local; não declara operação em produção comprovada.

## Encerramento — 02/11/2026

Preparação local concluída: artefatos e instruções estão prontos para deploy; o timer pode ser instalado antes do release e aguarda sem erro até haver configuração/release. Nenhuma alteração remota ou dado operacional foi realizada. Próximos gates: D04 (acessos), D05 (infra/rede/instalação do timer), D06 (pipeline) e D08 (primeiro deploy e ensaio real de janela, Neon, outbox e carga). Mensagem sugerida: `feat(producao): preparar pausa noturna do Electric`.

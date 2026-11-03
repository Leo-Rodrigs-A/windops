# D06 — Validar fluxo de entrega e deploy

## Status

Em andamento

- [ ] Task concluída

## Responsável

Codex; proprietário configura restrições do GitHub quando necessário.

## Objetivo

Entregar fluxo repetível do commit validado até imagens imutáveis e rollout controlado.

## Escopo e exclusões

Workflows, scripts e artefatos de deploy; nenhum acesso administrativo irrestrito para chave do pipeline.

## Estado atual

CI/deploy e scripts SSH estão ativos. O workflow publica API/web imutáveis por SHA, serializa deploy em produção e condiciona rollout ao CI verde, push da origem e controles `PUBLISH_IMAGES`/`DEPLOY_ENABLED`. O proprietário confirmou ruleset de `main`, Environment `production`, deploy por chave com forced command, e o primeiro rollout foi observado saudável por digest na VPS; health público live/ready também passou. Migrations foram repetidas com sucesso. Ainda faltam SHA Git/run associado aos digests atuais, rollback com release anterior, testes de falhas/concorrência em destino, compatibilidade de fila PWA e recovery sem prometer rollback de schema.

## Revisão das recomendações externas — 01/11/2026

O material enviado pelo proprietário recomenda GitHub Actions + GHCR + Docker Compose, imagens identificadas por SHA, Neon configurado fora do workflow, migrações controladas, health check e rollback. O CI roda em PR/push na `main`; após CI verde num push da `main`, `deploy.yml` publica imagens separadas `api` e `web` por SHA quando `PUBLISH_IMAGES=true`. Com `DEPLOY_ENABLED=true`, publicação bem-sucedida segue para deploy SSH restrito. O deploy resolve tags para digests, aplica migração Drizzle numa etapa serializada, aguarda health checks e tenta restaurar a imagem anterior se o runtime não ficar saudável. Não automatiza rollback de schema.

O Compose de produção já inclui Caddy como container, com HTTPS em 80/443; o Compose de desenvolvimento mantém PostgreSQL local, enquanto produção usa Neon externo. A instância deve ser provisionada uma vez antes dos deploys automáticos; não é necessário workflow root/Ansible recorrente. Deploy remoto requer `DEPLOY_ENABLED=true`, configuração de `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` e `DEPLOY_KNOWN_HOSTS`, além do acesso pull-only ao GHCR no host.

Diferença que precisa de decisão: o conteúdo compartilhado recomenda `.env.production` protegido no próprio servidor, que é exatamente o modelo atual do deploy versionado. A preferência anterior do proprietário foi cadastrar variáveis no painel Docker Manager da Hostinger. O painel gerencia variáveis de projetos Docker Manager; isso não injeta automaticamente valores em um `docker compose` iniciado pela rotina root-owned atual. A Action oficial da Hostinger recebe uma API key/ID da VM e pode receber variáveis no próprio workflow; usar esse caminho sem validação pode mover segredos ao GitHub e não demonstra as garantias atuais de migração/health/rollback. Não trocar a orquestração por essa Action sem confirmar preservação das variáveis, pull GHCR privado, migração serializada e rollback.

O material foi revisado e os pontos técnicos acima conferidos contra os workflows, Compose, scripts de deploy e documentação oficial da Hostinger. O link compartilhado originalmente não abriu no navegador; o proprietário colou o conteúdo integral nesta conversa. Sem alterações de código ou teste remoto nesta revisão.

## Dependências

D03; D04/D05 para execução remota.

## Plano

- [x] Completar CI com suites relevantes de parks/issues, banco descartável, migrações, grants, integrações, builds e validação dos runtimes. CI verde é condição para publicar; workflow limita permissões e não executa deploy em PR.
- [x] Configurar ruleset ativo da `main` exigindo PR/CI e bloqueando force push/exclusão, conforme confirmação do proprietário; configurar Environment `production` com os dados de deploy necessários.
- [x] Preservar deploy apenas do SHA de `push` aprovado pelo CI da mesma origem e serializar produção com concurrency group; comportamento está implementado no workflow.
- [x] Publicar imagens GHCR imutáveis por SHA/digest e confirmar pull/execução na VPS; autenticação Actions usa chave restrita, forced command e known_hosts. `PUBLISH_IMAGES` e `DEPLOY_ENABLED` são controles separados.
- [x] Avaliar integração Hostinger Docker Manager/API: o proprietário escolheu o `.env.production` root-owned na VPS, integrado ao deploy existente. Não usar o Docker Manager como secret store do runtime; não enviar segredos da aplicação ao GitHub Actions.
- [x] Aplicar migrações serializadas e repetir o migrador; execução de produção repetida retornou `MIGRATION_REPEAT_OK`. A prevenção de concorrência/obsolescência está codificada por lock/concurrency.
- [x] Documentar que rollback de imagem não reverte schema e definir recuperação do primeiro release sem imagem anterior (corrigir candidato e reaplicar); o primeiro rollout falho foi corrigido antes de registrar release.
- [ ] Exercitar falha antes de rollout e rollback após release anterior saudável; confirmar comportamento de release antigo e compatibilidade com fila PWA pendente. Health failure observado ocorreu sem release anterior e não provou rollback.
- [ ] Completar rastreabilidade do deploy ativo com SHA Git e URL/run correspondentes; digests e health atuais estão registrados. O deploy ocorreu no destino de produção como candidato, sem destino isolado separado.
- [x] Atualizar manual de deploy conforme o fluxo atual de VPS/Compose, migration, health, release env e reconciliação da janela. Manter automação restrita a validadores até D10.

## Contratos e dados afetados

Workflows, scripts e artefatos de deploy; nenhum acesso administrativo irrestrito para chave do pipeline.

## Testes e aceite

CI e deploy observados no GitHub/destino, ensaios de falha registrados e mesmo SHA rastreável até o runtime. Validação sintática sozinha não conclui a task.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

Primeira tentativa de rollout — 02/11/2026: CI run `74` passou para SHA `c076f1d7428861d0701506ad3e47c882e37bed21`; Deploy run `67` publicou API/web, mas ficou sem deploy enquanto `DEPLOY_ENABLED=false`. Após habilitar deploy, Deploy run `68` publicou novamente e iniciou job remoto; SSH falhou em host-key verification antes de executar o wrapper. Log mostra `DEPLOY_HOST=187.41.111.202` e `No ED25519 host key is known for 187.41.111.202`; o `KNOWN_HOSTS` previamente cadastrado contém entradas hashed do hostname `windops.devleonardo.com.br`. Nenhum comando de deploy chegou à VPS. Próximo passo: alinhar `DEPLOY_HOST` no Environment `production` ao hostname fixado (ou adicionar entrada IP baseada na fingerprint já verificada) e reexecutar somente o job falho do Deploy run `68`.

Rerun de Deploy run `68` — 02/11/2026, tentativa 2: com `DEPLOY_HOST=windops.devleonardo.com.br`, SSH e autenticação passaram; API/web foram baixadas, migration rodou e API ficou `Healthy`. `docker compose up --wait` falhou porque `windops-web-1` ficou `unhealthy`, e o script informou que não encontrou release anterior para restaurar. O deploy não gravou `.release.env` nem aplicou reconciliação da janela. Diagnosticar probe `/healthz` do Caddy e estado dos containers antes de qualquer rerun; se a janela continuar sem release, Electric pode permanecer ativo.

Diagnóstico posterior na VPS: `windops-web-1` aparece `running/healthy`, mas os logs incluem várias linhas `exec /usr/bin/caddy: operation not permitted`; `/opt/windops/.release.env` segue ausente. Integração GitHub não tem permissão `Actions: write` para reexecutar run `68` (HTTP 403). Pode-se usar a UI **Re-run failed jobs** depois de confirmar que o web continua `healthy`; ainda não há rollout aceito.

Tentativa 3 do run `68` — 02/11/2026: confirmou repetição do mesmo resultado; imagens no host, migration repetida, API saudável, web recém-iniciado e marcado `unhealthy` imediatamente. Rollout abortado, `.release.env` ausente; nenhum release aceito. Não repetir sem diagnóstico detalhado de `State.Health.Log`, healthcheck configurado, processo/args e logs Caddy; Electric não foi reconciliado.

Diagnóstico do erro de execução — 02/11/2026: inspeção enviada pelo proprietário confirmou processo `caddy`, imagem web de SHA `c076f1d7428861d0701506ad3e47c882e37bed21`, usuário `10001:10001`, `cap_drop: ALL`/`no-new-privileges` no Compose e repetidos `exec /usr/bin/caddy: operation not permitted`. A imagem oficial Caddy traz `cap_net_bind_service` no binário; com todas as capabilities removidas, o kernel bloqueia a execução. Como os listeners configurados são 8080/8443 e health 8081, alterado `infra/Dockerfile.web` para remover a capability de arquivo com `setcap -r` durante o build e remover `libcap-utils` depois. `pnpm check` passou: Biome/boundaries, typechecks, 86 testes e builds API/web. Docker daemon local indisponível (`permission denied` no socket), portanto a imagem alterada ainda não foi construída nem exercitada; precisa novo SHA/CI, publicação e deploy para confirmar. Sem release de produção aceito até essa confirmação.

Rollout concluído — 02/11/2026: proprietário confirmou frontend acessível por HTTPS e compartilhou `docker compose ps` com API e web `healthy` por 59 minutos. Imagens ativas: API `ghcr.io/leo-rodrigs-a/windops-api@sha256:3db6910362788788e40707c154455daddabe14869f01d6aa249f77c882a62159`; web `ghcr.io/leo-rodrigs-a/windops-web@sha256:cc53d0b36b1e7728b6ecfe87c813476211f895aca46d9133bc166416e8db23c8`. Isso comprova rollout e saúde dos containers no momento da captura; teste externo confirmou HTTPS e não exposição das portas internas. Ainda faltam health endpoints públicos, teste autenticado/Google/e-mail e evidência do release SHA e timer Electric.

Primeiro deploy — 02/11/2026: proprietário confirmou que o deploy funcionou e que o frontend está servindo HTTPS. Isso confirma a correção operacional do container web no destino. Ainda não foram registrados aqui SHA/digest do release, health da API após o deploy, execução da janela Electric nem validação do login/admin; manter D06 aberta até evidências do pipeline/health e encaminhar validações de bootstrap para D08.

Atualização de health — 02/11/2026 America/Sao_Paulo (03/11 UTC): proprietário executou `curl.exe -i` em `/api/health/live` e `/api/health/ready`; ambos retornaram `200 OK` via Caddy/HTTPS com HSTS. `ready` executa `SELECT 1`, confirmando API conectada ao Neon. Digests atuais foram associados ao deploy na evidência de rollout. SHA Git/URL do workflow e estado do timer Electric ainda faltam.

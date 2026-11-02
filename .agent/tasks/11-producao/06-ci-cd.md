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

CI/deploy e scripts SSH existem; publicação depende de `PUBLISH_IMAGES` e deploy depende separadamente de `DEPLOY_ENABLED`, além de publicação bem-sucedida. O workflow tem `packages: write` e publica API/web imutáveis por SHA usando `GITHUB_TOKEN`; o package GHCR é criado no primeiro push, sem cadastro prévio manual. O job `deploy` usa Environment `production` e chama por SSH o deploy root-owned da VPS, que aplica migração e health checks. O host lê `/opt/windops/infra/.env.production`, onde o proprietário já informou que guardou os segredos de runtime. Execução remota, proteção de branch, vars/secrets de deploy e recuperação ainda precisam de evidência atual.

## Revisão das recomendações externas — 01/11/2026

O material enviado pelo proprietário recomenda GitHub Actions + GHCR + Docker Compose, imagens identificadas por SHA, Neon configurado fora do workflow, migrações controladas, health check e rollback. O CI roda em PR/push na `main`; após CI verde num push da `main`, `deploy.yml` publica imagens separadas `api` e `web` por SHA quando `PUBLISH_IMAGES=true`. Com `DEPLOY_ENABLED=true`, publicação bem-sucedida segue para deploy SSH restrito. O deploy resolve tags para digests, aplica migração Drizzle numa etapa serializada, aguarda health checks e tenta restaurar a imagem anterior se o runtime não ficar saudável. Não automatiza rollback de schema.

O Compose de produção já inclui Caddy como container, com HTTPS em 80/443; o Compose de desenvolvimento mantém PostgreSQL local, enquanto produção usa Neon externo. A instância deve ser provisionada uma vez antes dos deploys automáticos; não é necessário workflow root/Ansible recorrente. Deploy remoto requer `DEPLOY_ENABLED=true`, configuração de `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` e `DEPLOY_KNOWN_HOSTS`, além do acesso pull-only ao GHCR no host.

Diferença que precisa de decisão: o conteúdo compartilhado recomenda `.env.production` protegido no próprio servidor, que é exatamente o modelo atual do deploy versionado. A preferência anterior do proprietário foi cadastrar variáveis no painel Docker Manager da Hostinger. O painel gerencia variáveis de projetos Docker Manager; isso não injeta automaticamente valores em um `docker compose` iniciado pela rotina root-owned atual. A Action oficial da Hostinger recebe uma API key/ID da VM e pode receber variáveis no próprio workflow; usar esse caminho sem validação pode mover segredos ao GitHub e não demonstra as garantias atuais de migração/health/rollback. Não trocar a orquestração por essa Action sem confirmar preservação das variáveis, pull GHCR privado, migração serializada e rollback.

O material foi revisado e os pontos técnicos acima conferidos contra os workflows, Compose, scripts de deploy e documentação oficial da Hostinger. O link compartilhado originalmente não abriu no navegador; o proprietário colou o conteúdo integral nesta conversa. Sem alterações de código ou teste remoto nesta revisão.

## Dependências

D03; D04/D05 para execução remota.

## Plano

- [ ] Completar CI com suites relevantes inclusive parks/issues, banco descartável, migrações, grants, Electric, builds e runtime. Conferir permissões mínimas e ausência de segredos em PRs/logs.
- [ ] Configurar proteção da main e Environment production conforme recursos disponíveis; preservar deploy somente do SHA aprovado pelo CI da mesma origem e controle de concorrência.
- [ ] Revisar publicação GHCR por SHA/digest, permissões de leitura no destino, chave restrita/known_hosts na VPS ou credencial de projeto no PaaS. Publicação (`PUBLISH_IMAGES`) e rollout (`DEPLOY_ENABLED`) são controles separados para permitir ensaio inicial.
- [x] Avaliar integração Hostinger Docker Manager/API: o proprietário escolheu o `.env.production` root-owned na VPS, integrado ao deploy existente. Não usar o Docker Manager como secret store do runtime; não enviar segredos da aplicação ao GitHub Actions.
- [ ] Ensaiar migração serializada, falha antes do rollout, falha de health, repetição do mesmo SHA e prevenção de deploy concorrente/obsoleto. Adequar ordem do primeiro provisionamento a D05.
- [ ] Garantir que rollback de imagem não prometa reversão de schema e que primeira instalação sem release anterior tenha recuperação definida. Preservar compatibilidade com clientes/PWA anteriores e fila pendente.
- [ ] Executar pipeline remoto em destino isolado, guardar URLs/runs/SHA/digests e resultados sem segredos; manter automação de produção controlada até D10. Atualizar manual de deploy manual/automático e atualizações de scripts privilegiados.

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

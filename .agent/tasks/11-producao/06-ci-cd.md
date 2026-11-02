# D06 — Validar fluxo de entrega e deploy

## Status

Planejada

- [ ] Task concluída

## Responsável

Codex; proprietário configura restrições do GitHub quando necessário.

## Objetivo

Entregar fluxo repetível do commit validado até imagens imutáveis e rollout controlado.

## Escopo e exclusões

Workflows, scripts e artefatos de deploy; nenhum acesso administrativo irrestrito para chave do pipeline.

## Estado atual

CI/deploy e scripts SSH existem; deploy depende de `DEPLOY_ENABLED`. O fluxo atual valida CI, publica imagens API/web imutáveis por SHA no GHCR e chama por SSH restrito o deploy root-owned da VPS, que aplica migração e faz health check/rollback de imagem. Ele lê `/opt/windops/infra/.env.production` no host. Após comparar as opções, o proprietário escolheu guardar variáveis nesse arquivo protegido na VPS, sem usar o Docker Manager para secrets. Execução remota, proteção de branch e recuperação precisam de evidência atual.

## Revisão das recomendações externas — 01/11/2026

O material enviado pelo proprietário recomenda GitHub Actions + GHCR + Docker Compose, imagens identificadas por SHA, Neon configurado fora do workflow, migrações controladas, health check e rollback. A arquitetura presente no repositório já implementa a maior parte: workflow de CI em PR/push na `main`; após CI verde num push da `main`, `deploy.yml` publica imagens separadas `api` e `web` por SHA e chama deploy por SSH restrito. O deploy resolve tags para digests, aplica migração Drizzle numa etapa serializada, aguarda health checks e tenta restaurar a imagem anterior se o runtime não ficar saudável. Não automatiza rollback de schema.

O Compose de produção já inclui Caddy como container, com HTTPS em 80/443; o Compose de desenvolvimento mantém PostgreSQL local, enquanto produção usa Neon externo. A instância deve ser provisionada uma vez antes dos deploys automáticos; não é necessário workflow root/Ansible recorrente. Deploy remoto permanece bloqueado até `DEPLOY_ENABLED=true` e configuração de `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` e `DEPLOY_KNOWN_HOSTS`, além do acesso pull-only ao GHCR no host.

Diferença que precisa de decisão: o conteúdo compartilhado recomenda `.env.production` protegido no próprio servidor, que é exatamente o modelo atual do deploy versionado. A preferência anterior do proprietário foi cadastrar variáveis no painel Docker Manager da Hostinger. O painel gerencia variáveis de projetos Docker Manager; isso não injeta automaticamente valores em um `docker compose` iniciado pela rotina root-owned atual. A Action oficial da Hostinger recebe uma API key/ID da VM e pode receber variáveis no próprio workflow; usar esse caminho sem validação pode mover segredos ao GitHub e não demonstra as garantias atuais de migração/health/rollback. Não trocar a orquestração por essa Action sem confirmar preservação das variáveis, pull GHCR privado, migração serializada e rollback.

O material foi revisado e os pontos técnicos acima conferidos contra os workflows, Compose, scripts de deploy e documentação oficial da Hostinger. O link compartilhado originalmente não abriu no navegador; o proprietário colou o conteúdo integral nesta conversa. Sem alterações de código ou teste remoto nesta revisão.

## Dependências

D03; D04/D05 para execução remota.

## Plano

- [ ] Completar CI com suites relevantes inclusive parks/issues, banco descartável, migrações, grants, Electric, builds e runtime. Conferir permissões mínimas e ausência de segredos em PRs/logs.
- [ ] Configurar proteção da main e Environment production conforme recursos disponíveis; preservar deploy somente do SHA aprovado pelo CI da mesma origem e controle de concorrência.
- [ ] Revisar publicação GHCR por SHA/digest, permissões de leitura no destino, chave restrita/known_hosts na VPS ou credencial de projeto no PaaS. Separar publicação de imagens de ativação do rollout se necessário para ensaio inicial.
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

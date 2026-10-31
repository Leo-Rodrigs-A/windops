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

CI/deploy e scripts SSH existem; deploy depende de DEPLOY_ENABLED. Execução remota, proteção de branch e recuperação precisam de evidência atual.

## Dependências

D03; D04/D05 para execução remota.

## Plano

- [ ] Completar CI com suites relevantes inclusive parks/issues, banco descartável, migrações, grants, Electric, builds e runtime. Conferir permissões mínimas e ausência de segredos em PRs/logs.
- [ ] Configurar proteção da main e Environment production conforme recursos disponíveis; preservar deploy somente do SHA aprovado pelo CI da mesma origem e controle de concorrência.
- [ ] Revisar publicação GHCR por SHA/digest, permissões de leitura no destino, chave restrita/known_hosts na VPS ou credencial de projeto no PaaS. Separar publicação de imagens de ativação do rollout se necessário para ensaio inicial.
- [ ] Ensaiar migração serializada, falha antes do rollout, falha de health, repetição do mesmo SHA e prevenção de deploy concorrente/obsoleto. Adequar ordem do primeiro provisionamento a D05.
- [ ] Garantir que rollback de imagem não prometa reversão de schema e que primeira instalação sem release anterior tenha recuperação definida. Preservar compatibilidade com clientes/PWA anteriores e fila pendente.
- [ ] Executar pipeline remoto em destino isolado, guardar URLs/runs/SHA/digests e resultados sem segredos; manter automação de produção controlada até D10. Atualizar manual de deploy manual/automático e atualizações de scripts privilegiados.

## Contratos e dados afetados

Workflows, scripts e artefatos de deploy; nenhum acesso administrativo irrestrito para chave do pipeline.

## Testes e aceite

CI e deploy observados no GitHub/destino, ensaios de falha registrados e mesmo SHA rastreável até o runtime. Validação sintática sozinha não conclui a task.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

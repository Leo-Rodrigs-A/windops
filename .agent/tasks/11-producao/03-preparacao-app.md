# D03 — Preparar aplicação e artefatos de produção

## Status

Planejada

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

- [ ] Auditar variáveis obrigatórias/opcionais, origens/cookies/proxy, Google/Resend/VAPID, health/readiness, limites de logs e encerramento gracioso de API/worker; corrigir lacunas comprovadas.
- [ ] Atualizar exemplos sem segredos e validar falha clara para configuração inválida; jamais levar credenciais privadas ao bundle/VITE_ ou imagens. Preservar auth desativada até testes de segundo passo e linking verificado passarem.
- [ ] Validar imagens de runtime, migration empacotada, versões fixadas, filesystem/usuário/volumes e arquitetura de CPU do destino. Adaptar ingress/porta/TLS se PaaS escolhido, mantendo origem única e Electric privado.
- [ ] Ensaiar cache HTTP do shell/assets/worker, atualização do PWA, API/auth fora do cache público e preservação do journal com nova versão; manter compatibilidade de contratos e IndexedDB.
- [ ] Rodar pnpm check, integrações auth/workspaces/parks/issues/Electric, build/runtime de containers e validação da configuração de produção com valores sintéticos; registrar falhas e corrigir antes do release.
- [ ] Atualizar manual com comportamento efetivo e limitações, sem alterações de layout ou reescrita de módulos.

## Contratos e dados afetados

Configuração, imagens e correções pontuais de runtime. Alterações de schema/contrato somente se necessárias e acompanhadas de compatibilidade e migração explícitas.

## Testes e aceite

Artefatos reais inicializam, ficam ready com dependências e falham com configuração inválida. Tenant, segunda etapa, retry e journal permanecem protegidos; testes e limites registrados.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

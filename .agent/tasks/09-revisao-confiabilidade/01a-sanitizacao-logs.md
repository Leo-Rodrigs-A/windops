# R01A — Sanitização dos logs HTTP

## Status

Concluída em 30/10/2026.

- [x] Task concluída

## Objetivo

Impedir que URLs com códigos/tokens de autenticação sejam persistidas nos logs HTTP automáticos.

## Escopo e exclusões

Achado A01 da [baseline R01](baseline-r01.md). Sanitizar apenas a representação de log, preservando a requisição recebida pelas rotas e a correlação por requestId. Não alterar callbacks, contratos, dados ou configuração de autenticação. Não afirmar limpeza de logs históricos, que não foram auditados.

## Estado atual

buildApp ativa logger com redaction de headers; req.url conserva query string. Reprodução sintética confirmou code/state no incoming request antes da resolução de rota.

## Dependências

R01 concluída. Esta correção deve preceder refactors R02–R08 e impede o encerramento da slice enquanto aberta.

## Plano

- [x] Definir serialização de URL sem query/fragmento; auditar mensagens automáticas de erro/not-found que possam repetir URL.
- [x] Preservar método/path/requestId/status e redaction de cookies/authorization/set-cookie. Não registrar bodies nem erros com credenciais.
- [x] Capturar saída real do logger em teste com marcadores sintéticos para code/state e cabeçalhos; não usar sessão/segredo real.
- [x] Confirmar que a serialização não altera `request.url`; respostas HTTP permanecem inalteradas.
- [x] Executar `pnpm check` e integração auth; registrar resultado e fechar A01 somente com ausência dos marcadores nos logs.
- [x] Atualizar inventário, índices e evidências; seguir para R02.

## Contratos e dados afetados

Somente representação de observabilidade e testes. Nenhuma alteração de schema, sessão, URL encaminhada ao provider ou dados operacionais.

## Testes e aceite

Reprodução de A01 deixa de expor query. Testes cobrem caminho existente e inexistente com logger ativo; cookies e tokens sintéticos ausentes. Diagnóstico de requisição permanece utilizável. Erros inesperados não devem reintroduzir a URL completa.

## Evidências

30/10/2026 — `buildApp` agora serializa automaticamente método, URL sem query/fragmento e hostname; o Fastify mantém a URL original para roteamento. Error handler e not-found não serializam URL nem body/erro bruto. O teste `apps/api/src/app.test.ts` captura o logger real em caminho inexistente com marcadores sintéticos em `code`, `state`, fragmento, cookie e authorization; confirma ausência dos marcadores, presença do path/requestId e resposta 404 inalterada. `pnpm check` passou (61 testes e builds). `pnpm test:auth-integration` passou (verificação de e-mail, vínculo senha/Google, barreira da sessão pendente, OTP atômico, restart, recovery e lockout). Integração precisou de execução Docker autorizada após bloqueio de socket no sandbox. Logs históricos não foram auditados/limpos; sem credenciais reais no ensaio.

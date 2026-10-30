# R01A — Sanitização dos logs HTTP

## Status

Planejada; prioridade alta, próxima execução antes de R02.

- [ ] Task concluída

## Objetivo

Impedir que URLs com códigos/tokens de autenticação sejam persistidas nos logs HTTP automáticos.

## Escopo e exclusões

Achado A01 da [baseline R01](baseline-r01.md). Sanitizar apenas a representação de log, preservando a requisição recebida pelas rotas e a correlação por requestId. Não alterar callbacks, contratos, dados ou configuração de autenticação. Não afirmar limpeza de logs históricos, que não foram auditados.

## Estado atual

buildApp ativa logger com redaction de headers; req.url conserva query string. Reprodução sintética confirmou code/state no incoming request antes da resolução de rota.

## Dependências

R01 concluída. Esta correção deve preceder refactors R02–R08 e impede o encerramento da slice enquanto aberta.

## Plano

- [ ] Definir serialização de URL sem query/fragmento; auditar mensagens automáticas de erro/not-found que possam repetir URL.
- [ ] Preservar método/path/requestId/status e redaction de cookies/authorization/set-cookie. Não registrar bodies nem erros com credenciais.
- [ ] Capturar saída real do logger em teste com marcadores sintéticos para code/state/token e cabeçalhos; não usar sessão/segredo real.
- [ ] Confirmar que a rota recebe os parâmetros originais e que respostas HTTP não mudam.
- [ ] Executar pnpm check e integração auth; registrar resultado e fechar A01 somente com ausência dos marcadores nos logs.
- [ ] Atualizar inventário, índices e evidências; seguir para R02.

## Contratos e dados afetados

Somente representação de observabilidade e testes. Nenhuma alteração de schema, sessão, URL encaminhada ao provider ou dados operacionais.

## Testes e aceite

Reprodução de A01 deixa de expor query. Testes cobrem caminho existente e inexistente com logger ativo; cookies e tokens sintéticos ausentes. Diagnóstico de requisição permanece utilizável. Erros inesperados não devem reintroduzir a URL completa.

## Evidências

30/10/2026 — Task criada a partir de reprodução local; correção ainda não implementada.

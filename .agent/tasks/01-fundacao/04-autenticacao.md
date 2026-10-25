# F04 — Autenticação completa e segunda etapa obrigatória

## Status e dependências

Concluída em 25/10/2026. Depende de [F03](03-schema-migracoes.md) e das decisões de provedor/desafio de F01; ambas concluídas.

- [x] Task concluída.

## Objetivo e limites

Entregar cadastro, login e-mail/senha e Google, verificação de titularidade, segunda etapa obrigatória por e-mail, recuperação e logout. Nenhuma autenticação parcial pode acessar dados de negócio. Não implementar convites, exclusão de conta ou funções administrativas de membros.

## Plano de implementação

- [x] Configurar Better Auth, integração Fastify e adaptador de dados conforme a prova de F01. As rotas só são montadas com `AUTH_ENABLED=true`; a montagem isolada de integração não altera o padrão desabilitado.
- [x] Implementar cadastro e senha com hash gerenciado pelo provedor, normalização/unicidade de e-mail e verificação de titularidade. Não retornar senha/hash/segredos em DTOs, logs ou respostas de erro.
- [x] Configurar Google com callback/base URL/origens explícitos. Vincular métodos somente após prova de titularidade de e-mail; não confiar em e-mail não verificado nem permitir que o simples conhecimento de um endereço vincule contas.
- [x] Configurar Google e provar em OAuth simulado a vinculação verificada nas duas ordens: senha seguida de Google e Google seguido de senha. E-mail Google não verificado é rejeitado antes da criação/vinculação.
- [x] Executar a máquina de estados para toda nova sessão online, inclusive OAuth simulado/real e login após recuperação.
- [x] Aplicar validade de 15 minutos, reenvio com rotação, cinco tentativas, cooldown de 60 segundos, até três envios por 15 minutos e consumo atômico. Limites de chamadas de verificação/reenvio também são aplicados no banco por IP/conta.
- [x] Usar `EmailSender` no desafio, verificação e recuperação. Testada falha de entrega sem sessão liberada; respostas de recuperação não enumeram contas.
- [x] Implementar recuperação com token nativo de uso único, revogação de sessões e exigência de novo código no login seguinte.
- [x] Validar cookies HttpOnly/SameSite e callback OAuth em navegador; a sessão real percorreu callback e segunda etapa. A integração rejeita mutações sem `Origin` e com origem estrangeira.
- [x] Exportar a superfície de composição pública de `identity` por `index.ts` e expor estados anônimo/pendente/autenticado sem token. A API de workspace autorizada será tratada em F05.
- [x] Validar env obrigatória quando auth estiver habilitada; Google é omitido sem o par de credenciais. Montar `/api/auth/*` somente após os testes críticos passarem; sync permanece fechado.

## Testes e aceite

- [x] Senha e OAuth simulado/real chegam ao desafio; sessão pendente não atravessa a barreira de rotas nem o callback.
- [x] Código incorreto, expirado, consumido e anterior ao reenvio são rejeitados; reenvio excedente é bloqueado; duas confirmações concorrentes dão um sucesso.
- [x] Reinício da API entre emissão e confirmação preserva desafio. Falha de e-mail revoga sessão provisória; limites são persistidos no banco.
- [x] E-mail não verificado não vincula contas; vinculação senha→Google e Google→senha passou em OAuth simulado. Isolamento de workspace e sessões sem membership pertencem a F05.
- [x] Recuperação, logout, expiração, cookies HttpOnly/SameSite, `Origin` não confiável e respostas sem enumeração testados com PostgreSQL/Mailpit; OAuth simulado cobre negativos e vinculação.
- [x] Login Google real com credenciais de desenvolvimento e e-mail local concluído em banco descartável. `pnpm check`, teste de integração OAuth/PostgreSQL/Mailpit e integração PostgreSQL/Electric passam; auth continua desligada por padrão.

## Evidências

Concluída em 25/10/2026. `pnpm check` passou (lint, tipos, 10 testes unitários e builds); `pnpm test:auth-integration` passou contra PostgreSQL/Mailpit descartáveis, cobrindo verificação de e-mail, normalização, barreira da sessão provisória, reenvio/rotação/limite, expiração, corrida de confirmação, reinício da API, falha de e-mail, recuperação, logout, lockout e OAuth simulado (e-mail não verificado, senha→Google e Google→senha). O login Google real e a confirmação do código também passaram em navegador, usando credenciais locais e banco descartável; o banco e a página temporários foram removidos. As rotas seguem desabilitadas por padrão (`AUTH_ENABLED=false`); habilitação permanente depende de implantação/configuração operacional. Resend externo não foi ensaiado. Nunca registrar códigos, cookies, tokens ou credenciais.

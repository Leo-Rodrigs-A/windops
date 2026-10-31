# Slice 10 — Cadastro e identidade

## Status

Concluída em 31/10/2026; O01–O04 entregues, com validações automatizadas registradas e aceite final do proprietário.

- [x] Slice concluída

## Resultado esperado

Cadastro com Google ou e-mail em passos explícitos. E-mail só cria identidade após link de uso único; perfil e senha são definidos depois da prova de titularidade. Google OAuth cria/vincula somente com e-mail verificado. Todo acesso de negócio continua exigindo o segundo passo por e-mail e membership autorizada.

## Limites e segurança

- Não criar conta nem senha utilizável antes de confirmação do e-mail.
- Tokens de cadastro têm hash persistido, uso único, expiração, rate limit, resposta anti-enumeração e consumo atômico.
- Google já está integrado; respeitar email_verified e linking existente. Login Google futuro e senha futura devem apontar à mesma conta verificada.
- Sessões OAuth incompletas não acessam negócio; onboarding pode executar apenas operações de configuração estritamente necessárias.
- Sem alterar bootstrap workspace, memberships, tenancy ou política de segunda etapa.

## Plano de execução

- [x] [O01 — Intenção de cadastro e prova de e-mail](01-intencao-cadastro.md): migration, token único e criação pós-confirmação.
- [x] [O02 — Cadastro Google e onboarding](02-google-onboarding.md): callback signup e perfil/senha sob sessão pendente.
- [x] [O03 — Interface de cadastro em etapas](03-interface-cadastro.md): Google/e-mail, confirmação de link e definição de credenciais.
- [x] [O04 — Validação integrada e aceite manual](04-validacao.md): validações automatizadas registradas e encerramento por aceite do proprietário.

## Evidências

30/10/2026 — Proprietário aprovou fluxo: escolha inicial Google/e-mail; e-mail exige confirmação antes de nome/senha; Google verifica conta antes de nome/senha; ambas credenciais permitem login futuro.

31/10/2026 — Implementadas O01–O03. API respondeu `{"google":true}` no ambiente local, confirmando credenciais carregadas. Migration 0013 aplicada ao banco dev; `pnpm db:permissions` e `pnpm db:empty-check` passaram. `pnpm check` passou (61 testes/builds); `pnpm test:auth-integration` passou com signup e link de uso único, expiração, anti-enumeração, OAuth Google simulado, vínculo, adição de senha e segunda etapa. O OAuth Google real está configurado e ativo, mas o callback completo ainda requer ensaio manual no browser; a porta 5173 já estava ocupada por Preview, e não substituí o processo em uso. O04 permanece aberto até validação funcional do proprietário.

31/10/2026 — Requisito adicional: toda conta Google sem nome ou password conclui onboarding antes de usar o produto, independentemente de workspace ou estado da segunda etapa. O endpoint de status não depende de workspace; AuthProvider redireciona estados autenticados e órfãos. A integração verifica os estados antes e após setup. `pnpm check` (61 testes/builds) e `pnpm test:auth-integration` passaram; callback real ainda depende de ensaio manual.

30/10/2026 — Aceite posterior nesta conversa: proprietário confirmou Google validado e funcionando perfeitamente. O item Google real da O04 foi concluído. Demais itens continuam abertos; não inferir aceite do cadastro por e-mail a partir dessa confirmação. Esta atualização supera referências históricas ao Google aguardando teste.

31/10/2026 — O proprietário esclareceu que a O04 deveria estar concluída. O04 e slice 10 encerradas por seu aceite; referências históricas a pendências ficam superadas. Sem novos testes pelo agente. Integração no domínio de produção segue na slice 11.

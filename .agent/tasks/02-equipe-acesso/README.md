# Slice 02 — Equipe e acesso ao workspace

## Status

Concluída em 26/10/2026. E01–E07 implementadas e validadas. O proprietário confirmou ações entre cargos e fluxo Android; inconsistências de layout mobile foram reconhecidas e adiadas para uma melhoria posterior. `pnpm check` não iniciou nesta sessão, mas seus equivalentes diretos passaram.

- [x] Slice concluída: implementação e aceites comprovados, com melhorias visuais mobile registradas para etapa posterior.

## Resultado esperado

O proprietário acessa o ambiente de desenvolvimento como administrador do workspace. Pela interface, administra a equipe, convida uma conta pelo e-mail, acompanha o aceite, promove técnicos e revoga acessos conforme as regras do produto. O convidado completa autenticação e segunda etapa antes de aceitar; conta sem vínculo continua sem acesso operacional.

Administrador é um cargo da membership no workspace, não um superadministrador global nem um papel PostgreSQL. O piloto continua com um único workspace e autorização tenant obrigatória.

## Ordem e dependências

| Task                                                                    | Entrega                                                | Dependências |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ------------ |
| [E01 — Conta administradora de desenvolvimento](01-admin-dev.md)        | Cadastro pelo proprietário e bootstrap SQL pelo agente | F01–F08      |
| [E02 — Modelo, contratos e migração](02-modelo-contratos.md)            | Convites, estados e matriz de autorização              | F01–F08      |
| [E03 — Consulta de membros e contas sem vínculo](03-consulta-equipe.md) | Consultas administrativas isoladas por tenant          | E02          |
| [E04 — Convites e aceite](04-convites-aceite.md)                        | Emissão, reenvio, entrega e aceite transacional        | E02          |
| [E05 — Cargos e revogação](05-cargos-revogacao.md)                      | Promoção, remoção e tratamento de concorrência         | E02, E04     |
| [E06 — Interfaces de equipe e convite](06-interfaces.md)                | Fluxos Shadcn ligados à API                            | E01, E03–E05 |
| [E07 — Validação integrada](07-validacao-integrada.md)                  | Percurso com administrador e técnico                   | E01–E06      |
- [x] E01 concluída — conta admin dev vinculada pelo bootstrap; API regular e login em `localhost` validados.
- [x] E02 concluída — modelo, contratos e migração validados em banco descartável.
- [x] E03 concluída — endpoints administrativos de membros e contas sem vínculo ativo, com autorização por tenant.
- [x] E04 concluída — Mailpit/OTP, envio/reenvio, falha e aceite transacional validados.
- [x] E05 concluída — promoção, revogação, revisões e corridas validadas; `0003` aplicada ao dev.
- [x] E06 concluída — interfaces de equipe e aceite do convite conectadas à API; validação visual autenticada fica na E07.
- [x] E07 concluída — integração, desktop, Android e ações de todos os cargos confirmados; problemas visuais mobile adiados por decisão do proprietário.

E01 configurou o acesso interno no banco de dev. E02 definiu contratos e persistência; E03–E05 implementaram consultas, convites, aceite, promoção e revogação. E06 implementou as interfaces Shadcn. Em E07, integrações passaram e o proprietário confirmou desktop, convite/aceite, ações entre cargos e fluxo funcional no Android. Inconsistências de layout mobile foram registradas para correção posterior e não bloqueiam o encerramento da slice.

## Limites e decisões

- Sem criação pública de workspace, superadmin global, parques, chamados, offline, push ou implantação de produção.
- Exclusão global de conta, anonimização e sucessão no fluxo de autoexclusão ficam para uma task futura de identidade; não expor esse controle nesta slice. Não declarar todo o roadmap 04 concluído.
- Administração de equipe é online. Mailpit valida e-mails em dev; Resend real só terá evidência quando configurado e exercitado.
- Convite: 48 horas, uso único, e-mail normalizado, cargo Técnico por padrão e reenvio invalidando o anterior. Nenhuma vinculação por simples escolha da conta na listagem.
- Admin pode promover/revogar técnicos. Pode rebaixar a si mesmo ou sair se outro admin ativo continuar no workspace; o último admin precisa promover um técnico antes. Outro admin não pode rebaixar nem remover um administrador.
- Reintegração: convite emitido depois da revogação reativa a membership existente com o cargo do convite e incrementa sua revisão. Aceite, convite, promoção e revogação serializam por workspace; revogação invalida convites pendentes para o e-mail correspondente.
- Referências Pencil são externas; em E06, o documento foi reconfirmado e, pela autorização anterior do proprietário, as telas ausentes foram compostas com base no design system existente.

## Aceite da slice

- [x] Conta dev explicitamente indicada possui membership admin ativa, sem alterar senha ou verificação por SQL.
- [x] Admin consulta somente membros do próprio workspace e contas realmente sem vínculos ativos.
- [x] Convite só é aceito pela conta verificada correspondente, com segunda etapa concluída e prazo vigente.
- [x] Reenvio, aceite concorrente e remoção não criam vínculos duplicados nem restauram acesso por token antigo.
- [x] Técnico não consulta diretório administrativo, convida, promove ou remove pessoas.
- [x] Admin não consegue remover/rebaixar outro admin; último admin não sai nem se rebaixa sem promover um técnico.
- [x] Revogação bloqueia novas requisições e operações concorrentes respeitam a ordem transacional.
- [x] Interface desktop e Android validada funcionalmente; problemas de layout mobile anotados para melhoria posterior.
- [x] Migrações, grants, integração e limites documentados em E07.

## Evidência do planejamento

Planos criados a pedido do proprietário após a fundação. Nenhuma task executada, conta criada, promoção aplicada ou convite enviado nesta preparação. O bootstrap existente é reutilizado; sua execução em dev ocorrerá em E01 após identificar a conta escolhida.

Verificação documental: oito arquivos conferidos, links locais existentes e checkboxes de implementação pendentes; `git diff --check` passou. Testes da aplicação e `pnpm check` não foram executados porque esta entrega altera somente documentação.

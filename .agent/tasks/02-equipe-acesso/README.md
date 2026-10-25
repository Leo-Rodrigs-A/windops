# Slice 02 — Equipe e acesso ao workspace

## Status

Em andamento. Depende da [slice 01 — Fundação](../01-fundacao/README.md), concluída. E01 e E02 concluídas: conta admin configurada no banco persistente; modelo, contratos, migração e limites de acesso da tabela de convites definidos e validados. Próxima: E03 — consulta de membros e contas sem vínculo. E04–E07 seguem planejadas.

- [ ] Slice concluída: implementação e aceites comprovados.

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
- [ ] E03 concluída.
- [ ] E04 concluída.
- [ ] E05 concluída.
- [ ] E06 concluída.
- [ ] E07 concluída.

E01 configurou o acesso interno no banco de dev. E02 definiu contratos e persistência; endpoints e telas de gestão ainda planejados não foram implementados.

## Limites e decisões

- Sem criação pública de workspace, superadmin global, parques, chamados, offline, push ou implantação de produção.
- Exclusão global de conta, anonimização e sucessão no fluxo de autoexclusão ficam para uma task futura de identidade; não expor esse controle nesta slice. Não declarar todo o roadmap 04 concluído.
- Administração de equipe é online. Mailpit valida e-mails em dev; Resend real só terá evidência quando configurado e exercitado.
- Convite: 48 horas, uso único, e-mail normalizado, cargo Técnico por padrão e reenvio invalidando o anterior. Nenhuma vinculação por simples escolha da conta na listagem.
- Admin pode promover técnico; não remove nem rebaixa administrador. Remoção revoga membership e preserva identidade e histórico.
- Reintegração proposta: convite novo aceito reativa a membership existente com o cargo autorizado do convite; revogação invalida convites anteriores. E02 deve fechar as transações e estados dessa regra.
- Referências Pencil externas devem ser reconfirmadas antes de E06. Ausência de telas de equipe exige esclarecer a composição com o proprietário, conforme o fluxo de design.

## Aceite da slice

- [ ] Conta dev explicitamente indicada possui membership admin ativa, sem alterar senha ou verificação por SQL.
- [ ] Admin consulta somente membros do próprio workspace e contas realmente sem vínculos ativos.
- [ ] Convite só é aceito pela conta verificada correspondente, com segunda etapa concluída e prazo vigente.
- [ ] Reenvio, aceite concorrente e remoção não criam vínculos duplicados nem restauram acesso por token antigo.
- [ ] Técnico não consulta diretório administrativo, convida, promove ou remove pessoas.
- [ ] Admin não remove/rebaixa outro admin nem usa esta interface para remover a si próprio.
- [ ] Revogação bloqueia novas requisições e operações concorrentes respeitam a ordem transacional.
- [ ] Interface desktop/mobile, erros recuperáveis e acessibilidade validados.
- [ ] Migrações, grants, integração e limites documentados em E07.

## Evidência do planejamento

Planos criados a pedido do proprietário após a fundação. Nenhuma task executada, conta criada, promoção aplicada ou convite enviado nesta preparação. O bootstrap existente é reutilizado; sua execução em dev ocorrerá em E01 após identificar a conta escolhida.

Verificação documental: oito arquivos conferidos, links locais existentes e checkboxes de implementação pendentes; `git diff --check` passou. Testes da aplicação e `pnpm check` não foram executados porque esta entrega altera somente documentação.

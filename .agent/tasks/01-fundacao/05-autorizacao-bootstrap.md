# F05 — Autorização por workspace e bootstrap

## Status e dependências

Planejada. Depende de [F03](03-schema-migracoes.md) e [F04](04-autenticacao.md).

- [ ] Task concluída.

## Objetivo e escopo

Dar acesso à home somente a membros autorizados, fornecer contexto real para a interface e preparar o primeiro administrador de forma explícita. Não implementar criação pública de workspace, convites nem gestão completa de cargos/membros.

## Plano de implementação

- [ ] Criar serviço público de autorização em `workspaces`, consumindo identidade validada pelo serviço público de `identity`. Toda requisição de negócio deve exigir segunda etapa concluída e membership ativa no workspace selecionado.
- [ ] Validar workspace e cargo no servidor; não confiar em IDs/cargos do browser nem substituir essa checagem pelo limite de um workspace. A revogação deve valer na próxima requisição autorizada, sem depender da expiração de cookie ou cache frontend.
- [ ] Implementar `GET /api/me` com identidade mínima e memberships autorizadas, sem dados de autenticação internos. Conta autenticada sem vínculo recebe lista vazia. Definir schema compartilhado/OpenAPI e erros 401 para sessão ausente/incompleta e 403 para acesso ao workspace sem permissão.
- [ ] Implementar `GET /api/workspaces/:workspaceId/context` com identificação do workspace e cargo do solicitante, usando o guard comum. Esta é a chamada protegida da home inicial, sem retornar lista de usuários, issues fictícias ou dados de outro tenant.
- [ ] Documentar matriz de acesso: visitante e desafio pendente não acessam contexto; órfão acessa somente sua identidade; Técnico e Administrador acessam contexto do próprio workspace. Deixar guard de cargo preparado para operações futuras sem expor endpoints administrativos vazios.
- [ ] Fornecer procedimento SQL administrativo transacional de bootstrap com UUID explícito de usuário existente e verificado e nome/ID de workspace. Criar o único workspace se necessário e vincular o administrador; repetição idêntica é no-op e entrada conflitante falha sem promover/substituir outra conta silenciosamente.
- [ ] Bootstrap usa acesso administrativo separado do runtime, não roda no startup e nunca escolhe o primeiro cadastro. Documentar criação prévia da conta, verificação dos IDs e conferência final. Não entregar senha padrão nem inserir segredos em seeds.
- [ ] Criar fixtures isoladas de administrador, técnico e órfão, separadas do procedimento real de bootstrap. Testar dois workspaces no banco descartável conforme F03 e garantir que o singleton continua presente no schema normal.

## Testes e aceite

- [ ] API rejeita visitante, sessão antes do código, workspace forjado e membership revogada; o guard é testado no servidor, não somente por redirect no cliente.
- [ ] Técnico/admin acessam o próprio contexto; usuário com vínculo em A não lê B; órfão não recebe dados de nenhum workspace.
- [ ] `GET /api/me` expõe só dados mínimos da própria conta e memberships válidas. Identidade não importa repositório privado de workspaces nem vice-versa.
- [ ] Bootstrap repetido não duplica registros, não altera cargos de outro usuário e falha em usuário inexistente/não verificado ou conflito de workspace.
- [ ] `pnpm check` e integração de autorização PostgreSQL passam; endpoints documentados no OpenAPI sem habilitar CRUD de domínio ainda ausente.

## Evidências

Pendente. Registrar matriz de permissões testada, procedimento de bootstrap, fixture de dois tenants e evidência de revogação imediata no servidor, sem dados pessoais reais.

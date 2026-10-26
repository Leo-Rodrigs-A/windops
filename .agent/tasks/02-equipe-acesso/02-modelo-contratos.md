# E02 — Modelo, contratos e migração de equipe

## Status e dependências

Concluída em 25/10/2026. Depende da fundação; E01 também foi concluída.

- [x] Task concluída.

## Objetivo e escopo

Fechar o modelo de convites, a matriz de permissões e os contratos de equipe antes dos endpoints e telas. Reutilizar memberships e guards existentes.

## Plano de implementação

- [x] Revisar `.agent/database.md`, schema e serviços públicos de identity/workspaces; registrar o estado aplicado e as novas entidades propostas.
- [x] Modelar UUID, workspace, e-mail normalizado, role, autor, SHA-256 do token, criação/expiração, consumo, revogação e substituição; token bruto não é armazenado nem retornado.
- [x] Definir constraints, FKs tenant, índices de paginação e unicidade de convite não terminal por workspace/e-mail. Validade não depende de relógio em índice; convite expirado é substituído por reenvio sem apagar histórico.
- [x] Fechar entrega: SMTP/Resend roda após commit. `sent` registra sucesso; falha termina convite (`failed` + revogado). `pending` cobre queda antes da confirmação; novo envio cria e substitui. Não há outbox nem retry automático nesta etapa.
- [x] Definir aceite futuro em transação: bloquear convite, conferir hash/expiração/estado e identidade verificada com segunda etapa; atualizar/reactivar membership e consumir convite atomicamente. Revogação invalida convites vigentes; retry antigo não reativa acesso.
- [x] Definir matriz: admin lista/convida/promove/revoga técnico; pode rebaixar a si mesmo ou sair se outro admin ativo permanecer. Outro admin não rebaixa/remove admin, e o último admin é protegido sob lock do workspace.
- [x] Propor contratos e resultados: `GET /api/workspaces/:workspaceId/members`, `GET /api/workspaces/:workspaceId/directory`, `GET /api/workspaces/:workspaceId/invitations`, `POST /api/workspaces/:workspaceId/invitations`, `POST /api/workspaces/:workspaceId/invitations/:invitationId/resend`, `POST /api/invitations/accept`, `PATCH /api/workspaces/:workspaceId/members/:userId` e `DELETE` no mesmo recurso. Aceite recebe somente token e resolve workspace pelo registro validado.
- [x] Definir DTOs mínimos/paginação cursor UUID e limite 1–100 (padrão 25), e erros futuros: 401 sessão ausente/incompleta; 403 papel/tenant; 404 convite inexistente sem revelar tenant; 409 duplicidade/estado terminal/conflito de cargo ou último admin; 410 convite expirado; 422 e-mail verificado incompatível; entrega falha recuperável criando novo convite.
- [x] Delimitar fronteira identity: workspaces usa `IdentityService.resolveAuthenticatedUser` para ator autenticado; consulta/listagem de diretório e lookup de e-mail/usuário serão serviços públicos de identity em E03/E04, sem importar schema/repositórios privados. Verificação de titularidade ocorre no serviço identity; mutação de membership/convite permanece em workspaces.
- [x] Gerar/revisar migração Drizzle `0002_workspace_invitations`; garantir grants DML da API e ausência de SELECT/publicação para Electric.
- [x] Documentar contratos, concorrência, política de entrega e decisões em `.agent/database.md` e `.agent/architeture.md`.

## Dados e limites

Convites pertencem a workspaces. Não adicionar roles globais, tabelas de parques/issues ou exclusão de conta nesta migração. Datas de validade usam relógio do servidor/banco; e-mail é aparado/minúsculo, sem regras especiais de provedor.

## Validação e aceite

- [x] Aplicação da migração e upgrade/reaplicação no banco descartável; banco dev persistente não alterado.
- [x] Constraints/índices de normalização, unicidade, digest, estados, tenant e substituição conferidos por integração PostgreSQL.
- [x] API tem DML mínimo via grants padrão; role de replicação não possui acesso a convites e a publicação continua limitada a `workspaces`.
- [x] Contratos e especificação cobrem expiração, reenvio, corridas de unicidade, identidade incompatível e erro de entrega.
- [x] `pnpm check`, integração PostgreSQL, verificação de privilégios e documentação atualizados.

## Evidências

Migração Drizzle `0002_workspace_invitations` criada com tabela, 4 índices, checks e FKs, incluindo FK explícita para `auth_users` sem importar schema de identity. Ordem revisada para criar índice composto antes da FK autorreferenciada. A integração prepara o schema até `0001`, insere workspace e membership existentes, aplica `0002` e reaplica migrações; os dados antigos permanecem. No mesmo banco descartável, confere DML de runtime, unicidade de convite ativo, e-mail normalizado, digest com 32 bytes e referência de substituição no mesmo tenant. A role Electric não lê a tabela e ela não pertence à publicação. O banco persistente `windops` não recebeu a migração. `pnpm check`, `drizzle-kit check` e `pnpm test:workspaces-integration` passaram.

Decisões: validade de 48h; token aleatório base64url de 32 bytes, armazenado como SHA-256; role padrão `technician`; falha de entrega revoga o convite e exige reemissão; queda após commit deixa `pending`, recuperável por novo envio que substitui o registro. Nenhum endpoint E03–E05 foi implementado nesta task.

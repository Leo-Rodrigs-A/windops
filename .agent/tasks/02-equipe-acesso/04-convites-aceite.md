# E04 — Emissão, reenvio e aceite de convites

## Status e dependências

Concluída em 25/10/2026. Depende de E02 e E03, concluídas.

- [x] Task concluída.

## Objetivo e escopo

Convidar por e-mail e permitir aceite apenas pela identidade correspondente, verificada e com segunda etapa concluída. Prazo de 48 horas, uso único e reenvio invalidante.

## Plano de implementação

- [x] Implementar `POST /api/workspaces/:workspaceId/invitations` e reenvio somente para admin ativo; normalizar e-mail, validar role e usar `technician` como padrão.
- [x] Gerar token aleatório de 32 bytes, persistir somente SHA-256 e omitir token dos DTOs/respostas. Limites: 10 emissões/reenvios por admin/hora, 5 por workspace/e-mail/24h e 30 tentativas de aceite por IP/minuto; rate keys armazenadas como HMAC.
- [x] Implementar `POST /api/workspaces/:workspaceId/invitations/:invitationId/resend`; locks por workspace/convite serializam corridas e somente um token permanece utilizável.
- [x] Integrar `EmailSender` SMTP e validar entrega real ao Mailpit. Link é formado com `APP_ORIGIN`, independente de Host enviado pelo cliente, e leva token no fragmento `#token=...`.
- [x] Em falha de entrega, marcar convite `failed` e revogado, retornar 502 sem afirmar envio; reemissão cria outro convite e nunca reutiliza token falho.
- [x] Criar `POST /api/invitations/accept`, autenticado e sem workspace no body. GET não consome token; token sozinho não concede membership. O código de segundo fator continua obrigatório antes de aceitar.
- [x] Aceitar em transação: reler/verificar e-mail da conta sob lock, validar SHA-256, prazo via relógio do banco e estado; inserir/reativar membership e consumir convite no mesmo commit.
- [x] Se já houver membership ativa, retornar conflito sem consumir convite ou alterar cargo. Membership revogada só é reativada por convite emitido depois da revogação.
- [x] Serializar criação, reenvio e aceite pela linha do workspace; bloquear convite e membership em ordem definida para coordenar a futura revogação E05. Replay não duplica membership nem restaura vínculo removido com token antigo.
- [x] Rejeitar conta não verificada, e-mail incompatível, sessão antes do OTP, convite expirado/terminal, técnico emissor e role forjada; workspace é resolvido só pelo convite validado.
- [x] Proteger o segredo: nenhum token em DTO, log explícito ou publicação Electric; link usa fragmento, não há analytics. Não enviar convite a pessoa real sem solicitação do proprietário.

## Validação e aceite

- [x] Mailpit enviou convite a conta preexistente verificada; a mesma conta completou o OTP e só então aceitou. `pnpm test:auth-integration` também cobriu cadastro/verificação em fluxo separado.
- [x] Validade emitida comparada a 48 horas (tolerância inferior a 1s); aceite no limite expirado recebe 410; token antigo após reenvio recebe 409.
- [x] Aceites e reenvios concorrentes deixam um só vencedor; replay pós-aceite e token anterior à revogação não recuperam membership.
- [x] E-mail errado, conta não verificada, sessão pré-código, role forjada e técnico emissor rejeitados.
- [x] Falha SMTP devolve 502, registra `failed`/revogado e permite convite novo; token da falha segue inválido. Limites de envio e aceite exercitados.
- [x] `pnpm check`, `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, permissões PostgreSQL e documentação dos contratos passam.

## Evidências

Implementados no serviço de `workspaces` os endpoints de criação, reenvio e aceite. O hash nunca sai da persistência; segredo enviado somente por e-mail como fragmento da URL configurada. Locks seguem ordem workspace → convite → identidade/membership; falha de entrega marca o registro como failed/revogado e permite reemissão com token novo. Rate limits: 10 por admin/hora, 5 por endereço/workspace/24h, 30 aceites/IP/minuto. `0002_workspace_invitations` foi aplicada ao PostgreSQL dev persistente e `pnpm db:permissions` confirmou DML mínimo e negação de acesso Electric.

Validação: `pnpm check` passou (lint/boundaries, TypeScript, 16 testes e builds); `pnpm test:workspaces-integration` passou em banco descartável com Mailpit, conta preexistente + OTP, emissão/reenvio/aceite, falha SMTP, expiração, corridas, conta já membro, reativação sem duplicação, revogação, hash e rate limits. `pnpm test:auth-integration` passou em cadastro/verificação/OTP. `pnpm db:permissions` passou no banco dev. Nenhum convite foi enviado a destinatário real; Resend externo não foi testado. A rota frontend `/invite/accept` fica para E06; até lá, não enviar convites a usuários finais.

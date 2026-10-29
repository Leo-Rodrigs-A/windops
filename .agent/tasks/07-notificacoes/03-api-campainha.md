# N03 — API da campainha

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Oferecer consulta individual e leitura durável autorizada.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

API da campainha implementada e integrada ao servidor; validação PostgreSQL descartável aprovada.

## Dependências

N02.

## Plano

- [x] Implementar lista recente primeiro com cursor timestamp/UUID, contagem de não lidas e marcação de leitura idempotente para o destinatário autenticado.
- [x] Revalidar membership ativa em todas as rotas e serializar escrita com revogação; impedir acesso a notificações de outro usuário mesmo no mesmo tenant.
- [x] Definir DTO mínimo contendo apenas ID, issueId, tipo e timestamps; detalhe de issue continua sujeito à autorização própria.
- [x] Validar paginação, leitura repetida, cursor de outro tenant, sessão incompleta e destinatário incorreto em PostgreSQL descartável.
- [x] Manter consulta e marcação online; não adicionar shape pessoal. Atualização ao abrir/retomar e polling limitado pertencem à N05.

## Contratos e dados afetados

Contratos/API e consultas do módulo notifications; sem ampliar a fila offline.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026 — Adicionados contratos estritos, GET `/api/workspaces/:workspaceId/notifications` com paginação `(created_at DESC, id DESC)`/contagem não lida e POST `/:notificationId/read`. A leitura é idempotente e, na mesma transação, revalida/serializa membership ativa com revogação; usuário fora do destinatário recebe 404. DTO não expõe texto, snapshots ou nomes de outros atores. `pnpm test:issues-integration` passou em PostgreSQL descartável para sessão anônima, paginação, cursor pertencente a outro workspace, leitura repetida e isolamento de destinatário. `pnpm check` passou (54 testes e builds); `git diff --check` passou. Consulta permanece online, sem shape Electric nem fila offline.

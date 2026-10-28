# N03 — API da campainha

## Status

Planejada

- [ ] Task concluída

## Objetivo

Oferecer consulta individual e leitura durável autorizada.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Planejamento; nenhuma implementação desta task executada. Diagnóstico da base no índice da slice.

## Dependências

N02.

## Plano

- [ ] Implementar lista recente primeiro com cursor timestamp/UUID, contagem de não lidas e marcação de leitura idempotente para o destinatário autenticado.
- [ ] Revalidar membership ativa em todas as rotas e serializar escrita com revogação; impedir acesso a notificações de outro usuário mesmo no mesmo tenant.
- [ ] Definir DTO mínimo e link para issue sem vazar snapshots privados; detalhe de issue continua autorizado independentemente do aviso.
- [ ] Validar paginação empatada, leitura repetida/concorrente, segundo tenant, sessão incompleta, órfão e revogação.
- [ ] Manter consulta e marcação online neste recorte; documentar atualização por consulta ao abrir/retomar e polling limitado, sem novo shape pessoal nesta slice.

## Contratos e dados afetados

Contratos/API e consultas do módulo notifications; sem ampliar a fila offline.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026: task planejada; implementação e testes de aplicação não executados.

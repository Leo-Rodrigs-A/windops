# N04 — Subscrições e worker de push

## Status

Planejada

- [ ] Task concluída

## Objetivo

Entregar intenções persistidas com retry recuperável no monólito.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Planejamento; nenhuma implementação desta task executada. Diagnóstico da base no índice da slice.

## Dependências

N01–N03.

## Plano

- [ ] Implementar registro/remoção idempotente de subscrição por usuário/workspace/dispositivo, validar tamanho/formato/endpoint HTTPS e evitar requisições a destinos internos arbitrários; não expor endpoint ou chaves em logs.
- [ ] Configurar VAPID privada somente no servidor e chave pública por contrato próprio; sem segredo em VITE_. Desabilitado ou sem configuração deve ter estado explícito.
- [ ] Implementar claim concorrente com lease, backoff limitado, recuperação após crash e encerramento do worker; não manter transação aberta durante chamada de rede.
- [ ] Revalidar elegibilidade antes do envio, tratar revogação/logout e troca de conta; documentar limite de revogação concorrente com envio já em voo.
- [ ] Tratar 404/410 como endpoint expirado, 429/5xx como falhas recuperáveis e falhas permanentes com diagnóstico; uma subscrição falhar não bloqueia as outras.
- [ ] Testar dois workers, lease expirada, restart, resposta perdida, duplicação de comando, múltiplos aparelhos e provedor indisponível com transporte controlado. Não alegar entrega real usando mock.

## Contratos e dados afetados

Worker do mesmo monólito, adaptador push e rotas de subscrição; sem Redis ou e-mail de eventos.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026: task planejada; implementação e testes de aplicação não executados.

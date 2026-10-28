# N01 — Contratos e política de entrega

## Status

Planejada

- [ ] Task concluída

## Objetivo

Definir destinatários, canais e semântica de sincronização antes de persistir entregas.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Planejamento; nenhuma implementação desta task executada. Diagnóstico da base no índice da slice.

## Dependências

Slices 05/06.

## Plano

- [ ] Mapear todos os eventos realmente emitidos: criação gera campainha e push; demais eventos somente campainha; excluir ator e membros sem acesso. Não reintroduzir restauração de relato removida na L01.
- [ ] Definir destinatários no instante do evento e revalidar acesso na consulta/entrega; explicitar comportamento após revogação, reentrada e novos membros.
- [ ] Especificar contratos estritos de lista, contagem, leitura idempotente, subscrição e remoção, com cursor estável e identidade derivada da sessão.
- [ ] Resolver o significado de criação/conclusão recebidas juntas: sender atual envia requisições individuais. Definir protocolo verificável de lote/finalização, interrupção e retry; uma janela de tempo sozinha não comprova lote.
- [ ] Compatibilizar lote com a espera de uma hora desde created_at no servidor: não aceitar conclusão inválida nem suprimir criação por uma intenção não confirmada. Registrar casos viáveis e pedir decisão do proprietário se o requisito exigir mudar a regra temporal.
- [ ] Documentar limite da garantia: unicidade de intenção/entrega local não garante exatamente uma apresentação externa se o provedor aceitar e a confirmação se perder. Definir política explícita de retry e identificação estável.
- [ ] Atualizar contratos e decisões em memória/database; decisões de produto pendentes bloqueiam somente implementação dependente.

## Contratos e dados afetados

Matriz evento/canal/destinatário e contratos; nenhuma mudança implícita na regra de uma hora.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026: task planejada; implementação e testes de aplicação não executados.

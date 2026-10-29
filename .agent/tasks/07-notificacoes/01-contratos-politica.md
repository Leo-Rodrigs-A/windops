# N01 — Contratos e política de entrega

## Status

Concluída em 28/10/2026

- [x] Task concluída

## Objetivo

Definir destinatários, canais e semântica de sincronização antes de persistir entregas.

## Escopo e exclusões

Recorte da [slice 07](README.md). Sem deploy ou e-mails de eventos.

## Estado atual

Política definida; implementação pertence às tasks N02–N06. O sender atual continua individual e ordenado por dependências.

## Dependências

Slices 05/06.

## Plano

- [x] Mapear eventos/canais: criação gera campainha e intenção de push; demais eventos somente campainha; excluir ator da ação e destinatários sem acesso. Restauração de relato não existe.
- [x] Definir público como membros ativos no instante da transição, exceto ator; consulta/entrega revalidam autorização. Revogação impede leitura e novos envios; reentrada não recupera avisos que não foram gerados; novos membros não recebem retroativamente.
- [x] Definir contratos futuros de lista por destinatário, contagem não lida, leitura idempotente, cursor `(created_at DESC, id DESC)` e subscrição/remover dispositivo. Identidade vem da sessão; workspace é autorizado no servidor.
- [x] Resolver criação e conclusão offline: não é necessário lote nem transação longa. Quando a conclusão válida é confirmada antes de o worker reivindicar o push de criação, cancelar essa entrega pendente. A campainha mantém o evento de criação e registra a conclusão; a criação não gera push. Se o push já foi reivindicado ou aceito pelo serviço externo, não tentar desfazê-lo e seguir com a campainha de conclusão.
- [x] Preservar a espera atual: criação offline recebe `created_at` ao ser aceita pelo servidor e o criador só pode iniciar após uma hora medida pelo relógio do banco. Conclusão inválida fica rejeitada/aguardando elegibilidade; ela não cancela o push. Se esse intervalo fizer o worker enviar primeiro, aplica-se o caso de push já enviado. Não antecipar a regra para suprimir push.
- [x] Definir que o cancelamento só vale enquanto a entrega estiver pendente e não reivindicada. A reivindicação é o ponto de corrida; unicidade no banco evita duplicar intenção, mas push externo pode aparecer mais de uma vez se o provedor aceitar e a confirmação se perder. Usar `eventId` estável no payload e retry limitado, sem prometer exatamente uma exibição.
- [x] Atualizar memória e contrato de entrega; schema será detalhado em N02.

## Contratos e dados afetados

Matriz evento/canal/destinatário registrada em memória e neste contrato. N02 deve prever estado cancelável antes do claim e claim atômico que serializa com conclusão; nenhuma fronteira de lote é necessária. Sem mudança de schema nesta task.

## Testes e aceite

Task documental. Conferir consistência com a regra de uma hora, serviço de audit e sender; registrar que testes de aplicação não são necessários nesta task.

## Evidências

28/10/2026 — Política concluída após verificar `command-sender`, regra de elegibilidade, timestamps de criação offline, serviço de audit e contratos/schema de recibos. A conclusão offline pode invalidar o push de criação enquanto ele ainda não foi reivindicado pelo worker; eventos e avisos internos permanecem íntegros. A regra da hora é mantida: criação recém-aceita no servidor não pode ser concluída pelo criador antes do prazo, então não se presume que os dois comandos sempre chegarão juntos. A corrida com envio externo não oferece garantia de exatamente uma exibição. Sem alteração de fonte, schema ou testes de aplicação.

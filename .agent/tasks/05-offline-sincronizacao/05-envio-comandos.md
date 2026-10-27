# S05 — Envio, dependências e retries de comandos

## Status

Planejada

- [ ] Task concluída

## Objetivo

Enviar a fila com o app aberto ou retomado, garantindo retry idempotente e ordenação por issue.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

## Dependências

S01, S02 e S04 concluídas; política temporal da S01 resolvida para os caminhos habilitados.

## Escopo e exclusões

Criar/editar/iniciar/devolver/concluir issues offline e enviar por serviços públicos existentes. Gestão de equipe/catálogo e liberação administrativa permanecem online nesta slice.

## Plano de implementação

- [ ] Implementar executor durável acionado na abertura/retomada e recuperação de conectividade, com backoff limitado e jitter; navigator.onLine é pista, respostas da API determinam resultado.
- [ ] Antes de enviar, revalidar sessão/membership pelo servidor; derivar ator da sessão. Reutilizar endpoints transacionais e sync_commands, sem escrever audit/issue diretamente a partir do executor.
- [ ] Enviar predecessores antes dos descendentes. Materializar expectedRevision de um sucessor ainda não enviado a partir do ACK conhecido do predecessor próprio; congelar payload antes da primeira transmissão. Mudança remota concorrente exige conflito, nunca rebase silencioso.
- [ ] Retentar timeout/5xx/resposta perdida com mesma chave e payload; persistir ACK antes de liberar dependências. Recuperar crash depois do commit remoto e antes do ACK local por replay sem novo evento.
- [ ] Classificar 401/segunda etapa como pausa, 403/revogação como bloqueio, 409 como conflito e payload inválido como erro definitivo corrigível; falha de uma issue bloqueia seus descendentes, não todas as outras.
- [ ] Aplicar a política de uma hora definida na S01 sem permitir que o relógio do aparelho autorize sozinho. Aguardar elegibilidade ou intervenção com texto preservado; não fingir atendimento confirmado antes da resposta.
- [ ] Permitir relato local editável somente offline e antes de tentativa de envio, conforme S01. Resposta desconhecida congela o comando até reconciliação; não alterar hash em retry.
- [ ] Registrar IDs/ordem de uma cadeia offline para futura regra de notificações criação+conclusão. Não implementar push/outbox de notificações; documentar como a etapa 09 reconhecerá a cadeia sem disparar notificações retroativas.

## Contratos e dados afetados

Contratos existentes de issues e recibos sync_commands; extensões mínimas compatíveis somente se justificadas pela S01. IDs e autoria de evento permanecem server-side e estáveis no replay.

## Testes e aceite

- [ ] Criar→editar→iniciar→concluir com reinício entre cada etapa, incluindo espera do autor; validar revisões, eventos únicos e relato preservado.
- [ ] Derrubar resposta depois de commit, duplicar envio em duas abas/aparelhos e interromper gravação de ACK; replay nunca reaplica mudança.
- [ ] Induzir revogação, expiração, equipamento arquivado/excluído durante desconexão e mudança remota de revisão; pausar descendentes e continuar issues independentes.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

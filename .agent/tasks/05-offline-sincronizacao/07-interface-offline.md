# S07 — Interface de campo e status de sincronização

## Status

Planejada

- [ ] Task concluída

## Objetivo

Conectar Home, detalhe, catálogo e Histórico à base local e mostrar o estado real de cada gravação.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

## Dependências

S04–S06 concluídas.

## Escopo e exclusões

Adaptar telas existentes e indicador Cloud; Bell/notificações, novos KPIs e redesenho amplo ficam fora.

## Plano de implementação

- [ ] Reconfirmar documento Pencil ativo antes de usá-lo; aproveitar design system/fluxo autorizado. Se faltarem referências de estados offline, registrar a lacuna e compor controles funcionais existentes sem inventar layout definitivo nem editar .pen.
- [ ] Usar consultas locais nas telas de issues/catálogo e gravar intenção durável antes de sucesso; manter fallback online controlado enquanto o aparelho ainda não foi preparado.
- [ ] Mostrar salvo no aparelho, pendente, enviando, confirmado, aguardando autenticação, conflito e erro de armazenamento com linguagem clara. Cloud abre status/pendências e última sincronização confirmada, em vez de se basear apenas em navigator.onLine.
- [ ] Oferecer preparação offline com progresso e disponibilidade por conjunto, retry e exportação. Sem cache, explicar necessidade da primeira conexão; evitar tela vazia enganosa.
- [ ] Alinhar ordenação com a solicitação do proprietário: recentes primeiro nas issues, conclusões e logs, com UUID de desempate e paginação compatível; revisar consulta API se necessário para não inverter somente uma página.
- [ ] Integrar conclusão e relato local pendente com edição apenas antes de envio; confirmadores e avisos em modais Shadcn. Estado de atendimento local pendente não implica atendimento adquirido no servidor.
- [ ] Manter navegação Home/Histórico/Parques/Conta, logout na conta e marca monocromática. Catálogo administrativo, equipe e liberação por admin exigem rede; habilitar somente ações realmente suportadas offline.
- [ ] Validar teclado, foco, leitor de tela, temas e tamanhos móveis; erros/conflitos conservam formulário e não se limitam a cor/ícone. Não anunciar pronto offline antes de storage e cache confirmados.

## Contratos e dados afetados

Consumidores locais em issues-pages, parks-page, auth e workspace-system-actions; contratos de status não expõem termos internos de implementação ao usuário.

## Testes e aceite

- [ ] Percorrer admin/técnico online, modo avião, cache ausente, sessão expirada, quota, conflito e retomada; mensagem de sucesso só após commit local.
- [ ] Concluir offline, voltar ao detalhe, editar relato permitido, enviar e confirmar bloqueio de edição após tentativa; avisos usam modais.
- [ ] Conferir ordenação global/paginação da Home, Histórico e eventos e o indicador Cloud em rede disponível com API indisponível.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

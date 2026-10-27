# Slice 05 — Operação offline e sincronização

## Status

Em andamento desde 27/10/2026, após aprovação da slice 04 pelo proprietário. S01–S04 concluídas em 27/10; próxima task S05.

- [ ] Slice concluída

## Resultado esperado

Um dispositivo previamente autenticado e preparado permite consultar catálogo/issues/logs e registrar trabalho sem rede. A gravação local durável precede o feedback; fechar/reabrir o app preserva comandos. Ao abrir/retomar conectado, a fila envia com autorização renovada, retries idempotentes e conflitos visíveis. Outro membro recebe a atualização pelo proxy Electric autorizado. Nenhuma operação em memória é anunciada como persistência durável.

## Base existente conferida

- Slices [01](../01-fundacao/README.md), [02](../02-equipe-acesso/README.md), [03](../03-parques-turbinas/README.md) e [04](../04-registro-atendimento/README.md) concluídas. A aprovação da slice 04 é funcional online; não comprova durabilidade local nem suporte offline de aparelhos.
- API de issues tem UUIDs, revisão, mutação/evento/recibo atômicos e retry autorizado. `sync_commands` é recibo remoto; S02 adiciona journal local de projeções/comandos, ainda sem envio.
- `apps/api/src/modules/sync/routes.ts` expõe shapes pelo proxy autenticado; a publication Electric contém workspaces, catálogo e projeções sanitizadas de issues/eventos. S04 coordena `ShapeStream`s e persiste rows/checkpoints no journal TanStack/IndexedDB da S02. A interface ainda não consome essa réplica; navegadores reais adicionais não foram certificados.
- `AuthProvider` consulta sessão online nas transições; `issues-api.ts` usa HTTP diretamente; Cloud reflete apenas `navigator.onLine`. Manifest/ícones existem, mas não há service worker/offline pronto.
- Regra atual do servidor: autor inicia após uma hora da criação; outros membros iniciam imediatamente; somente responsável devolve/conclui. Sessão com segunda etapa e membership ativa são obrigatórias para upload e shapes.

## Ordem e dependências

Executar na ordem S01–S09. A política temporal foi preservada na S01; IndexedDB foi provado na S01 e implementado na S02. S01 foi concluída com a aceitação de escopo registrada; a única combinação real reportada é Galaxy A12/Android 12/Brave. Não anunciar suporte em outros navegadores/plataformas antes dos testes correspondentes.

| Task                                                                                  | Dependências                               |
| ------------------------------------------------------------------------------------- | ------------------------------------------ |
| [S01 — Prova de persistência e contratos offline](01-prova-persistencia-contratos.md) | Slices 01–04                               |
| [S02 — Armazenamento local e fila durável](02-armazenamento-outbox.md)                | S01: prova e modelo                        |
| [S03 — Proxy Electric e publicação autorizada](03-proxy-electric-autorizado.md)       | S01: shapes e autorização                  |
| [S04 — Réplica local e reconciliação](04-replica-reconciliacao.md)                    | S02, S03                                   |
| [S05 — Envio, dependências e retries de comandos](05-envio-comandos.md)               | S01, S02, S04; política temporal resolvida |
| [S06 — Acesso offline, conflitos e recuperação](06-acesso-conflitos-exportacao.md)    | S02, S03, S05                              |
| [S07 — Interface de campo e status de sincronização](07-interface-offline.md)         | S04–S06                                    |
| [S08 — PWA, reabertura e atualizações seguras](08-pwa-atualizacoes.md)                | S02, S06, S07                              |
| [S09 — Validação integrada de campo e encerramento](09-validacao-integrada.md)        | S01–S08                                    |
- [x] S01 — Prova de persistência e contratos offline — prova com fake IndexedDB passou e retomada manual reportada em Galaxy A12/Android 12 com Brave. O proprietário dispensou validações separadas de Chrome/Android e Safari/iPhone como critério de bloqueio da S01; registrar essa cobertura real sem afirmar testes nesses navegadores.
- [x] S02 — Armazenamento local e fila durável — journal IndexedDB transacional e particionado, dependências, recuperação, lease, exportação; seis testes passaram incluindo falha por quota simulada e upgrade v1→v2 preservando dados.
- [x] S03 — Proxy Electric e publicação autorizada — proxy tenant-scoped, handles HMAC vinculados a workspace/coleção e projeções sanitizadas; Electric real, grants, migrations e restore validados. Evidências e limite do workspace único em [S03](03-proxy-electric-autorizado.md).
- [x] S04 — Réplica local e reconciliação — snapshots/checkpoints atômicos, retomada, tombstones, ACK/revisão e retenção limitada; smoke Electric local e testes registrados em [S04](04-replica-reconciliacao.md).
- [ ] S05 — Envio, dependências e retries de comandos
- [ ] S06 — Acesso offline, conflitos e recuperação
- [ ] S07 — Interface de campo e status de sincronização
- [ ] S08 — PWA, reabertura e atualizações seguras
- [ ] S09 — Validação integrada de campo e encerramento

## Escopo e limites

- Recorte executável da [etapa 07](<../00 - roadmap/07-offline.md>), incluindo catálogo local da [05](<../00 - roadmap/05-parks.md>), operações já entregues na [06](<../00 - roadmap/06-issues.md>) e relato de conclusão local da [08](<../00 - roadmap/08-lifecycle.md>). Não depende da etapa 08 inteira: conclusão online já foi entregue na I09.
- Offline: leitura de catálogo, issues ativas e seus logs; criação, edição própria pendente, início/devolução e conclusão com relato opcional. Concluídas remotas são online salvo cache existente; conclusão local pendente permanece acessível. Não sincronizar o histórico inteiro indefinidamente por conveniência.
- Cadastro/edição/lifecycle de equipamentos, gestão de equipe e liberação administrativa permanecem online nesta slice. Não acrescentar fila de comandos administrativos sem ampliar contratos/idempotência e escopo explicitamente.
- Primeiro login exige conexão. Sessão expirada permite trabalho local previamente habilitado; upload exige autenticação renovada com segunda etapa. Revogação conhecida bloqueia envio e novas operações, preservando exportação das pendências do próprio usuário.
- Base temporal registrada na S01: uma hora desde `created_at` do servidor para o autor iniciar. Issue criada offline recebe essa data ao ser aceita pelo servidor; a cadeia do autor aguarda até completar uma hora. Tempo do aparelho não antecipa autorização.
- Fila usa dependências, payload congelado após tentativa e reautorização em todo replay. Atualização da réplica nunca elimina pendências nem substitui silenciosamente intenção conflitante.
- Proxy fixa coleção, colunas e filtro tenant; clientes não escolhem table/where. Auth, membership privada, convites e recibos ficam fora da publicação. Monólito modular e serviços públicos permanecem obrigatórios.
- Cloud passa a comunicar salvamento/sincronização; Bell permanece reservado. Sem push, e-mail de eventos, worker de notificações, reabertura, arquivo/reativação de issues ou restauração de relatos. Preservar correlação de cadeias offline para futura regra de criação+conclusão sem push retroativo.
- App shell/PWA deve suportar reabertura; envio garantido apenas com app aberto/retomado conectado. Armazenamento persistente não promete sobreviver a limpeza de dados/desinstalação. Quota e armazenamento indisponível devem impedir falso feedback de salvamento.
- Referências Pencil continuam externas e somente leitura, reconfirmadas quando necessárias à S07. Navegação, modais Shadcn e marca já aprovados são a base. Não criar telas finais durante o planejamento.
- Registrar cada evidência por plataforma: navegador desktop não comprova restart físico de Android/iPhone. Indisponibilidade de aparelho não autoriza marcar validação feita; provas independentes podem avançar com a lacuna registrada.

## Decisões da S01 já registradas

1. Candidato `indexedDBCollectionOptions` em `@tanstack/db` 0.15.2; journal usa mesma Collection/store para comando e projeção, com `acceptMutations` numa transação. Quota/upgrade abortado e suporte de navegador ainda precisam de validação.
2. `created_at` do servidor continua sendo autoridade; issue criada offline começa a espera do autor quando o servidor a aceita. Nada de antecipar por relógio local.
3. Escopo inicial são catálogo necessário, issues ativas, logs/dependências e metadados públicos mínimos. S03 deve provar projeções Electric e ACK versus réplica antes de ampliar publicação.
4. Nome de banco particionado por usuário/workspace; logout e troca não misturam partições; revogação conhecida bloqueia envio e preserva exportação. S02 prova retenção, recovery e limites.

## Aceite da slice

- [ ] Preparação completa e durável com catálogo, issues e logs necessários; cache parcial claramente identificado.
- [ ] Gravação local atômica, fila recuperável após encerramento/restart e update, sem sucesso falso em quota/erro.
- [ ] Envio autorizado e idempotente, dependências ordenadas e reconciliação sem duplicação ou regressão.
- [ ] Tenant/conta isolados em banco local, proxy, streams, caches, logout e respostas tardias.
- [ ] Conflitos, expiração, revogação e perda de resposta preservam conteúdo e exportação; regra temporal comprovada.
- [ ] PWA reabre offline; Cloud mostra estado real; percurso em aparelhos documentado com limitações e aceite funcional.
- [ ] Checks e integrações pertinentes aprovados, evidências datadas e documentos atualizados sem prometer funcionalidades futuras.

## Evidência do planejamento

26/10/2026: nove tasks S01–S09 preparadas a partir de arquitetura, memória, roadmap, schema/recibos, proxy desabilitado, AuthProvider e frontend online.

27/10/2026: S01 iniciada e concluída. `fake-indexeddb` 6.0.0 foi adicionada somente como devDependency; duas provas do IndexedDB/TanStack passaram. IndexedDB/journal de Collection escolhido provisoriamente. Proprietário reportou teste manual bem-sucedido do webapp instalado em Samsung Galaxy A12/Android 12, com Brave 1.98.60 (64 bits), Chromium 156.0.8078.48; issue e navegação retomaram após fechar/reabrir com e sem internet. Por orientação explícita do proprietário, Chrome e Safari/iPhone não bloqueiam a S01; não foram testados. Sem migration, escrita no banco do produto, consulta/edição do Pencil ou ativação offline.

Verificação documental em 26/10/2026: 19 documentos e 85 links locais conferidos; nove tasks com seções obrigatórias, dependências ordenadas e checkboxes abertos. `git diff --check` passou. `pnpm check` e testes de aplicação não foram executados naquela preparação documental.

S02 concluída em 27/10/2026: veja [evidências e limitações](02-armazenamento-outbox.md). Os testes usam fake IndexedDB; quota física e evicção real do navegador não foram provocadas. Formulários e envio da outbox continuam para S05/S07.

S03 concluída em 27/10/2026: veja [evidências e limitações](03-proxy-electric-autorizado.md). Electric 1.8.1 exige publicação de linhas completas e `REPLICA IDENTITY FULL`; issues são espelhadas sem identidade privada antes de entrar na publication. O banco do piloto impõe um workspace, então a integração real rejeitou UUID sem membership e teste unitário cobriu assinatura de handle entre escopos; produção/Neon segue sem validação.

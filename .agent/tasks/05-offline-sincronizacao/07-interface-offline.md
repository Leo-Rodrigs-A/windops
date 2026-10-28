# S07 — Interface de campo e status de sincronização

## Status

Concluída em 28/10/2026. Validação guiada pelo proprietário aprovada com a limitação explícita de que a continuação da paginação não foi exercitada.

- [x] Task concluída

## Objetivo

Conectar Home, detalhe, catálogo e Histórico à base local e mostrar o estado real de cada gravação.

## Estado atual

Implementação e validação do recorte concluídas em 28/10/2026; ver evidências e limites abaixo e no [índice da slice](README.md).

## Dependências

Base S04–S06, todas concluídas.

## Escopo e exclusões

Adaptar telas existentes e indicador Cloud; Bell/notificações, novos KPIs e redesenho amplo ficam fora.

## Plano de implementação

- [x] Reconfirmar documento Pencil ativo antes de usá-lo; aproveitar design system/fluxo autorizado. Se faltarem referências de estados offline, registrar a lacuna e compor controles funcionais existentes sem inventar layout definitivo nem editar .pen.
- [x] Usar consultas locais nas telas de issues/catálogo e gravar intenção durável antes de sucesso; manter fallback online controlado enquanto o aparelho ainda não foi preparado.
- [x] Mostrar salvo no aparelho, pendente, enviando, confirmado, aguardando autenticação, conflito e erro de armazenamento com linguagem clara. Cloud abre status/pendências e última sincronização confirmada, em vez de se basear apenas em navigator.onLine.
- [x] Oferecer preparação offline com progresso e disponibilidade por conjunto, retry e exportação. Sem cache, explicar necessidade da primeira conexão; evitar tela vazia enganosa.
- [x] Alinhar ordenação com a solicitação do proprietário: recentes primeiro nas issues, conclusões e logs, com UUID de desempate e paginação compatível; revisar consulta API se necessário para não inverter somente uma página.
- [x] Integrar conclusão e relato local pendente com edição apenas antes de envio; confirmadores e avisos em modais Shadcn. Estado de atendimento local pendente não implica atendimento adquirido no servidor.
- [x] Manter navegação Home/Histórico/Parques/Conta, logout na conta e marca monocromática. Catálogo administrativo, equipe e liberação por admin exigem rede; habilitar somente ações realmente suportadas offline.
- [x] Validar teclado, foco, leitor de tela, temas e tamanhos móveis; erros/conflitos conservam formulário e não se limitam a cor/ícone. Não anunciar pronto offline antes de storage e cache confirmados.

## Contratos e dados afetados

Consumidores locais em issues-pages, parks-page, auth e workspace-system-actions; contratos de status não expõem termos internos de implementação ao usuário.

## Testes e aceite

- [x] Percorrer admin/técnico online, rede indisponível com app carregado, cache ausente, sessão que precisa renovação, conflito e retomada. A expiração temporal real foi dispensada em S06. `QuotaExceededError` simulado no teste IndexedDB de S02; a UI só confirma após a Promise de gravação local resolver. Quota física do browser não foi forçada.
- [x] Concluir offline, voltar ao detalhe, editar relato permitido, enviar e confirmar bloqueio de edição após tentativa; avisos usam modais.
- [x] Conferir ordenação dos dados disponíveis em Home, Histórico e eventos e o indicador Cloud em rede disponível com API indisponível.
- [x] Paginação além da primeira página registrada como não exercitada: o workspace tem cinco issues e o proprietário dispensou criar registros persistentes só para esse teste.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

27/10/2026: MCP Pencil confirmou `/G:/Meu Drive/01 - TRABALHO/08 - PENCIL WORKSPACES/WindOps.pen` como documento ativo. Há referências de Home/components e dark mode; não há composição final para Histórico/conflito. Nenhum `.pen` foi editado.

27/10/2026: `OfflineWorkspaceProvider` abre a partição account/workspace, conecta réplica e sender somente com sessão autenticada e rede, e expõe checkpoints, comandos pendentes e resultado de `storage.persist()`. Home e detalhe consultam a projeção local e gravam comandos antes do feedback; conclusão pendente permite editar relato somente antes de qualquer tentativa. Histórico usa a API online e mostra conclusões ainda retidas localmente pela reconciliação S04. Parques lê o cache e mantém mutações administrativas indisponíveis sem rede. O proxy mantém o recorte limitado a issues ativas para não sincronizar indefinidamente todo o histórico. A API ordena issues recentes primeiro com UUID descendente no cursor.

Validação: Biome global (190 arquivos), TypeScript web/API, boundaries, build Vite web e `git diff --check` passaram após a primeira correção. `pnpm check` permaneceu sem saída por 105s e foi interrompido; testes e percursos de interface não foram executados nesta task. Ao investigar o relato do proprietário (27/10), compose informou Postgres/Electric saudáveis e `/api/health/ready` respondeu 200. Primeiro, log da API mostrou `offset=0_inf` em todas as cinco requests e `400` em menos de 1ms: o parser da rota só aceitava `-1` ou `n_n`; foi ajustado para aceitar `0_inf`. Em nova captura, a rota ainda rejeitava todas as requests com `INVALID_SYNC_REQUEST` e a lista de parâmetros incluía `cursor`. O Electric client inicializa esse cache-buster como string vazia (`cursor=`), mas a rota exigia um token não vazio; agora permite vazio e mantém o limite/formato opaco para valores não vazios. Revalidar após esta segunda correção. Aviso `storage.persist()` negado é separado da réplica e pode acontecer em navegação privada. S06 continua aberta. Validação manual em dispositivo, quota, foco e leitor de tela pendente; S07 não está concluída.

Teste guiado S07/S06 — 27/10/2026: proprietário confirmou que todas as cinco coleções ficaram disponíveis depois dos ajustes do proxy e criou um chamado online; ele apareceu no topo e a fila voltou a zero. Ao parar apenas a API para simular indisponibilidade, a sessão passou a `offline`, mas o Cloud ainda dizia “Sincronizado” e ficava verde porque priorizava cache pronto; corrigido para indicar sessão offline/aguardando autenticação e usar ícone CloudOff. Biome, TypeScript web e build Vite web passaram após essa correção. Próximo passo: revalidar estado visual offline e então registrar uma ação local com API parada.

27/10/2026 — continuação do teste guiado pelo proprietário: cinco coleções disponíveis; API parada, F5 manteve dados locais e o estado informou sessão a renovar; criação e edição offline permaneceram na fila através de recarga. Com API ativa, foram observados conflitos de revisão e uma falha de réplica em `issues`. Ajustado o parser local para obter identidade da chave Electric e workspace da partição já autorizada; ao corrigir um conflito, a tentativa anterior fica `superseded` e deixa de ser contada como pendente. Os testes direcionados de `workspace-replica` e `local-issue-store` passaram (2 arquivos/12 testes), assim como Biome dos quatro arquivos tocados, TypeScript web e `git diff --check`. O proprietário revisou o conflito, informou fila em zero, recarregou a página e confirmou que o resultado permaneceu correto. A proteção `storage.persist()` continuou não confirmada pelo navegador; isso foi apresentado como aviso, sem bloquear a réplica.

Validação ainda parcial: não foi percorrido cache ausente, falha de quota na interface, conclusão offline, telas e ações de status de ponta a ponta, leitor de tela, tema claro/escuro, viewport móvel nem teste em dispositivo nesta sessão. `pnpm check` não foi aprovado nesta entrega; tentativa anterior ficou sem saída por 105s. S07 continua aberta até completar os critérios restantes e registrar os limites.

Revisão manual de acessibilidade em 27/10/2026: o proprietário percorreu a interface com Tab; foco visível azul na Home, nos itens da sidebar, no Cloud e nos filtros. Shift+Tab retornou ao controle anterior. Em zoom de navegador 200%, reportou que as telas se ajustaram sem cortes ou sobreposição. Leitor de tela ainda não foi validado.

Investigação de status em 27/10/2026: consulta somente leitura ao Postgres mostrou que o chamado “tudo ok” (P01/T02, criado às 23:03) está `pending` e tem apenas criação/edições; a interface o exibia como concluído. Um outro chamado antigo em P01/T02 está de fato `completed`, com evento de conclusão por Leonardo às 23:19. A Home reconciliava status local mesmo sem comando pendente; ajustada para usar status da API quando não há intenção local enviável e para manter conclusões locais enviáveis no Histórico até confirmação. Proprietário confirmou “tudo ok” como Pendente na Home sem F5. Biome, TypeScript web, build Vite e Vitest completo (9 arquivos/50 testes) passaram após o ajuste.

O proprietário confirmou que o chamado concluído pelo servidor aparece uma única vez no Histórico.

Continuação em 27/10/2026: com uma alteração pendente e a API parada, a Conta agora informa que o comando está preservado e apresenta o diálogo de logout com “Continuar no Wind Ops”, “Preservar e sair” e “Exportar e sair”. O proprietário escolheu exportar e confirmou o JSON na pasta de Downloads. O logout local foi alterado para não esperar resposta de servidor indisponível. O bloqueio de rotas sem sessão foi uniformizado: o proprietário comparou `/conta` e `/bezerro` e confirmou a mesma mensagem genérica. Biome, TypeScript web e `git diff --check` passaram. Demais cenários de campo/acessibilidade permanecem pendentes.

Vitest completo passou após as correções (9 arquivos/50 testes). `pnpm check` completo não foi aprovado nesta execução; a validação direta disponível foi Biome, TypeScript web e `git diff --check`.

28/10/2026 — comparação offline entre contas: após o proprietário reconectar as duas contas e desligar novamente a API, a diferença de estado/listagem voltou a ocorrer. Identificada uma lacuna no indicador: “Sincronizado” era derivado de cache completo e fila vazia, sem confirmar que o stream Electric da sessão atual alcançou o servidor. A réplica agora expõe confirmação `up-to-date` por coleção e o indicador só mostra “Sincronizado” após confirmação nas cinco coleções; enquanto atualiza mostra “Atualizando dados do servidor”, e o ícone fica verde somente nesse estado. Também identificado que a Home online não persistia as linhas retornadas pela API no IndexedDB. A resposta agora atualiza as projeções locais; quando a primeira página contém o conjunto ativo completo, itens antigos ausentes são marcados inativos sem descartar comandos pendentes. Testes cobrem catch-up por coleção e reconciliação do snapshot ativo. Vitest direcionado (14 testes), Biome, TypeScript web e `git diff --check` passaram. `pnpm check` ficou sem saída por mais de 90s e foi interrompido; falta validar manualmente ambas as contas com a nova versão, reconectar/atualizar Home para gravar as respostas atuais no IndexedDB e repetir a comparação offline. S07 continua aberta.

28/10/2026 — o proprietário confirmou que o problema observado após essa validação era na Home. Encontrada condição que permitia mesclar um comando local de conclusão já confirmado, mas ainda aguardando atualização da réplica, como item concluído na lista ativa (`pendingLocalEntries`). Isso podia alterar a ordem e, como só as linhas da API participavam da busca de catálogo, a linha local aparecia com “Equipamento associado”. A Home agora exclui concluídos da mesclagem ativa e busca localização também para itens locais legítimos. Biome, TypeScript web, `git diff --check` e os 14 testes direcionados passaram. A nova correção ainda precisa ser validada pelo proprietário com API ativa e depois parada; não inferir conclusão da S07.

28/10/2026 — proprietário confirmou que a issue sumia com API ligada e reaparecia na Home ao desligá-la. Causa adicional: a reconciliação de uma resposta completa da lista ativa não marcava ausentes como inativos quando havia qualquer comando pendente, incluindo conclusão já confirmada pelo servidor em `confirmed_waiting_replica`. Agora a reconciliação preserva apenas issues locais ainda sem versão server-side; issues conhecidas do servidor ausentes do snapshot ativo são marcadas inativas e ACK de conclusão é confirmado. Teste direcionado cobre esse ciclo. Biome, TypeScript web, `git diff --check` e Vitest direcionado (14 testes) passaram. A repetição manual offline ainda está pendente.

28/10/2026 — proprietário apagou as duas bases IndexedDB com a API ligada e informou que a divergência deixou de aparecer. Depois de desligar a API, informou estar sem acesso; como a limpeza removeu o marcador e o cache offline, o teste de reconstrução das réplicas seguido de reabertura offline não ficou confirmado. Em consulta somente leitura ao Postgres, `vamos testar` está `in_progress`, criado às 00:27 e atualizado às 23:37 (horário local); o fallback local usava `updatedAt` quando `serverIssue` faltava, o que podia inverter sua ordem em relação a outra conta. A projeção agora preserva `createdAt` separadamente de `updatedAt`; Biome, TypeScript web, `git diff --check` e testes direcionados passaram. Confirmar o estado após recuperar acesso e recriar o cache; S07 permanece aberta.

28/10/2026 — após ligar a API, o proprietário autenticou novamente técnico e admin e esperou as cinco coleções disponíveis, fila zerada e indicador “Sincronizado” em ambas. Com a API desligada, a Home administrativa abriu igual ao estado online, sem a issue concluída indevida; na sessão técnica, o proprietário confirmou a mesma lista e a mesma ordem. Esse percurso confirma o reparo após recriar os IndexedDBs. Conclusão offline com relato editável, cache ausente/quota, leitor de tela, temas e viewport móvel ainda pendentes.

28/10/2026 — com cache novo e API parada, proprietário concluiu offline o chamado de teste `vamos testar`, confirmou estado local `Concluído · Ainda não confirmado` e uma alteração pendente, editou o relato antes do envio e viu o texto atualizado no detalhe. Após ligar API e reautenticar-se sem logout, a fila zerou e o chamado apareceu no Histórico; no detalhe o relato permaneceu e “Editar relato ainda não enviado” desapareceu, com evento de conclusão registrado. Cenário de conclusão offline validado. Cache ausente/quota, leitor de tela, temas, viewport móvel e demais validações S06 continuam pendentes.

28/10/2026 — proprietário estreitou a janela para cerca de 375 px na tela de detalhe; layout mudou para bottom bar e não reportou cortes, sobreposições ou rolagem horizontal. Validação de viewport móvel reportada; leitor de tela e temas ainda pendentes.

28/10/2026 — proprietário alternou o tema na página Conta e reportou layout normal, sem cortes ou sobreposição. Validação manual dos dois temas reportada; leitor de tela permanece pendente.

28/10/2026 — Narrador ativo no navegador da página Conta; ao focar o botão Cloud, anunciou “Sincronização, sincronizado”. Isso confirma anúncio textual do estado atual sem depender do verde do ícone; percursos adicionais com leitor de tela ainda pendentes.

28/10/2026 — proprietário confirmou que o Narrador percorreu a interface por Tab e leu corretamente os nomes dos controles, incluindo grupo e opções de filtros da Home. Leitor de tela validado no percurso reportado; testes detalhados de formulários/erros com leitor de tela ainda não realizados.

28/10/2026 — `pnpm check` completo passou após corrigir o formato em `issues-pages.tsx`: lint/boundaries, typecheck dos três projetos, Vitest (9 arquivos/52 testes) e build de contratos/API/web.

28/10/2026 — revisão do próximo critério encontrou que a lista do Histórico passava localização vazia mesmo com catálogo local preparado, causando o fallback “Equipamento associado”. A tela agora resolve Parque/Turbina pelo catálogo local para itens concluídos. Biome, TypeScript web e `git diff --check` passaram; validação manual de título e ordenação do Histórico pendente.

28/10/2026 — proprietário confirmou no Histórico que `vamos testar` aparece uma vez, no topo e com localização “Parque P01 · Turbina T01”. Ordenação e localização online do Histórico validadas; resta conferir a lista local do Histórico sem API.

28/10/2026 — em navegação simulada com 3G, cada troca de rota mostrava a tela inteira de conferência de sessão. O AuthProvider agora mantém a tela atual durante a revalidação de uma sessão já conhecida, sem remover as chamadas de autorização e os redirects após a resposta. Proprietário recarregou a aplicação, abriu Histórico e confirmou que a tela não desapareceu; depois abriu Conta, saiu, autenticou-se como admin e confirmou que a conta permaneceu correta em `/app` após alguns segundos. Biome (190 arquivos), boundaries, typecheck web, Vitest (9 arquivos/52 testes) e build Vite web passaram. `timeout 30s pnpm check` terminou sem saída (código 124); a checagem completa não está confirmada nesta alteração. Cache ausente/quota, paginação além dos itens disponíveis e confirmação de request de mutação em voo ainda não foram validados.

28/10/2026 — o proprietário abriu Histórico com a API ligada, viu os chamados concluídos e confirmou que todos sumiram ao parar a API. A tela buscava os concluídos no servidor, mas não os persistia no IndexedDB. Agora grava as linhas e identidades recebidas pela API no cache; a leitura local foi separada da busca online para não repetir chamadas quando o journal muda. Teste do LocalIssueStore confirma que um chamado concluído e sua identidade sobrevivem ao fechamento/reabertura do IndexedDB. Biome (190 arquivos), boundaries, typechecks de contracts/API/web, Vitest (9 arquivos/53 testes) e build web passaram. `timeout 30s pnpm check` terminou sem saída (código 124), portanto o comando completo segue sem confirmação. A validação manual do Histórico offline após reconstruir esse cache ainda está pendente.

28/10/2026 — no percurso sem API, proprietário informou que Histórico local ficou vazio apesar do chamado recém-concluído. Identificada seleção local que exigia `local.status === completed`, omitindo conclusões recebidas por réplica de outra conta. Agora o Histórico considera `serverIssue.status === completed` e tombstone (`serverActive === false`) como conclusão confirmada e usa texto server-side salvo, preservando edições locais pendentes. Biome, TypeScript web e `git diff --check` passaram; revalidar offline no navegador.

28/10/2026 — após correção, com API parada o proprietário confirmou que o Histórico mostra `vamos testar`, concluído depois da recriação do IndexedDB, mas não duas conclusões antigas. A réplica recém-criada só recebe issues ativas; o Histórico completo continua vindo da API e essas conclusões antigas não foram materializadas no journal local depois da limpeza. Isso corresponde ao limite de escopo documentado: offline mostra apenas conclusões ainda retidas localmente, não o histórico remoto completo. Confirmar novamente as três entradas com API ativa; nenhuma perda foi observada no servidor.

28/10/2026 — proprietário abriu Histórico com API ligada, atualizou a página após a correção de cache e confirmou que os chamados permaneceram visíveis depois de parar somente a API. Histórico local preenchido pela consulta online e leitura offline validados para as três conclusões presentes no cache.

28/10/2026 — ao remover os dois IndexedDBs com fila zerada e API parada, proprietário encontrou `/app` preso em “Carregando workspace…”. A sessão local guarda o ID, mas o nome do workspace vinha apenas do banco apagado; a Home usava a falta do nome como carregamento infinito. Agora sessão offline sem nome conhecido usa rótulo genérico e Home explica que falta cache e é necessária conexão para prepará-lo. Biome (190 arquivos), boundaries, typechecks de contracts/API/web, Vitest (9 arquivos/53 testes) e build web passaram. Recarregar a tela e confirmar a mensagem de cache ausente ainda pendente.

28/10/2026 — após F5 com API parada e os dois IndexedDBs removidos, proprietário confirmou que a Home deixou “Carregando workspace…”, exibiu “Chamados indisponíveis offline” com orientação para conectar e preparar os dados, e manteve “Novo chamado” desativado. Cache ausente validado sem tela vazia ou ação de gravação enganosa.

28/10/2026 — após religar a API e atualizar, proprietário confirmou cinco coleções disponíveis e fila zerada. A preparação refez o cache após a exclusão dos IndexedDBs.

28/10/2026 — com DevTools Network em Offline, a SPA já carregada navegou à Home, exibiu os chamados locais e o Cloud informou estado offline. `F5` exibiu o dinossauro por falta de app shell offline; reabertura offline após reload é escopo da S08/PWA. Após restaurar a rede e atualizar, proprietário confirmou que voltou ao app e a fila zerou.

28/10/2026 — proprietário autorizou concluir S07 sem criar registros permanentes para forçar paginação além da primeira página. Limitação anotada como não observada, sem afirmar que a tela “Carregar chamados anteriores” foi exercitada. A quota foi verificada por `QuotaExceededError` simulado no LocalIssueStore; não houve exaustão física do armazenamento do browser.

S07 concluída: fluxos locais e de sincronização, estados sem cache, Histórico cacheado, conclusão/revisão offline, recarga/navegação com sessão lenta, acessibilidade reportada e layouts foram implementados e validados conforme evidências acima. Arquivos/áreas: AuthProvider/guards, OfflineWorkspaceProvider, journal/outbox e réplica, telas Home/detalhe/Histórico/Parques/Conta, ações Cloud, proxy sync e testes local-issue-store/workspace-replica. Validação direta final: Biome (190 arquivos), boundaries, typecheck contracts/API/web, Vitest (9 arquivos/53 testes), build web e `git diff --check` passaram. `pnpm check` não emitiu saída durante 30s (código 124). Limites aceitos: paginação além da primeira página não exercitada; quota simulada em teste, sem forçar quota real de navegador; F5 offline depende da S08/PWA; storage.persist() não foi concedido pelo browser.

28/10/2026 — com Network throttling em Offline e a aplicação já carregada, proprietário navegou até Home, viu os chamados mantidos no IndexedDB e confirmou o estado offline no Cloud. F5 sem rede exibiu o dinossauro do navegador: o shell da aplicação ainda depende do servidor e o suporte a reabertura sem rede pertence à S08/PWA; esta observação não invalida a navegação offline dentro da SPA carregada.

28/10/2026 — com API restaurada, o proprietário confirmou que as três conclusões aparecem no Histórico. Ordem conjunta após recriação do cache ainda será conferida.

28/10/2026 — proprietário informou a ordem do Histórico: `vamos testar` (27/10 00:27), `ta saindo fumaça do alternador` (26/10 22:54), `tem um elevador faltando o pino, atrás do coquilho` (26/10 22:40). A sequência está em ordem decrescente de conclusão (`updatedAt`); os três locais aparecem corretamente. Paginação além da página visível não foi exercitada.

28/10/2026 — proprietário confirmou no detalhe de `vamos testar` a ordem dos eventos: conclusão em 28/10 01:01, atendimento iniciado em 27/10 23:37 e registro em 27/10 00:27. Log aparece do mais recente ao mais antigo, com relato e localização preservados.

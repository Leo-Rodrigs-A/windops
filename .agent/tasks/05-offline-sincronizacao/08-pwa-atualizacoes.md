# S08 — PWA, reabertura e atualizações seguras

## Status

Concluída em 28/10/2026 para navegador desktop suportado.

- [x] Task concluída

## Objetivo

Reabrir o app instalado sem rede e atualizar o app shell sem perder a fila.

## Estado atual

Concluída para desktop em 28/10/2026. Implementação e evidências finais abaixo; validação móvel transferida para S09/produção.

## Dependências

S02, S06 e S07 concluídas.

## Escopo e exclusões

Service worker, cache de app shell, instalação e atualização; background sync opcional e sem garantia de envio com app fechado.

Validação em Android/iPhone foi transferida para S09/produção por decisão do proprietário. Não declarar suporte móvel antes dessa evidência. Navegadores sem suporte a service worker estão fora dos navegadores escolhidos para uso.

## Plano de implementação

- [x] Implementar registro/versão do service worker e estratégia de cache do app shell/rotas/assets locais compatível com o build. Reutilizar manifest/ícones da torre existentes e verificar escopo/start_url.
- [x] Não armazenar respostas de auth, OTP, tokens, diretório/equipe ou API genérica no Cache Storage; dados operacionais pertencem à base local particionada. Não cachear respostas tenant sob URLs compartilhadas sem isolamento.
- [x] Carregar rotas protegidas offline com o contexto local autorizado da S06, inclusive deep link após encerramento. Sem autenticação/preparação anterior, orientar primeira conexão.
- [x] Coordenar atualização do shell em múltiplas abas sem reload automático que perca formulário; preservar fila. S08 não altera schema IndexedDB, portanto não houve migração local nem cenário de schema incompatível. Não usar limpeza global como estratégia de upgrade.
- [x] Garantir envio ao abrir/retomar conectado; tratar suspensão/background como interrupção comum do executor. Se usar background sync, manter como melhoria facultativa com a mesma autorização/idempotência.
- [x] Validar contexto seguro no desktop em `localhost`; registrar que a validação em Android/iPhone e configurações HTTPS de aparelho serão realizadas em produção na S09. Não houve exposição temporária de rede nesta validação.
- [x] Definir comportamento ao recusar instalação/permissão de persistência e em navegador sem suporte escolhido; apresentar limites reais sem prometer proteção contra remoção do app/dados. O proprietário escolheu navegadores com suporte; o aviso de persistência não concedida já foi validado na S07.

## Contratos e dados afetados

Configuração web/build, manifest e service worker; modelo de versões local/shell acordado na S01. Nenhuma credencial Electric ou auth em assets precacheados.

## Testes e aceite

- [x] Instalar, preparar, desligar Preview/API, encerrar e reabrir pelo ícone e por rota interna; recuperar UI e pendências no desktop.
- [x] Atualizar com fila pendente, formulário aberto e duas abas em versões diferentes; fechar o navegador durante upgrade preservou trabalho. O submit do formulário passou no reteste após uma falha inicial intermitente.
- [x] Inspecionar Cache Storage e requests de auth: não há caminhos `/api` nem `/auth/` cacheados. Registrar validação móvel pendente para S09/produção, sem declarar suporte de Android/iPhone.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação.

28/10/2026: implementação inicial em `apps/web/vite.config.ts` gera service worker por build com precache do shell, assets emitidos, manifest e ícones. Navegações usam rede e fallback do `index.html`; apenas assets compilados entram no cache. `/api/`, `/auth/` e `/.well-known/` são excluídos. Caches antigos são preservados para abas que ainda usam chunks anteriores. `AppRoot` registra o worker e oferece atualização manual; não recarrega automaticamente formulários.

Validação local: Biome nos dois arquivos alterados, boundaries, typecheck web e `vite build` passaram; o build produziu `dist/service-worker.js`. `git diff --check` passou. `pnpm check` ficou sem saída por 26 segundos e foi interrompido; checks diretos pertinentes passaram. Não foi testado ainda em HTTPS/aparelho, modo avião após encerrar/reabrir, fila pendente durante upgrade, duas abas em versões distintas, inspeção de Cache Storage ou navegador sem service worker. Nenhum teste unitário novo ou integração de dispositivo foi executado. A task permanece aberta para validar e ajustar esses cenários.

Teste guiado no PC (28/10): em `http://localhost:4173`, o shell `/app` era retornado do cache, mas F5 com Preview parado deixava a tela branca. Console confirmou que chamadas `/api/auth` e `/api/sync` falhavam por API parada (esperado) e os assets JS/CSS também falhavam. O worker interceptava os assets, mas tinha cache miss e tentava rede. Ajustado o fetch para procurar assets estáticos em todos os caches e guardar resposta same-origin quando carregada online; API/auth continuam excluídas. Rebuild local, typecheck, Biome, boundaries e Vite build passaram após a correção. Repetir teste após atualizar o service worker no navegador; S08 permanece aberta até confirmação do shell sem frontend.

Reteste guiado no PC (28/10): proprietário confirmou que, com o Preview desligado, abriu o app e registrou uma issue; ao religar o Preview, a issue sincronizou normalmente. Isso valida shell + gravação local + retomada/envio no navegador desktop para este percurso. Ainda não exercitados: atualização de versão com fila pendente/formulário aberto, duas abas em versões diferentes, inspeção explícita de requests/cache após a correção, nem aparelho móvel. S08 permanece em andamento.

Teste de upgrade guiado no PC (28/10): com Preview e API ligados, criou issue pendente com API desligada, abriu duas abas, gerou build novo mantendo Preview ativo e verificou que a pendência persistiu. O aviso in-app de atualização não apareceu; proprietário atualizou manualmente e confirmou que a issue permaneceu inalterada nas duas abas. Ao religar a API, sincronizou corretamente. A preservação da fila após rebuild/atualização manual e a retomada sem duplicação foram confirmadas; o aviso/descoberta automática de versão nova e formulário aberto continuam sem validação. Feito no Preview de build em `localhost:4173`, não no Vite dev.

Reteste da atualização entre abas (28/10): proprietário observou que o aviso surgiu nas duas abas; clicou em Atualizar na primeira e ela trocou de versão. Na segunda, clicar no aviso não tinha efeito porque o waiting worker já havia sido ativado pela primeira aba. `OfflineUpdateNotice` agora observa `controllerchange`: abas que não iniciaram a ativação mantêm o documento aberto e passam a oferecer ação explícita **Recarregar**, enquanto a aba iniciadora conclui seu reload solicitado. Biome, boundaries, typecheck web e Vite build passaram após a correção. Falta reteste funcional dessa coordenação; formulário aberto continua sem validação.

Validação da correção (28/10): proprietário repetiu o fluxo no Preview de build, preparou ambas as abas com o código atualizado, gerou outra versão, ativou pela primeira aba e confirmou que a segunda ofereceu **Recarregar**. A issue permaneceu pendente após a atualização e sincronizou uma vez ao retornar a API. Proprietário confirmou que tudo funcionou como previsto. Coordenação de atualização entre abas e retenção da fila passaram no desktop. Ainda não foram exercitados formulário aberto durante upgrade, crash no upgrade, inspeção explícita dos caches/requests auth, ou retomada em aparelho; não marcar esses itens como validados.

Teste adicional de formulário (28/10): com API desligada, proprietário abriu formulário de uma segunda issue, iniciou descrição e manteve o formulário aberto enquanto a outra aba atualizava. O formulário e o texto sobreviveram; ao salvar, a UI pediu conexão ao servidor e a criação foi cancelada. O caminho de submit valida `canWriteLocally` e `ready` antes de chamar `saveCreate`, então provavelmente não chegou a gravar no IndexedDB; obter texto exato do erro/status Cloud e reproduzir antes de aceitar criação com formulário aberto. Esse cenário permanece reprovado/inconclusivo; não declarar formulário preservado integralmente.

Reteste de formulário/cache (28/10): proprietário repetiu a bateria e confirmou que o fluxo funcionou normalmente, com issue sincronizada uma única vez. Na inspeção seguinte do Cache Storage, não encontrou caminhos `/api` nem `/auth/`. O reteste passou; manter registrado que a primeira tentativa após update foi bloqueada com pedido de conexão, sem mensagem exata disponível. Ainda confirmar se o encerramento/crash durante upgrade foi executado.

Encerramento S08 (28/10): proprietário confirmou que, ao fechar/reabrir durante a atualização, a issue permaneceu pendente; a abertura pelo ícone instalado e por rota interna funcionou como na aba normal. A validação de formulário passou na segunda bateria e sincronizou uma vez; Cache Storage não contém caminhos `/api` nem `/auth/`. Navegadores sem service worker foram dispensados por decisão do proprietário. Validação em Android/iPhone será feita em produção na S09; nenhum suporte móvel é declarado nesta conclusão. Checks de fonte da implementação: Biome, boundaries, typecheck web, build Vite e `git diff --check` passaram diretamente; `pnpm check` ficou sem saída por 26 segundos e foi interrompido.

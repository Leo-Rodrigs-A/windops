# S06 — Acesso offline, conflitos e recuperação

## Status

Concluída em 28/10/2026. Validação integrada guiada concluída; expiração temporal real dispensada explicitamente pelo proprietário.

- [x] Task concluída

## Objetivo

Permitir continuidade local com sessão expirada e resolver pendências sem expor dados entre contas.

## Estado atual

Implementação entregue. Sessão offline previamente autorizada, preservação/exportação, bloqueio após revogação, troca de conta e revisão de conflito foram validados; limites aceitos estão registrados abaixo.

## Dependências

S02, S03 e S05 concluídas.

## Escopo e exclusões

Retomada local, autenticação renovada, isolamento e conflitos; sem login inicial offline, bypass da segunda etapa ou atribuição de atendimento a terceiros.

## Plano de implementação

- [x] Evoluir AuthProvider para diferenciar autenticação online, sessão expirada/rede indisponível com marcador local previamente validado e workspace revogado. O marcador contém apenas IDs e data, sem role/credenciais. Login inicial e novo workspace continuam no fluxo online com segunda etapa.
- [x] O estado offline local não autentica chamadas: sender exige preflight online e APIs revalidam sessão/membership. Resposta conhecida de acesso negado resulta em revogação, nunca em simples falha de rede.
- [x] Mudanças de vínculo/cargo são consultadas no servidor a cada refresh; role local não concede ações. Remoção conhecida bloqueia a partição para uso local e mantém a fila exportável.
- [x] Revogação conhecida encerra sender e streams registrados. Revogação durante desconexão só será conhecida na próxima comunicação com o servidor.
- [x] Logout coordena abas, interrompe recursos registrados, invalida refreshes antigos e faz o sender descartar respostas tardias. Saída offline encerra o contexto local sem afirmar revogação remota; trava local impede reabertura automática até autenticação explícita.
- [x] Logout com fila oferece preservação na partição da mesma conta ou download do pacote. Não apaga journal nem exige descarte; exclusão destrutiva da fila não foi adicionada.
- [x] Apresentar conflito com versões base, local e remota e permitir decisão do criador. O teste integrado de 28/10 mostrou as três versões, permitiu recriar a edição sobre revisão remota 2 e confirmou fila zerada; admin continua usando somente ações de status autorizadas online e o primeiro estado confirmado pelo servidor prevalece.
- [x] Corrigir conflito/rejeição conhecida com novo commandId e revisão remota, preservando histórico e bloqueando descendentes para revisão explícita. Resultado desconhecido não aceita substituição e conserva retry com a identidade original.
- [x] Exportar pacote JSON legível/versionado, limitado à partição de origem, sem credenciais e com download local. Não transfere autoria, importa ou envia automaticamente.

## Contratos e dados afetados

Estado de autenticação local mínimo e fila particionada; guards online/serviços públicos continuam autoritativos. Diálogos usando componentes Shadcn existentes.

## Testes e aceite

- [x] Recuperação local após logout offline, autenticação explícita e envio único foi confirmada em 27/10. Por decisão explícita do proprietário em 28/10, o subteste de alterar `auth_sessions.expires_at` para o passado foi dispensado; expiração real não foi simulada.
- [x] Revogar membership com streams ativos: sessão técnica bloqueou dados operacionais e a conta admin manteve acesso.
- [x] Trocar de conta com resposta anterior comprovadamente em voo: em 3G, os indicadores de Conta admin ainda estavam carregando quando ocorreu logout. Após login técnico, a página mostrou a identidade e papel técnicos e continuou assim após aguardar; nenhuma resposta ou sessão admin substituiu a conta ativa.
- [x] Validar coordenação entre duas abas da mesma conta: logout em uma desconectou ambas e reautenticação sincronizou o comando uma única vez.
- [x] Teste unitário comprova versões base/local/remota, revisão remota vencedora, texto local preservado e correção com nova identidade. Corrida real entre técnicos fica para validação integrada.
- [x] Confirmar logout e exportação por conta no navegador. Testes unitários cobrem marcador de desconexão, preservação e exportação sem credenciais.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

27/10/2026: implementação parcial. Criados marcador local sem role/token, estados de sessão expirada/rede/revogação, coordenação de logout por BroadcastChannel, parada de sender/streams e descarte de ACK tardio. Logout com fila oferece preservar ou exportar; store apresenta base/local/remoto e corrige conflito com identidade nova. Nenhuma migration.

Validação: `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`, Biome global (189 arquivos), boundaries, Vitest (9 arquivos/50 testes), build Vite da web e `git diff --check` passaram. `pnpm check` não emitiu saída por mais de 90s; tentativa direta do pnpm disponível falhou ao preparar a versão 10.34.8 declarada (`ENOENT` no diretório temporário), portanto o check completo não foi aprovado. Não executados cenários de navegador/API para expiração/revogação/duas abas, corrida real de atendimento ou teste em aparelho. A UI de campo não consome réplica/outbox; conflito completo integrado depende de S07. Task permanece aberta.

28/10/2026: proprietário dispensou explicitamente a simulação de expiração real da sessão. O critério foi registrado como dispensado, não como comportamento observado; os demais testes de revogação e concorrência permanecem em aberto.

28/10/2026 — em duas abas da mesma conta, proprietário confirmou Home offline nas duas; criou um chamado offline em uma aba e ambas exibiram a mesma fila com uma alteração pendente. Isso valida a visibilidade entre abas para essa gravação; logout coordenado e isolamento de conta ainda serão verificados.

28/10/2026 — com uma pendência local, proprietário escolheu preservar e sair em uma aba e confirmou que ambas foram desconectadas. Após ligar API e autenticar-se em uma aba, ambas foram direcionadas a `/app`; a alteração foi enviada e apareceu uma vez na conta admin. Isso confirma logout coordenado, recuperação do comando e visibilidade após sincronização. Revogação durante long poll e troca de conta com requisição em voo continuam sem validação manual.

28/10/2026 — isolamento de conta offline: com a API parada e cache prévio nas duas contas, técnico criou `Teste isolamento S06`; a fila técnica mostrou 1 pendência e a admin permaneceu em 0. Após atualizar a Home admin offline, o proprietário confirmou que a issue local não apareceu na outra partição, como esperado. Ainda falta reautenticar/sincronizar esta pendência e confirmar visibilidade única no servidor, além de revogação durante long poll e troca de conta com request em voo.

28/10/2026 — após ligar API e reautenticar a conta técnica, a pendência `Teste isolamento S06` sincronizou e apareceu na Home da conta admin. Falta confirmar que aparece uma única vez após atualizar a Home.

28/10/2026 — proprietário atualizou a Home administrativa e confirmou que `Teste isolamento S06` aparece uma única vez. Isolamento enquanto pendente e visibilidade única após sincronização ficaram validados.

28/10/2026 — `pnpm check` completo passou após corrigir o formato apontado pelo Biome: lint/boundaries, typecheck dos três projetos, Vitest (9 arquivos/52 testes) e build de contratos/API/web.

28/10/2026 — conflito integrado reproduzido com contas separadas: técnico salvou edição local de `Teste isolamento S06` com revisão base 1; admin iniciou o chamado no servidor, avançando-o para revisão 2. Ao reconectar, técnico recebeu `REVISION_CONFLICT`. O detalhe exibiu explicitamente Versão base, Sua edição e Versão remota atual (revisão 2), preservando o relato local. Decisão/criação da edição revisada ainda pendente.

28/10/2026 — proprietário escolheu “Revisar e criar nova edição”, enviou `Teste isolamento S06 edição revisada`, viu o novo texto e evento “Chamado atualizado” no detalhe e confirmou zero alterações pendentes. Conflito integrado e decisão do criador validados.

28/10/2026 — após resolver o conflito, proprietário confirmou que a conta admin recebeu `Teste isolamento S06 edição revisada`. Revisão concorrente reconciliada entre contas sem duplicação.

28/10/2026 — com a Home técnica aberta e streams ativos, admin revogou a membership técnica. A conta técnica passou à tela “Sua conta ainda não está vinculada” sem dados operacionais; a conta admin continuou abrindo o workspace. Isso valida revogação durante a sessão de réplica e preservação da conta administrativa. Request de mutação efetivamente em voo ainda não foi simulado; restaurar a membership técnica para continuar os testes.

28/10/2026 — admin enviou novo convite à conta técnica após a revogação; proprietário aceitou e confirmou retorno a `/app`. Vínculo foi restaurado sem recriar conta. Falta verificar fila/estado após o retorno.

28/10/2026 — após reingresso da conta técnica, proprietário confirmou fila zerada e `Teste isolamento S06 edição revisada` ainda visível. Dados e estado sobreviveram à revogação/reconvite sem reaparecerem como pendência.

28/10/2026 — tentativa inicial com throttling 3G: proprietário abriu Conta na sessão técnica, saiu e entrou como admin; conta correta permaneceu após alguns segundos, mas sem observação do estado da requisição no instante do logout. A corrida foi repetida abaixo com um indicador explicitamente ainda carregando.

28/10/2026 — troca com resposta em voo validada: com 3G, indicadores “Meus chamados” da Conta admin estavam carregando; proprietário saiu imediatamente e entrou como técnico. Conta identificou corretamente o usuário técnico e papel Técnico e continuou assim após aguardar alguns segundos. Nenhum estado da conta anterior substituiu a conta ativa.

Arquivos/áreas entregues: acesso e logout local no AuthProvider e guards; partição IndexedDB, recuperação/exportação e sender; coordenação de réplica/sync; telas de Conta, issues, parques e ações de sincronização; proxy sync autorizado e transições de issue; testes de armazenamento/replica. Não houve migration. Validação final disponível: Biome (190 arquivos), boundaries, typecheck de contracts/API/web, Vitest (9 arquivos/53 testes), build web e `git diff --check` passaram diretamente. `pnpm check` foi tentado com timeout de 30s, sem saída (código 124). Limitações: expiração temporal real dispensada pelo proprietário; teste físico em aparelho e corrida simultânea de dois técnicos não foram feitos nesta task; storage persistente negado pelo browser permanece um aviso independente.

27/10/2026 — validação guiada conjunta com S07: com API indisponível, o proprietário recarregou a aplicação, confirmou que os dados locais permaneceram disponíveis e criou/alterou chamados; a fila mostrou comandos pendentes. Após restabelecer a API e revisar o conflito de revisão, a fila chegou a zero; após F5, o texto revisado permaneceu. O proprietário informou que usou contas técnica e admin. Isso comprova persistência/reenvio e recuperação de conflito nesse percurso, mas não expiração real de sessão, logout/exportação, revogação ou isolamento entre abas.

Continuação do teste de logout offline: com API parada e uma alteração pendente, a página Conta inicialmente ficava em “Conferindo sua sessão” porque não aceitava o estado `offline`; corrigida para oferecer saída preservando/exportando sem expor perfil ou cargo não revalidados. O diálogo apresentou 1 comando e as três ações esperadas. Após escolher “Exportar e sair”, o navegador permaneceu em `/conta` sob bloqueio sem dados, pois o logout aguardava a API; corrigido para desconectar e navegar localmente de imediato quando a sessão já está offline. O proprietário confirmou o JSON na pasta de Downloads. Também foi alinhado o fallback para que rota protegida e caminho inexistente tenham a mesma resposta visual quando não há sessão; o proprietário confirmou igualdade entre `/conta` e `/bezerro`. Biome, TypeScript web e `git diff --check` passaram para esses ajustes.

O proprietário confirmou que o arquivo JSON apareceu na pasta de Downloads. Conteúdo legível/versionado e ausência de credenciais permanecem cobertos pelos testes unitários; não foi solicitado compartilhar o arquivo.

Após reiniciar a API, o proprietário abriu `/entrar`, autenticou-se e voltou a `/app`. Cloud mostrou zero alterações pendentes e o chamado criado offline apareceu exatamente uma vez. Isso confirma reautenticação explícita e reenvio único após logout local; não simula expiração temporal do cookie nem revogação de membership.

Verificação automatizada complementar após os ajustes de logout e fallback: Vitest completo passou (9 arquivos/50 testes), além de Biome nos arquivos web alterados, TypeScript web e `git diff --check`. `pnpm check` completo continua sem aprovação nesta execução; registrar essa limitação até haver saída verificável.

# Q05 — Validação integrada e encerramento

## Status

Concluída em 30/10/2026 para browser/desktop, com checks automatizados e aceite funcional do proprietário em Chrome e Edge.

- [x] Task concluída

## Objetivo

Comprovar a consulta paginada e filtrada integrada com persistência, lifecycle e autorização, registrando o limite real do histórico offline.

## Escopo e exclusões

Aceite da [slice 08](README.md). Não repetir por rotina toda a bateria aceita nas slices 05–07. Android/iPhone instalados, restart físico, quota/evicção real e HTTPS de produção permanecem na [etapa 11](<../00 - roadmap/11-production.md>); simulação não certifica aparelhos.

## Estado atual

As slices anteriores têm checks e evidências de offline/lifecycle/notificações. Q01–Q04 estão concluídas; essas evidências não fecham os novos filtros, retenção e paginação.

## Dependências

Q01–Q04 concluídas e evidências disponíveis. Fixture de Q02 deve permitir testar mais de 25 registros sem poluir o workspace operacional.

## Plano

- [x] Rodar `pnpm check` do repositório e `pnpm test:issues-integration`; ampliar integrações apenas se mudanças em autorização/catálogo ou falhas justificarem. Registrar comandos e resultados reais, sem substituir silenciosamente o check por componentes isolados.
- [x] Se Q02 introduziu migration/infra, executar `pnpm db:empty-check`, `pnpm db:restore-check`, privilégios e checks de contêiner pertinentes. Sem tal mudança, registrar que esses checks não se aplicam à slice.
- [x] Exercitar API + front com duas contas/cargos e duas partições tenant de teste: três listas, P/T, empates, segunda página, troca rápida de filtro e revogação entre requisições. Conferir ausência de duplicatas e exposição de dados de outra conta/workspace.
- [x] Validar cache frio/quente e perda de rede depois da primeira página. Páginas remotas não carregadas não aparecem como disponíveis offline; cache preservado após reabrir deve corresponder à cobertura informada.
- [x] Exercitar conclusão offline sobre issue elegível, restart, reconexão/ACK e saída real do shape Electric. Confirmar permanência no Histórico e fila íntegra. Exercitar arquivo/reabertura/reativação remotos para verificar classificação e remoção das listas antigas.
- [x] Confirmar poda acima dos limites com fixture e IndexedDB de teste, preservando pendência/conflito/relato/exportação após restart. Revalidar quota simulada e commit falho do percurso modificado; não exigir exaustão física do aparelho nesta slice.
- [x] Conferir no front filtros/códigos, mais recentes primeiro conforme cada lista, recuperação de cursor, erro parcial, temas, teclado e largura responsiva. Separar observação direta de confirmação do proprietário e de testes automatizados.
- [x] Atualizar tasks, índice da slice, índice geral, memória, arquitetura e roadmap 10 conforme evidência. Manter itens indisponíveis abertos, registrar follow-ups de produção sem alegar validação móvel e sugerir commit em português.

## Contratos e dados afetados

Testes, fixtures e documentação. Bancos/contas sintéticos isolados; encerrar recursos criados para ensaio e preservar serviços/dados do proprietário. Nenhum deploy ou geração de dados operacionais implícitos.

## Testes e aceite

Todos os critérios do índice têm evidência verificável, incluindo consulta entre páginas, saída/retorno Electric, persistência depois de restart e isolamento. Consulta continua read-only; fila não perde comandos e retries não duplicam eventos/notificações. Não fechar a slice somente por testes de unidades ou pela criação deste plano.

## Evidências

28/10/2026 — Task criada; nenhuma validação nova executada. O encerramento depende da implementação e das evidências de Q01–Q04 e desta matriz.


30/10/2026 — Execução parcial de Q05:

- `pnpm check`: exit 0; lint/boundaries, typecheck, 10 arquivos com 57 testes e builds aprovados.
- `pnpm test:issues-integration`: executado com acesso autorizado ao Docker após bloqueio do socket no sandbox; fixture isolada de 128 issues validou filtros, paginação, microssegundos, cursor inválido, autorização e inserção concorrente. Integração também validou lifecycle, revogação, recibos, corridas e retry de push. Banco descartável gerenciado pelo script, sem inserção no workspace operacional.
- A suíte reexecutada cobre retenção de 260 projeções API, proteção de conflito e revisão após reabrir IndexedDB, limite de eventos, quota simulada, falha de commit/ACK, retry e isolamento. Usa fake-indexeddb e streams simulados; não comprova saída real do Electric nem navegação em browser.
- Q02 não introduziu migration/infra: empty-check, restore-check e verificações adicionais de infraestrutura não se aplicam a esta slice.
- Tentativa de abrir o front pelo MCP Pencil falhou: aplicativo desktop desconectado após três tentativas. Nenhum documento de design foi consultado ou alterado. Aceite visual, teclado, responsividade, duas sessões no front, perda de rede entre páginas e saída/retorno real Electric permanecem abertos. É necessário reconectar o aplicativo para realizar esse percurso.
- Nenhuma alteração de fonte nesta execução. Não encerrar Q05/slice 08 por esses testes automatizados. Android/iPhone e quota física permanecem no roadmap 11.


Correção durante Q05: erro de hooks reportado no Vite com hashes distintos. React/React DOM instalados em 19.3.1, hooks do ThemeProvider corretos. Hipótese: worker de Preview compartilhando origem e cacheando módulos dev. Bootstrap dev agora remove o registro do worker Wind Ops antes de importar React, sem apagar IndexedDB; registro PWA restrito a produção e cache restrito aos assets do build. Dedupe React/React DOM e meta mobile-web-app-capable adicionados. pnpm check passou (57 testes/builds); confirmação no navegador do proprietário ainda pendente, inclusive HMR.


## Q05 — Falha de recarga offline e feedback de atendimento

Proprietário confirmou permissões, interface e cache como funcionais, além do worker ativo (passo 1). No passo 2, F5 offline deixou tela branca; iniciar atendimento offline também falhou com texto incorreto sobre liberar atendimento. Esses percursos permanecem abertos.

Inspeção identificou busca global em CacheStorage: HTML antigo poderia ser devolvido ao worker atual. Correção restringe HTML/assets ao cache VERSION, sem apagar caches antigos ou IndexedDB. Teste executa o worker gerado por build em ambiente simulado com cache antigo e atual, valida HTML da versão ativa e exclusão de API/módulos Vite. Não comprova a causa específica no navegador do proprietário, cujo Console ainda não foi recebido.

Ações agora distinguem armazenamento local indisponível/chamado ausente e usam a ação correta no erro, sem alegar que iniciar atendimento offline foi corrigido. Falha de persistência não é tratada como sucesso. pnpm check passou com 59 testes, typecheck, lint e builds. Novo build gerado; requer ativação do novo worker online e repetição do percurso pelo proprietário. Nenhum dado operacional ou journal apagado.


Reteste ainda não realizado: proprietário interrompeu antes de desligar a rede porque o worker apareceu vermelho; estado textual ainda desconhecido. Console anterior identifica falha de preload de main-DZPEHCCD.css com entrada antiga index-HIqNzEPA.js; últimas navegações carregam main-DDlC2tDf.js. Conferência do build atual encontrou CSS presente e listado no precache, sem arquivos ausentes. Adicionado teste de cobertura do manifesto para todos os arquivos emitidos pelo build; pnpm check passou com 60 testes/builds. Não considerar o F5 offline corrigido no navegador até repetição.


Q05 — Confirmação do proprietário: o dinossauro na recarga offline era causado pela opção “Bypass for network” do DevTools. Após desmarcá-la, relatou resolução. Worker controlava a aba e havia HTML nos caches. Registrar esse caso como configuração do ensaio, não como defeito comprovado do handler. Isso não confirma gravação/início/conclusão offline, restart do navegador, reconexão/ACK nem atualização com pendências; esses percursos continuam aguardando resultados.


## Encerramento — 30/10/2026

Q05 e slice 08 concluídas no escopo browser/desktop. O proprietário confirmou o fluxo completo em Chrome e Edge, com contas administrador e técnico: permissões, interface e cache previamente aprovados; agora também início/conclusão offline, F5, reinício do navegador, reconexão/sincronização, alterações remotas e atualização do PWA com pendências, conforme roteiro fornecido. Não houve nova observação direta pelo agente nem captura de tráfego Electric; o aceite funcional da sincronização real é confirmação do proprietário.

Evidência automatizada complementar: último pnpm check aprovado com 60 testes, lint/boundaries, typecheck e builds; integração PostgreSQL de issues aprovada com 128 fixtures, filtros, paginação, autorização/isolamento entre tenants, revogação, lifecycle e idempotência. Poda, quota simulada, commit falho, conflito, restart e retry/ACK foram cobertos pelas suítes executadas. Não atribuir o ensaio cross-tenant automatizado a uma inspeção manual de dois workspaces.

Correções entregues durante Q05: isolamento do cache pelo build ativo, proteção contra worker de Preview no Vite, manifesto offline coberto por teste e mensagens corretas para ações de atendimento. Dinossauro no ensaio final foi resolvido ao desmarcar Bypass for network; não constitui defeito comprovado do handler.

As pendências de navegador registradas acima são históricas e ficam superadas por este aceite. Android/iPhone físicos, quota/evicção real e HTTPS/infraestrutura de produção permanecem na etapa 11. Nenhuma nova fonte/schema/infra alterada neste encerramento documental; não houve repetição de testes da aplicação. Próxima execução: R01 da slice 09.

Verificação do encerramento documental: 6 documentos e 22 links locais conferidos, checkboxes de Q05/slice completos e git diff --check aprovado.

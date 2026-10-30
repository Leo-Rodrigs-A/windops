# Q05 — Validação integrada e encerramento

## Status

Em andamento; checks automatizados aprovados em 30/10/2026. Aceite de front e Electric real pendente.

- [ ] Task concluída

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
- [ ] Exercitar API + front com duas contas/cargos e duas partições tenant de teste: três listas, P/T, empates, segunda página, troca rápida de filtro e revogação entre requisições. Conferir ausência de duplicatas e exposição de dados de outra conta/workspace.
- [ ] Validar cache frio/quente e perda de rede depois da primeira página. Páginas remotas não carregadas não aparecem como disponíveis offline; cache preservado após reabrir deve corresponder à cobertura informada.
- [ ] Exercitar conclusão offline sobre issue elegível, restart, reconexão/ACK e saída real do shape Electric. Confirmar permanência no Histórico e fila íntegra. Exercitar arquivo/reabertura/reativação remotos para verificar classificação e remoção das listas antigas.
- [ ] Confirmar poda acima dos limites com fixture e IndexedDB de teste, preservando pendência/conflito/relato/exportação após restart. Revalidar quota simulada e commit falho do percurso modificado; não exigir exaustão física do aparelho nesta slice.
- [ ] Conferir no front filtros/códigos, mais recentes primeiro conforme cada lista, recuperação de cursor, erro parcial, temas, teclado e largura responsiva. Separar observação direta de confirmação do proprietário e de testes automatizados.
- [ ] Atualizar tasks, índice da slice, índice geral, memória, arquitetura e roadmap 10 conforme evidência. Manter itens indisponíveis abertos, registrar follow-ups de produção sem alegar validação móvel e sugerir commit em português.

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

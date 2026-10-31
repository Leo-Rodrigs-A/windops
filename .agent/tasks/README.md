# Tasks de implementação

## Roadmap e slices

[00 - roadmap](<00 - roadmap/README.md>) preserva as 11 etapas de produto originais. Elas orientam a evolução do sistema, mas não substituem planos executáveis. Os números dessas etapas são independentes dos números das novas slices: `00 - roadmap/01-base` não é `01-fundacao`.

Cada nova slice fica em uma pasta `NN-nome/`, com um `README.md` que define resultado, limites, dependências e ordem de execução. Cada task ganha seu próprio arquivo `NN-nome.md`, criado quando houver contexto suficiente para detalhar a implementação. Criar apenas as tasks da slice em preparação; não decompor todo o roadmap antecipadamente.

## Próxima slice preparada

- [ ] [09 — Revisão técnica e confiabilidade](09-revisao-confiabilidade/README.md): auditoria e refactors graduais. Q05, R01, R01A e R02 concluídas; R03 é a próxima execução. R03–R08 detalhadas conforme A01–A13.

- [ ] [10 — Cadastro e identidade](10-cadastro-identidade/README.md): O01–O03 implementadas; O04 aguarda ensaio manual do fluxo email/Google no browser.

## Última slice concluída

- [x] [08 — Filtros e histórico de consulta](08-consultas-historico/README.md): filtros P/T nas três listas, paginação por demanda, projeção e retenção segura de histórico.

Próxima execução: [R03 — Transações e erros](09-revisao-confiabilidade/03-transacoes-erros.md). R01A removeu query e fragmento dos logs automáticos; R02 atualizou documentação e tornou explícita a composição de auditoria/notificações. Consulte o índice da slice 09 para os planos R04–R08.

- [x] [07 — Campainha e Web Push](07-notificacoes/README.md): N01–N06 concluídas em 28/10/2026; outbox, campainha, worker, interface/PWA, push real confirmado pelo proprietário e validação integrada. Android/iPhone instalados e produção permanecem no roadmap 11.

- [x] [06 — Ciclo de vida das issues](06-ciclo-vida-issues/README.md): reabertura, arquivo/reativação e integração segura com réplica/fila.

Slice 05 concluída em 28/10/2026 para o escopo browser/desktop, com validação integrada PostgreSQL/Electric e failpoints automatizados. O proprietário transferiu validação Android/iPhone e HTTPS em aparelho para produção; nenhum suporte móvel é declarado. A S09 não exigiu `pnpm check` aprovado (ficou sem saída por 31s); equivalentes diretos e integrações passaram. Ver [Slice 05](05-offline-sincronizacao/README.md) e evidências S09.

- [x] [01 — Fundação](01-fundacao/README.md): F01–F08 concluídas em 25/10/2026, com validação local e Android físico.
- [x] [02 — Equipe e acesso ao workspace](02-equipe-acesso/README.md): E01–E07 concluídas; integrações, desktop, Android e ações entre cargos validados. Ajustes visuais mobile ficam para melhoria posterior.

- [x] [03 — Parques e turbinas](03-parques-turbinas/README.md): P01–P06 concluídas em 26/10/2026; lifecycle com issues e catálogo offline permanecem nas etapas futuras.

- [x] [04 — Registro e atendimento](04-registro-atendimento/README.md): slice concluída e aprovada pelo proprietário em 26/10/2026; I01–I09 concluídas. Limitações e escopo futuro registrados na task.

- [x] [05 — Operação offline e sincronização](05-offline-sincronizacao/README.md): S01–S09 concluídas para o escopo browser/desktop. Validação de dispositivos reais permanece como follow-up em produção; suporte móvel não declarado.

Correção solicitada durante I07: I09 concluiu a espera de uma hora no autoatendimento do autor, conclusão online e ordenação mais recente primeiro em Histórico/logs. Migration 0007 foi aplicada no banco dev; integração em PostgreSQL descartável passou.

I08 — 26/10/2026: instalação vazia/upgrade/restore/grants, publicação Electric e integrações auth, workspaces, parks e issues passaram. `pnpm check` expirou sem saída após 40s; equivalentes diretos passaram. O proprietário confirmou as funcionalidades e aprovou a slice; não se alegou certificação independente de dispositivos ou acessibilidade.

Slices 03 e 04 concluídas; I01 adicionou contratos compartilhados; I02 adicionou e validou o schema/migrations; I06 implementou lifecycle de equipamentos sem nova migration. I07 recebeu aceite funcional do proprietário; I08 passou validações automatizadas e a slice foi aprovada. I09 implementou espera de uma hora para autoatendimento do autor e conclusão online. Catálogo offline permanece na etapa 07; reabertura e arquivo de issues continuam na etapa 08.

Verificação documental do planejamento inicial em 26/10/2026: links locais dos documentos alterados e consistência das seis tasks conferidos; `git diff --check` passou. As validações de implementação da P06 estão registradas na task específica.

P01 concluída em 26/10/2026: contratos Zod e modelo de banco registrados; equivalentes diretos de lint, boundaries, typecheck e testes passaram. `pnpm check` ficou sem saída. Sem migração ou alteração de dados dev.

P02 concluída em 26/10/2026: migração `0004_parks_turbines` aplicada ao banco dev sem inserir inventário; instalação vazia, upgrade e privilégios validados em bancos descartáveis e no dev. Ver evidências na task P02.

P03 concluída em 26/10/2026: consultas GET de parks/turbines com autorização tenant, paginação, busca e erros que não revelam recursos de outros workspaces. Integração PostgreSQL descartável aprovada. Ver evidências na task P03.

P04 concluída em 26/10/2026: criação/edição de parks e turbines restrita a admin, autorização e escrita na mesma transação, revisão otimista e conflitos úteis. Integração descartável cobriu corridas, revogação, isolamento e persistência após reconstrução da API. `pnpm check` sem saída; equivalentes diretos passaram. Ver task P04.

P05 concluída em 26/10/2026: página `/parques` com leitura, cadastro sequencial por confirmação, edição administrativa, busca/paginação e navegação desktop/mobile. Proprietário confirmou admin/técnico, navegação responsiva e preview `Parque P002` sem gravação. Biome, boundaries, typechecks, 18 testes e build passaram. Ver task P05.

P06 e slice 03 concluídas em 26/10/2026. Integrações, migrations, restore, permissões, PostgreSQL/Electric, builds e testes passaram; proprietário confirmou o fluxo admin/técnico em desktop e Android físico. `pnpm check` foi interrompido sem saída após 30s; equivalentes diretos passaram. Servidores, portproxy e regra de firewall temporários foram encerrados/removidos e verificados. Roadmap 05 permanece parcial pelo catálogo offline.

Verificação documental da slice 04 em 26/10/2026: 23 documentos e 103 links locais conferidos, oito tasks com seções obrigatórias e checkboxes de implementação abertos; `git diff --check` passou. Nenhuma fonte/infraestrutura alterada; `pnpm check` e testes da aplicação não executados nesta preparação.

## Convenção de execução

1. Ler [arquitetura](../architeture.md), [memória](../memory.md), índice da slice e task escolhida. Respeitar dependências antes de começar.
2. Usar status `Planejada`, `Em andamento`, `Bloqueada` ou `Concluída`, acompanhado de `- [ ] Task concluída`. Registrar o motivo de bloqueio e o que falta, sem marcar o item como pronto.
3. Escrever em cada task: objetivo, escopo e exclusões, estado atual, dependências, plano com checkboxes, contratos/dados afetados, testes/aceite e evidências. Detalhar falhas, segurança e compatibilidade quando aplicáveis.
4. Marcar cada checkbox somente após realizar e validar a entrega descrita. Código existente e testes antigos são contexto, não comprovação automática de uma nova task.
5. Ao concluir, preencher evidência com data, mudanças, comandos/resultados e limitações; marcar `Task concluída` e o item correspondente no índice. Atualizar memória e etapas do roadmap afetadas, sem declarar uma etapa inteira concluída por cobertura parcial.
6. Rodar `pnpm check` para mudanças de fonte e validações de integração/contêiner para infraestrutura. Em mudanças só documentais, conferir caminhos, links e consistência; registrar que os testes da aplicação não foram executados.
7. Após concluir uma task ou slice, sugerir no resumo uma mensagem de commit curta no padrão Conventional Commits (`tipo(escopo): descrição`), coerente com as mudanças entregues e com a descrição em português. Manter em inglês apenas nomenclaturas técnicas que façam sentido preservar.

Mudanças de produto descobertas no design devem ser conciliadas com o proprietário e registradas na memória antes de alterar regras de negócio. Referências `.pen` continuam externas ao Git.

Planejamento da slice 06 em 28/10/2026: seis tasks abertas, dependências e critérios de aceite registrados. Verificação documental: 11 documentos e 50 links locais conferidos; `git diff --check` passou. Somente documentação alterada; `pnpm check` e testes da aplicação não executados.

Planejamento da slice 08 em 28/10/2026: cinco tasks Q01–Q05 abertas, base existente e lacunas identificadas por inspeção de API, páginas e journal. A etapa 10 reaproveita filtros/cursores existentes e trata paginação do Histórico, ordem por lista, classificação após saída do shape e retenção de projeções recebidas pela API. Verificação documental: links locais, seções obrigatórias, dependências e checkboxes conferidos; `git diff --check` passou. Somente documentação alterada; `pnpm check` e testes da aplicação não executados.


Q05 — 30/10/2026: validação automatizada executada (`pnpm check`, 57 testes/builds, e integração de issues com fixture isolada de 128 registros). Aceite integrado permanece aberto: navegador MCP Pencil indisponível por aplicativo desconectado; front autenticado, perda de rede entre páginas e saída/retorno real Electric ainda precisam de ensaio. Sem alterações de fonte, schema ou infraestrutura. Ver evidências em Q05; slice 08 e roadmap 10 não concluídos.

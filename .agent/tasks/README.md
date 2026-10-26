# Tasks de implementação

## Roadmap e slices

[00 - roadmap](<00 - roadmap/README.md>) preserva as 11 etapas de produto originais. Elas orientam a evolução do sistema, mas não substituem planos executáveis. Os números dessas etapas são independentes dos números das novas slices: `00 - roadmap/01-base` não é `01-fundacao`.

Cada nova slice fica em uma pasta `NN-nome/`, com um `README.md` que define resultado, limites, dependências e ordem de execução. Cada task ganha seu próprio arquivo `NN-nome.md`, criado quando houver contexto suficiente para detalhar a implementação. Criar apenas as tasks da slice em preparação; não decompor todo o roadmap antecipadamente.

## Slice atual

- [x] [01 — Fundação](01-fundacao/README.md): F01–F08 concluídas em 25/10/2026, com validação local e Android físico.
- [x] [02 — Equipe e acesso ao workspace](02-equipe-acesso/README.md): E01–E07 concluídas; integrações, desktop, Android e ações entre cargos validados. Ajustes visuais mobile ficam para melhoria posterior.

- [x] [03 — Parques e turbinas](03-parques-turbinas/README.md): P01–P06 concluídas em 26/10/2026; lifecycle com issues e catálogo offline permanecem nas etapas futuras.

- [ ] [04 — Registro e atendimento](04-registro-atendimento/README.md): I01–I08 planejadas em 26/10/2026; próxima task I01. Recorte online com histórico, recibos idempotentes e lifecycle de equipamentos integrado a issues.

Slice 03 concluída; slice 04 planejada, sem implementação iniciada. Catálogo offline permanece na etapa 07; conclusão e demais transições de lifecycle de issues permanecem na etapa 08.

Verificação documental do planejamento inicial em 26/10/2026: links locais dos documentos alterados e consistência das seis tasks conferidos; `git diff --check` passou. As validações de implementação da P06 estão registradas na task específica.

P01 concluída em 26/10/2026: contratos Zod e modelo de banco registrados; equivalentes diretos de lint, boundaries, typecheck e testes passaram. `pnpm check` ficou sem saída. Sem migração ou alteração de dados dev.

P02 concluída em 26/10/2026: migração `0004_parks_turbines` aplicada ao banco dev sem inserir inventário; instalação vazia, upgrade e privilégios validados em bancos descartáveis e no dev. Ver evidências na task P02.

P03 concluída em 26/10/2026: consultas GET de parks/turbines com autorização tenant, paginação, busca e erros que não revelam recursos de outros workspaces. Integração PostgreSQL descartável aprovada. Ver evidências na task P03.

P04 concluída em 26/10/2026: criação/edição de parks e turbines restrita a admin, autorização e escrita na mesma transação, revisão otimista e conflitos úteis. Integração descartável cobriu corridas, revogação, isolamento e persistência após reconstrução da API. `pnpm check` sem saída; equivalentes diretos passaram. Ver task P04.

P05 concluída em 26/10/2026: página `/parques` com leitura, cadastro sequencial por confirmação, edição administrativa, busca/paginação e navegação desktop/mobile. Proprietário confirmou admin/técnico, navegação responsiva e preview `Parque P002` sem gravação. Biome, boundaries, typechecks, 18 testes e build passaram. Ver task P05.

P06 e slice 03 concluídas em 26/10/2026. Integrações, migrations, restore, permissões, PostgreSQL/Electric, builds e testes passaram; proprietário confirmou o fluxo admin/técnico em desktop e Android físico. `pnpm check` foi interrompido sem saída após 30s; equivalentes diretos passaram. Servidores, portproxy e regra de firewall temporários foram encerrados/removidos e verificados. Roadmap 05 permanece parcial pelo lifecycle futuro integrado a issues e pelo catálogo offline.

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

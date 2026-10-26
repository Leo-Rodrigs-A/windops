# Slice 03 — Parques e turbinas

## Status

Concluída em 26/10/2026.

- [x] Slice concluída

## Resultado esperado

Administradores cadastram e editam códigos de parques e turbinas no workspace; técnicos consultam o catálogo. Dados persistem no PostgreSQL de desenvolvimento, com isolamento tenant e conflitos de edição explícitos. Esse catálogo fornece a localização necessária ao próximo domínio: chamados (issues).

## Ordem e dependências

As slices [01](../01-fundacao/README.md) e [02](../02-equipe-acesso/README.md) estão concluídas. Executar na ordem abaixo; começar pela P01.

| Task                                                                  | Entrega                            | Dependências               |
| --------------------------------------------------------------------- | ---------------------------------- | -------------------------- |
| [P01 — Modelo e contratos](01-modelo-contratos.md)                    | Modelo e contratos                 | Slices 01 e 02 concluídas. |
| [P02 — Schema, migração e privilégios](02-schema-migracao.md)         | Schema, migração e privilégios     | P01 concluída.             |
| [P03 — Consultas do catálogo](03-consultas-autorizadas.md)            | Consultas do catálogo              | P01 e P02 concluídas.      |
| [P04 — Cadastro e edição administrativa](04-cadastro-edicao.md)       | Cadastro e edição administrativa   | P01–P03 concluídas.        |
| [P05 — Interface de parques e turbinas](05-interface-catalogo.md)     | Interface de parques e turbinas    | P03 e P04 concluídas       |
| [P06 — Validação integrada e encerramento](06-validacao-integrada.md) | Validação integrada e encerramento | P01–P05 concluídas.        |
- [x] P01 — Modelo e contratos — concluída em 26/10/2026; contratos e matriz documentados, Biome/boundaries/typecheck/Vitest aprovados diretamente.
- [x] P02 — Schema, migração e privilégios — concluída em 26/10/2026; `0004` aplicada e integração de schema/grants aprovada.
- [x] P03 — Consultas do catálogo — concluída em 26/10/2026; GETs e autorização tenant validados em integração.
- [x] P04 — Cadastro e edição administrativa — concluída em 26/10/2026; autorização transacional, conflitos de revisão/código e corridas validados em PostgreSQL descartável.
- [x] P05 — Interface de parques e turbinas — concluída em 26/10/2026; proprietário confirmou admin/técnico, sidebar desktop e navegação mobile; captura validou o diálogo de código sugerido.
- [x] P06 — Validação integrada e encerramento — integrações, dev desktop/Android e limpeza de portproxy/firewall confirmados em 26/10/2026.

## Limites e decisões de escopo

- Operação online; nenhum catálogo local durável, PWA, proxy Electric ou outbox nesta slice. Não ampliar publicação/grants de replicação antecipadamente.
- Quantidades configuráveis, sem limite fixo de oito; código de parque único no workspace e código de turbina único no parque. Cada turbina representa um elevador, sem entidade adicional.
- Admin cria/edita; ambos os cargos consultam com membership ativa e sessão completa. Sem novo superadmin ou criação pública de workspace.
- Edição preserva identidade e parque da turbina; transferência e importação em lote ficam fora deste recorte.
- **Exclusão/arquivamento adiado até integração com issues:** por decisão do proprietário em 26/10, admin exclui definitivamente equipamento sem issues associadas; se houver qualquer histórico de issue, o equipamento é arquivado, todo histórico permanece e pode ser restaurado. Não expor endpoint/botão nesta slice: a decisão depende de issue schema/serviço e proteção contra corrida com criação de issues. Planejar no domínio issues. Definir efeito de arquivar parque sobre turbinas e restauração do agregado antes de implementar.
- Assim, a [etapa 05 do roadmap](<../00 - roadmap/05-parks.md>) continuará parcialmente atendida após esta slice. Catálogo offline pertence à etapa 07.
- Não popular dev com inventário fictício automaticamente. Testes automatizados usam bancos descartáveis; dados do percurso manual são combinados com o proprietário.
- UI usa Shadcn e padrões existentes; referências Pencil ficam no Windows e devem ser reconfirmadas na P05. Não há alteração de designs neste planejamento.
- Inconsistências mobile relatadas na slice 02 continuam adiadas, sem descrição suficiente para prometer correções específicas. P05/P06 devem evitar regressões e registrar reproduções; não reabrir a slice 02 automaticamente.

## Aceite da slice

- [x] Schema/migrações preservam dados e impedem relações entre tenants.
- [x] Admin cadastra/edita; técnico consulta, sem escrita pela API.
- [x] Códigos duplicados e revisões obsoletas produzem conflito, sem perda silenciosa.
- [x] Serviços públicos de parks permitem futura validação de localização sem imports internos entre módulos.
- [x] Interface integrada validada em desktop e Android, com temas e acessibilidade; limitações de dispositivos registradas.
- [x] Testes e evidências documentados; lifecycle com issues e catálogo offline continuam explicitamente pendentes para as etapas dependentes.

## Evidência do planejamento

P01–P06 concluídas em 26/10/2026. P06 passou integrações de catálogo, workspaces e autenticação, instalação/upgrade/restart, restore, permissões, PostgreSQL/Electric, Biome, boundaries, typechecks, builds e 18 testes. `pnpm check` permaneceu sem saída e foi interrompido; equivalentes diretos passaram. Proprietário confirmou admin criar/editar parque e turbina e técnico consultar sem editar em desktop e Android. Os servidores temporários foram encerrados, e portproxy/regra de firewall foram removidos e verificados ausentes. Lifecycle de issues e catálogo offline continuam fora desta slice e do roadmap 05 integral.

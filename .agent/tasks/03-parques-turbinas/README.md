# Slice 03 — Parques e turbinas

## Status

Em andamento. P01 concluída em 26/10/2026; P02–P06 pendentes.

- [ ] Slice concluída

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
- [ ] P02 — Schema, migração e privilégios
- [ ] P03 — Consultas do catálogo
- [ ] P04 — Cadastro e edição administrativa
- [ ] P05 — Interface de parques e turbinas
- [ ] P06 — Validação integrada e encerramento

## Limites e decisões de escopo

- Operação online; nenhum catálogo local durável, PWA, proxy Electric ou outbox nesta slice. Não ampliar publicação/grants de replicação antecipadamente.
- Quantidades configuráveis, sem limite fixo de oito; código de parque único no workspace e código de turbina único no parque. Cada turbina representa um elevador, sem entidade adicional.
- Admin cria/edita; ambos os cargos consultam com membership ativa e sessão completa. Sem novo superadmin ou criação pública de workspace.
- Edição preserva identidade e parque da turbina; transferência, importação em lote e exclusão física ficam fora deste recorte.
- **Desativação adiada até integração com issues:** exige impedir a ação quando houver chamados Pendentes/Em andamento e proteger a corrida com novas issues. Não substituir essa verificação por retorno fixo, tabela fictícia ou guard permissivo. Não expor endpoint/botão nesta slice. A regra original permanece obrigatória e deverá constar no planejamento do domínio issues; definir reativação de equipamentos antes de expô-la.
- Assim, a [etapa 05 do roadmap](<../00 - roadmap/05-parks.md>) continuará parcialmente atendida após esta slice. Catálogo offline pertence à etapa 07.
- Não popular dev com inventário fictício automaticamente. Testes automatizados usam bancos descartáveis; dados do percurso manual são combinados com o proprietário.
- UI usa Shadcn e padrões existentes; referências Pencil ficam no Windows e devem ser reconfirmadas na P05. Não há alteração de designs neste planejamento.
- Inconsistências mobile relatadas na slice 02 continuam adiadas, sem descrição suficiente para prometer correções específicas. P05/P06 devem evitar regressões e registrar reproduções; não reabrir a slice 02 automaticamente.

## Aceite da slice

- [ ] Schema/migrações preservam dados e impedem relações entre tenants.
- [ ] Admin cadastra/edita; técnico consulta, sem escrita pela API.
- [ ] Códigos duplicados e revisões obsoletas produzem conflito, sem perda silenciosa.
- [ ] Serviços públicos de parks permitem futura validação de localização sem imports internos entre módulos.
- [ ] Interface integrada validada em desktop e Android, com temas e acessibilidade; limitações de dispositivos registradas.
- [ ] Testes e evidências documentados; desativação, issues e offline continuam explicitamente pendentes.

## Evidência do planejamento

Planejamento criado em 26/10/2026 após leitura do roadmap, arquitetura, memória, modelo relacional e entrypoint vazio de parks. P01 implementada: contratos e documentação do modelo concluídos, sem tabelas, migrações ou alterações nos dados de desenvolvimento. `pnpm check` ficou sem saída; equivalentes diretos passaram. Testes de integração de banco não se aplicam sem schema/endpoints.

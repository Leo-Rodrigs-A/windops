# Slice 01 — Fundação

## Status

Em andamento. F01–F05 concluídas; F06 é a próxima tarefa de implementação.

- [ ] Slice concluída: todos os aceites das tasks abaixo comprovados.

## Resultado esperado

Aplicação executável no WSL2 com PostgreSQL persistente, schema de identidade e memberships migrado, privilégios mínimos e usuários autenticados por senha ou Google, sempre com segunda etapa obrigatória por e-mail. Membros acessam uma home protegida; contas sem vínculo recebem uma tela própria sem acesso operacional. Layouts iniciais seguem as referências externas do pen.dev.

O aceite é de desenvolvimento integrado e preparação segura para implantação. Provisionamento Neon/VPS, domínio e liberação de produção continuam na [etapa 11](<../00 - roadmap/11-production.md>). O login Google real foi validado em banco descartável; auth permanece desligada por padrão.

## Estado de partida

- Existem Compose, cliente PostgreSQL/Drizzle, schema de identidade/memberships, health checks e testes. Better Auth/Fastify é montado somente com `AUTH_ENABLED=true`; frontend continua com uma landing provisória.
- PostgreSQL/Electric/Mailpit foram observados saudáveis. F02 validou papéis, restart/restore e shape; F03 aplicou `0001_auth_core` no banco local e provou upgrade/reaplicação em bancos descartáveis.
- A configuração inicial compartilhava credenciais. F02 separou os papéis no volume existente; `windops` é usado somente como bootstrap administrativo.

## Tasks e ordem

- [x] [F01 — Modelagem do banco](01-modelagem-banco.md). Concluída; `.agent/database.md` revisado. Nenhum DDL aplicado.
- [x] [F02 — PostgreSQL e privilégios](02-postgres-seguro.md). Concluída em 25/10/2026; papéis locais aplicados e verificados.
- [x] [F03 — Schema e migrações da fundação](03-schema-migracoes.md). Concluída em 25/10/2026.
- [x] [F04 — Autenticação e segunda etapa](04-autenticacao.md). Concluída em 25/10/2026.
- [x] [F05 — Autorização e bootstrap](05-autorizacao-bootstrap.md). Concluída em 25/10/2026; depende de F03 e F04.
- [ ] [F06 — Referências e componentes visuais](06-design-system.md). Documento externo acessível; pode avançar após F01 em paralelo ao backend.
- [ ] [F07 — Telas e navegação autenticada](07-interfaces-iniciais.md). Depende de F04, F05 e F06.
- [ ] [F08 — Validação integrada](08-validacao-integrada.md). Depende de F01–F07.

## Limites

Não implementar parques, turbinas, CRUD de issues, histórico operacional, convites, gestão completa de membros, exclusão de conta, Web Push, sincronização ou persistência offline nesta slice. Modelar suas relações futuras em F01 para evitar incompatibilidades. Não criar tabelas vazias desses domínios nem botões que prometam funcionalidades indisponíveis.

F01 produz o plano relacional; F03 cria somente o schema necessário à fundação. Os layouts de chamados, filtros e offline existentes no design orientam os componentes e a estrutura da home, não antecipam as funcionalidades do roadmap.

## Referência visual consultada

Documento ativo em 24/10/2026: `G:\Meu Drive\01 - TRABALHO\08 - PENCIL WORKSPACES\WindOps.pen`. Caminho local observado, não dependência de build nem localização imutável. Reconfirmar pelo MCP antes de cada trabalho.

- `GhvhB`: Guia de Estilo; tipografia Inter e seções de cores claras/escuras.
- `F4nqNr`: Componentes; há também variantes de botões em agrupamentos do canvas.
- `QhQxw`: Home Screen Actions - dark mode; `FGvyG` é Homescreen - base, com variações de filtros, status, criação de chamado, sincronização e trabalho offline.
- `get_app_state` não listou componentes reutilizáveis formais; `GetVariables()` retornou um mapa vazio. Extrair propriedades dos elementos, sem presumir tokens já cadastrados no aplicativo.
- A inspeção estrutural não identificou telas explícitas de cadastro, login, código ou recuperação. F06 deve conferir visualmente e solicitar ao proprietário a referência/composição faltante antes da implementação final dessas telas.
- O desenho usa “Aberto”, “Resolvendo” e “Concluído” e inclui filtro por data; a memória usa Pendente/Em andamento/Concluída e filtros por parque/turbina. Registrar essa divergência para decisão, sem alterar domínio ou ampliar escopo automaticamente.

## Aceite da slice

- [ ] Ambiente novo cria o schema; atualização preserva a base existente; reaplicação de migrações é segura.
- [ ] Reinício mantém dados; aplicação não usa superusuário; papéis de runtime, migração e replicação têm testes de permissão.
- [ ] Cadastro, senha, Google, código por e-mail, recuperação e logout validados; nenhuma sessão incompleta acessa negócio.
- [ ] Vinculação por e-mail verificado, membership e negação entre tenants testadas no servidor.
- [ ] Bootstrap explícito e repetível cria o primeiro administrador sem promover o primeiro cadastro.
- [ ] Home, conta sem vínculo e telas de acesso funcionam com API real, referências visuais confirmadas e acessibilidade verificada.
- [ ] `pnpm check`, integração PostgreSQL/Electric e verificações de contêiner/fluxos móveis registradas em F08.

## Evidências da preparação

Preparação concluída em 24/10/2026: roadmap reorganizado e oito planos criados; referência pen.dev consultada sem escrita.

F01 concluída em 25/10/2026: modelo `.agent/database.md` criado e Better Auth 1.7.12 validado. F02 concluída em 25/10/2026: papéis provisionados no volume existente, isolamento, restart/restore e Electric validados. F03 concluiu migrações e schema da fundação. F04 concluiu autenticação, segunda etapa, OAuth simulado e login Google real. F05 concluiu autorização por tenant e bootstrap administrativo explícito; bootstrap real ainda requer execução operacional. Neon permanece pendente.

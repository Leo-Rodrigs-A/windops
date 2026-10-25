# F03 — Schema e migrações da fundação

## Status e dependências

Planejada. Depende de [F01](01-modelagem-banco.md) e [F02](02-postgres-seguro.md).

- [ ] Task concluída.

## Objetivo e escopo

Implementar o dicionário aprovado da fundação: tabelas de identidade e desafios necessárias ao provedor, workspaces e memberships. Não criar ainda parques, issues, convites ou tabelas de sincronização/notificações operacionais.

## Plano de implementação

- [ ] Gerar o schema compatível com a versão instalada e a configuração planejada do Better Auth em local descartável; revisar antes de incorporá-lo ao módulo `identity`. Usar Drizzle/SQL versionado como único processo de migração da aplicação, sem auto-DDL em startup nem um segundo histórico concorrente.
- [ ] Implementar em `workspaces` a membership N:N com cargo Administrador/Técnico e os campos, índices e constraints definidos em F01. Preservar a tabela existente e seu limite singleton; não converter cargo em atributo global do usuário.
- [ ] Materializar somente os objetos adicionais de desafio/sessão aprovados em F01, sem duplicar estruturas de segurança que o Better Auth já fornece. Definir as operações atômicas que F04 usará para consumo/reenvio e persistência entre reinícios.
- [ ] Manter ownership dos módulos e agregar a infraestrutura sem imports privados entre módulos. Adicionar FKs SQL entre módulos conforme F01, revisadas e verificadas contra os snapshots do Drizzle.
- [ ] Criar novas migrações incrementais após `0000_workspace_foundation.sql`; não reescrever a migração já aplicada. Atualizar journal/snapshots e revisar SQL gerado, privilégios e índices conforme o dicionário.
- [ ] Aplicar migrações com credencial dedicada e serialização documentada contra execução concorrente. Encerrar conexões em sucesso/falha e não iniciar runtime com DDL pendente silenciosamente.
- [ ] Adaptar o teste de integração atual, que pressupõe `workspaces` vazio: usar banco descartável/fixtures isoladas e transações, sem colidir com workspace real nem deixar registros de teste. Preparar fixture multi-tenant que remove o singleton somente no banco de teste, sem relaxar a migração de produção.
- [ ] Documentar evolução/rollback compatível: backup antes de mudanças destrutivas futuras, proibição de rollback automático de schema e verificação do schema empacotado na imagem de runtime.

## Testes e aceite

- [ ] Aplicação de todas as migrações em banco vazio e atualização a partir de `0000` com workspace existente; segunda execução sem mudanças adicionais ou perda de dados.
- [ ] Constraints rejeitam membership duplicada, cargo inválido, usuário/workspace inexistente e duplicidades de identidade definidas em F01.
- [ ] Testar IDs e relacionamentos usados pelo provedor, datas/expiração e integridade do journal; não basta verificar a presença das tabelas.
- [ ] Executar migração pela imagem da API e comprovar que o runtime sem DDL consegue operar o schema após os grants.
- [ ] `pnpm check`, testes de migração e integração PostgreSQL/Electric aprovados; atualizar `.agent/database.md` com a distinção entre schema criado e domínios ainda planejados.

## Evidências

Pendente. Registrar migrações adicionadas, versão/configuração do schema gerado, cenários de upgrade/reaplicação, testes de constraints e rollback operacional documentado. Não montar rotas de autenticação nesta task.

# D05 — Provisionar runtime, banco e rede

## Status

Em andamento

- [ ] Task concluída

## Responsável

Codex; proprietário executa ações de console sem acesso delegado.

## Objetivo

Preparar o destino escolhido com isolamento, persistência e banco apto à replicação.

## Escopo e exclusões

Infraestrutura e provisionamento de roles/publicação; preservar ownership de módulos, dados e permissões mínimas.

## Estado atual

Compose de produção usa Neon externo e volumes Electric/Caddy. Provisionamento local de roles não comprova compatibilidade com permissões do Neon.

## Dependências

D03 e D04.

## Plano

- [ ] Para VPS: preparar Docker/Compose, atualizações, firewall, chaves, usuário de deploy restrito e diretórios operacionais. Para PaaS: criar serviços privados/públicos, discos e ingress conforme D02. Implementar só o destino escolhido.
- [x] Confirmar arquitetura x86_64 do host e instalar/ativar as units systemd da janela Electric; helper protegido retorna sucesso sem alterar containers até existir `.release.env` e `.env.production`.
- [ ] Configurar DNS e HTTPS com renovação e uma origem pública; publicar somente entrada web e acesso administrativo restrito. Confirmar externamente que Electric, banco e portas internas não estão expostos.
- [ ] Provisionar banco com papéis runtime/migrador/replicação separados, TLS verificado e conexões diretas onde exigidas; habilitar logical replication e validar privilégios efetivos no provedor.
- [ ] Definir ordem explícita roles→migrações→grants/publicação→Electric→API/web, ajustando scripts existentes quando necessário. Validar instalação vazia e repetição; não presumir que o deploy atual cria roles ou publicação.
- [ ] Conferir publicação limitada às tabelas/projeções autorizadas, slots/WAL e comportamento de suspensão do banco. Validar shape pelo proxy autenticado, isolamento tenant e rejeição de filtros arbitrários.
- [ ] Configurar persistência e reiniciar runtime/host ou equivalente PaaS em ensaio; verificar dados, certificados e retomada da replicação. Registrar inventário sem segredos e atualizar manual.

## Contratos e dados afetados

Infraestrutura e provisionamento de roles/publicação; preservar ownership de módulos, dados e permissões mínimas.

## Testes e aceite

HTTPS, isolamento externo, grants, instalação/reaplicação e restart comprovados no destino. Ready comprova dependências; smoke autenticado comprova fluxo. Executar checks de integração/container e pnpm check se fonte mudar.

## Evidências

Planejamento em 30/10/2026. Execução iniciada em 02/11/2026; progresso e limites registrados abaixo.

### Preparação da VPS e Neon — 02/11/2026

VPS reportada pelo proprietário: `uname -m` e arquitetura Docker `x86_64`, Docker ativo. Helper e units systemd foram instalados do commit inicial f5395bba; a primeira execução falhou porque esse commit não tinha guarda para ausência de `.release.env`. Timer foi parado, checkout atualizado para `3350fc5d3322d8573e449fdbcc55160ca9416483`, helper atualizado nos dois caminhos (`/usr/local/sbin` e `/opt/windops/scripts`), timer reativado e serviço executado com `status=0/SUCCESS`, sem release e sem alteração de containers. Timer enabled; próxima execução mostrada como 21:00 UTC (18:00 `America/Sao_Paulo`).

Neon SQL Editor: `SHOW wal_level` retornou `logical`. Consulta a `pg_roles` retornou `rolcanlogin=true` para `windops_app`, `windops_migrator` e `windops_replication`; `rolreplication=true` somente para `windops_replication`, conforme esperado. Habilitação de logical replication reiniciou compute segundo a configuração do Neon. Ainda faltam validar privilégios efetivos, TLS verificado, schemas/migrações, publication/allowlist, endpoint direto e persistência/rede; nenhum schema ou dado operacional foi criado.

Primeira matriz de privilégios no Neon apontou discrepâncias em relação ao contrato local: `windops_migrator` não tem `CREATE` no database embora o provisionador o exija; `windops_replication` aparenta ter `CREATE` no database (não esperado); `TEMP` aparece efetivo para as três roles, embora deva ser revogado de PUBLIC. Origem em ACL/membership/superuser ainda não identificada. Provisionamento/migrações pausados até inspecionar ACLs e memberships somente leitura. Resultado dos selects de tabelas/publicações não foi incluído na evidência enviada.

Inspeção seguinte identificou `windops_replication` como membro de `neon_superuser`; essa role tem `CREATEDB`, `CREATEROLE`, `BYPASSRLS`/`REPLICATION` e privilégios de dados ampliados conforme documentação do Neon. A membership explica acesso fora do contrato de menor privilégio; `TEMPORARY` também está concedido a `PUBLIC`. Não revogar ou provisionar ainda: primeiro testar em transação com `ROLLBACK` se a role retém `REPLICATION` sem a membership e se grants mínimos podem ser aplicados pelo role owner. `windops_app` e `windops_migrator` não mostram memberships adicionais; `windops_migrator` precisa de `CREATE` no database.

Tentativa de rollback-probe parou no primeiro comando: `ALTER ROLE windops_replication ...` retornou SQLSTATE `42501`, pois `windops-production_owner` não tem `ADMIN OPTION` sobre essa role. Não houve `COMMIT`; limpar a sessão com `ROLLBACK` e inspecionar grantor/admin_option das memberships antes de escolher o mecanismo de correção. Nenhuma permissão/membership foi alterada por essa tentativa; migrações seguem pausadas.

Consulta posterior confirmou que `cloud_admin` concedeu `neon_superuser` a `windops_replication` e `windops-production_owner`, ambas sem `ADMIN OPTION`; o owner também recebeu memberships de administração das roles app/migrator sem herança/SET. Portanto o owner não pode remover o acesso privilegiado do role de replicação por SQL. Neon documenta que roles do Console/API/CLI recebem `neon_superuser`, enquanto role SQL de privilégio mínimo não pode receber REPLICATION manualmente. D05 pausa a implantação até o proprietário decidir entre aceitar a exceção de privilégio para Electric com contenção adicional ou reavaliar um banco que permita role REPLICATION least-privilege.

Decisão do proprietário — 02/11/2026: manter Neon e aceitar explicitamente a exceção de privilégios para a conexão Electric. Mitigações obrigatórias: URL somente no env root-owned, entregue apenas ao container Electric; Electric sem porta pública, acessível somente na rede Docker privada; clientes usam proxy API autenticado; publication manual apenas com allowlist sanitizada; não apresentar a role como least-privilege. Exceção e limites registrados em `infra/postgres/README.md`, `.agent/database.md`, `.agent/architecture.md` e `docs/producao.md`. Grants mínimos das roles app/migrator, TEMP, migration ownership, publication e TLS permanecem pendentes.

Proprietário confirmou no Neon SQL Editor que o database começa sem tabelas em `public` e sem publicações. Não há dados/objetos existentes a preservar na instalação inicial. Revogou `TEMPORARY` de `PUBLIC` e concedeu `CREATE` no database a `windops_migrator`; matriz efetiva posterior confirmou: `windops_app` (`CONNECT`, `USAGE public`; sem `CREATE` no database/schema nem `TEMP`), `windops_migrator` (`CONNECT`, `CREATE` no database/schema, `USAGE public`; sem `TEMP`) e `windops_replication` (`CONNECT`, `CREATE` no database, `TEMP`, `USAGE public`; sem `CREATE` em `public`). Este último segue como exceção privilegiada aceita por decisão do proprietário, não como role least-privilege. Migrações e publicação ainda não executadas.

No início da D05 não havia package GHCR e a publicação estava acoplada a `DEPLOY_ENABLED`. O workflow foi alterado para separar `PUBLISH_IMAGES` de `DEPLOY_ENABLED`; merge, CI, publicação por SHA e pull na VPS foram concluídos, com evidência abaixo. O job de deploy permaneceu ignorado.

Evidência posterior — 02/11/2026: proprietário confirmou merge do ajuste de formatação e CI completo; Actions confirmou CI `67` concluído com sucesso para `baa2b4b04c536927d35a49c66c02e07d032d03e3`. Deploy workflow `64` publicou as duas imagens e terminou com sucesso; job `deploy` ficou `skipped`. API: `ghcr.io/leo-rodrigs-a/windops-api:baa2b4b04c536927d35a49c66c02e07d032d03e3` (`sha256:2a6f587cf9af03d838a2a9971a0b2f0dd0eb7ae4e9df078691775c5505388288`). Web: `ghcr.io/leo-rodrigs-a/windops-web:baa2b4b04c536927d35a49c66c02e07d032d03e3` (`sha256:75b2b52811eebe828f91e99c45f03592074b8b79ca28ef9dbaff3b66357c2ce9`). Ainda falta confirmar visibilidade/permissão de pull na VPS; nenhuma migration ou serviço de produção foi iniciado.

Pull das imagens passou na VPS. A primeira execução isolada de `migrate` autenticou como `windops_migrator`; consulta posterior retornou database `windops-production`, `journal_exists=true` e 21 tabelas em `public`. Nenhuma API/web/Electric foi iniciada. O driver emitiu aviso de futuro comportamento de `sslmode=require`; a versão atual indica equivalência a `verify-full`. Repetição do migrador ainda pendente para comprovar idempotência; grants de runtime, publicação e validação TLS/Electric continuam pendentes.

Repetição na VPS terminou com `MIGRATION_REPEAT_OK`, confirmando idempotência do migrador. Revisão encontrou que o provisionador local reabria `DELETE` em tabelas onde as migrations o revogam. O script foi corrigido e `provision-neon.sql` criado para executar como `windops_migrator`, sem criação/alteração de roles. `pnpm check` (86 testes), `sh -n` e `git diff --check` passaram. Em PostgreSQL 17.11 temporário e isolado, migrations foram aplicadas, o provisionador local foi executado uma vez e `provision-neon.sql` foi executado duas vezes. Verificações confirmaram publication exata de `workspaces`, `parks`, `turbines`, `issue_sync_rows`, `issue_sync_events`, `REPLICA IDENTITY FULL` nas cinco e ausência de permissões proibidas para app (`DELETE` em signup/notificações/eventos imutáveis, `UPDATE` em eventos, escrita em `issue_sync_rows`). Contêiner temporário foi encerrado. Isso valida o SQL localmente, mas ainda falta PR/CI e execução real no Neon.

CI de PR reportou falha em `pnpm db:empty-check`: `permissions.mjs` exige `SELECT` do runtime em `issue_sync_rows`, enquanto a nova reconciliação havia revogado tudo e não o restaurava. Correção local: restaurar apenas `SELECT` nos dois provisionadores, mantendo INSERT/UPDATE/DELETE revogados; adicionar verificações de negação para essas três operações. `pnpm check` passou após o ajuste; falta CI remoto confirmar `db:empty-check`.

Atualização remota — 02/11/2026: PR #4 (`feat/d05-provision-neon`) foi mergeado. CI run `72` passou no `main`, SHA `11c41793c7734c46b63eaf9c7232b546d61a13fc`, incluindo `db:empty-check`; o workflow Deploy run `66` publicou API e web para esse SHA e terminou com sucesso, mantendo `deploy` como `skipped`. Digests: API `sha256:4ebfdd5b3b022816865a6273b2a1fe22353f3808553e26284bdcaea4de5e5c4e`; web `sha256:aaa9588aaf94c324d8415c280c36bb43e35a48b096b767cd396a19ba180aaa3e`. O provisionador concede somente `SELECT` do runtime em `issue_sync_rows` e mantém INSERT/UPDATE/DELETE negados, cobertos pelo CI. Próximo passo operacional: executar `infra/postgres/provision-neon.sql` na VPS via job isolado `migrate`, autenticado como `windops_migrator`; isso aplica grants e publication, mas não inicia API/web/Electric. O provisionamento real no Neon e a verificação de resultado ainda não foram confirmados.

Execução remota do provisionador — 02/11/2026: o job one-off terminou sem erro e reportou `current_user=windops_migrator`, mas a consulta acoplada retornou `publication_tables=0`, incompatível com as cinco tabelas esperadas. Portanto grants/publication ainda não foram aceitos como verificados; confirmar `current_database()`, existência da publicação e tabelas em `pg_publication_tables` antes de avançar para Electric.

Verificação no Neon SQL Editor: proprietário confirmou `current_database=windops-production` e `current_user=windops-production_owner`. As consultas de catálogo executaram, mas nenhum resultado de linhas foi fornecido; existência e conteúdo da publication continuam sem confirmação.

Consulta agregada posterior no SQL Editor confirmou `publication_exists=false`, contagem `0`, sem tabelas; o banco exibido foi `windops-production` e o usuário `windops-production_owner`. Apesar do job one-off ter terminado como `windops_migrator`, não assumir que CLI e SQL Editor apontaram para a mesma branch Neon: comparar somente hostname/branch de destino antes de repetir ou iniciar Electric.

Host extraído da `MIGRATION_DATABASE_URL` na VPS: `ep-blue-mud-b601ar3h.c-2.sa-east-1.aws.neon.tech`, igual ao endpoint de produção previamente informado. Publication continua ausente. Próximo diagnóstico: conferir tamanho/conteúdo do arquivo SQL copiado e branch selecionada no Editor; o resultado `0` por si só não comprova que o script foi carregado/executado.

Diagnóstico confirmado — 02/11/2026: `/opt/windops/provision-neon.sql` tinha zero bytes. O job one-off conectou como `windops_migrator`, executou a consulta de verificação e terminou sem erro, mas `readFile` forneceu SQL vazio; portanto nenhuma alteração de grants/publication ocorreu. Rebuscar/copiar o arquivo do `main`, verificar conteúdo não vazio e então repetir o job idempotente.

Correção de cópia — 02/11/2026: o clone Git real na VPS fica em `/tmp/windops-f5395bba`; `/opt/windops` é somente o diretório de deploy e não contém `.git`. `origin/main` foi atualizado de `3350fc5` para `11c4179`; o provisionador foi copiado para `/opt/windops/provision-neon.sql`, com 4.159 bytes e instruções `ALTER/CREATE PUBLICATION` presentes. A execução no Neon ainda está pendente.

Primeira repetição após corrigir a cópia falhou antes de executar SQL: o processo não-root do container recebeu `EACCES` ao ler `/provision-neon.sql`, pois o arquivo foi instalado com modo `0600`. A conexão foi estabelecida, mas grants/publication não foram alterados. Como o arquivo contém somente SQL operacional sem segredos, ajustar leitura para o container (`0644`) e repetir.

Provisionamento Neon aplicado — 02/11/2026: repetição do job isolado terminou sem erro em `windops-production`, `current_user=windops_migrator`; consulta na mesma sessão retornou exatamente cinco tabelas em `electric_publication_default`: `public.workspaces`, `public.parks`, `public.turbines`, `public.issue_sync_rows` e `public.issue_sync_events`. Ainda validar `REPLICA IDENTITY FULL` e privilégios efetivos de `windops_app` no Neon antes de iniciar Electric.

Verificação Neon concluída — 02/11/2026: SQL Editor retornou `REPLICA IDENTITY FULL=true` nas cinco tabelas publicadas. `windops_app` tem SELECT em `issue_sync_rows`, sem INSERT/UPDATE/DELETE; também não tem UPDATE/DELETE em `issue_sync_events`. Isso confirma a allowlist e as restrições consultadas do runtime. Electric ainda não iniciado; seu ensaio deve ocorrer na janela permitida pelo proprietário (06h–18h `America/Sao_Paulo`).

Exceção de ensaio noturno — 02/11/2026: proprietário autorizou iniciar Electric após a janela diária para o ensaio desta noite, aceitando que Neon possa permanecer ativo. `docker compose ps electric` retornou `Up ... (healthy)` com imagem `electricsql/electric:1.8.1`; API/web não iniciadas. Esse health check local não comprova conexão/replicação com Neon; aguardar logs e verificar slot/sync. Timer systemd permanece habilitado para aplicar o horário normal amanhã.

Logs iniciais do Electric — 02/11/2026: pools `admin` e `snapshot` conectaram ao endpoint Neon direto; adquiriu lock `electric_slot_default`, identificou PostgreSQL 18.6/timeline 1, declarou conexão e iniciou pipeline de replicação. Electric informou zero shapes existentes e publicação com zero tabelas necessárias nesse estado; como não há API/clientes ainda, isto não comprova streaming de uma tabela. O aviso de `libsctp.so.1` não impediu a inicialização. Antes do primeiro release, o helper systemd faz no-op por ausência de `/opt/windops/.release.env`. O proprietário pretende executar o release hoje; `scripts/deploy.sh` grava esse arquivo após health checks e chama `scripts/electric-window.sh`, que após 18h para o Electric. A partir daí o timer de amanhã poderá aplicar a pausa normal. Não criar timer one-off; verificar slot lógico no Neon.

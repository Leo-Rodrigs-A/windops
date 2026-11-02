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

Proprietário verificou que nenhum package GHCR foi publicado. O workflow existente acoplava publicação a `DEPLOY_ENABLED`, o que também habilitaria o deploy. Em D05, `deploy.yml` e documentação foram alterados para controlar publicação com `PUBLISH_IMAGES` e rollout separadamente com `DEPLOY_ENABLED`; ambos dependem de PR/CI na `main`. A mudança ainda precisa ser revisada/mesclada e observada no Actions. Para publicar sem rollout, definir `PUBLISH_IMAGES=true` antes do próximo push aprovado à `main`, mantendo `DEPLOY_ENABLED=false`; depois validar package, visibilidade e acesso de pull antes das migrations.

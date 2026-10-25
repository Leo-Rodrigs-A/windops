# F01 — Modelagem do banco

## Status e dependências

Planejada. Primeira task da fundação; sem dependências de implementação.

- [ ] Task concluída.

## Objetivo e escopo

Produzir `.agent/database.md` com um modelo relacional implementável da fundação e um mapa de evolução dos domínios posteriores. Esta task é de modelagem: não executar DDL, aplicar migrações nem gerar antecipadamente todo o banco do produto. Fonte de regras: [memória](../../memory.md) e [arquitetura](../../architeture.md).

## Estado atual

Somente `workspaces` possui schema de negócio, com UUID, nome, data de criação e índice singleton. Better Auth `1.7.12` está declarado, usando um pool PostgreSQL no builder; confirmar a versão efetivamente instalada e seus recursos antes de projetar tabelas de autenticação. Os demais módulos são pontos de extensão, não schemas implementados.

## Plano de implementação

- [ ] Inventariar schema, migração inicial e journal aplicado com consultas somente de leitura. Documentar o que já existe e preservar sua compatibilidade.
- [ ] Definir o dicionário da fundação: identidade global; contas/provedores, sessões e verificações exigidos pelo Better Auth; desafios obrigatórios de e-mail; workspaces e memberships N:N com cargo. Para cada entidade, descrever dono, campos físicos, tipo, nulabilidade, default, PK, FKs, checks, unicidade, índices, retenção e exclusão.
- [ ] Validar o schema gerado e os pontos de extensão da versão instalada do Better Auth em ambiente descartável. Registrar como identidade, sessão provisória, desafio e sessão liberada se relacionam para senha e OAuth. Não presumir que ativar um plugin opcional de 2FA cobre a regra obrigatória nem criar tabelas duplicadas às do provedor.
- [ ] Fixar o formato de IDs da identidade conforme suporte do provedor e usar esse mesmo tipo em todas as FKs; conservar UUIDs de workspaces e planejar UUIDs gerados pelo cliente para os futuros registros offline. Definir datas em UTC com `timestamptz` e política de normalização de e-mail sem regras específicas de provedores, como remover pontos ou sufixos `+`.
- [ ] Especificar unicidade de e-mail normalizado, identidade externa por provedor/identificador e membership por usuário/workspace. Definir os índices para login, resolução de sessão, validade de desafios e consulta de memberships. Não persistir senhas, códigos ou tokens adicionais em texto puro; respeitar o formato seguro exigido pelo provedor e restringir acesso às suas tabelas.
- [ ] Definir a máquina de estados do desafio obrigatório: emissão após primeira etapa válida, prazo de 15 minutos, consumo único, invalidação no reenvio, limite de tentativas, vínculo à tentativa de login e transações contra confirmação/reenvio concorrentes. Diferenciar verificação de titularidade, segunda etapa e recuperação de senha; registrar se há composição segura comprovada, sem presumir equivalência.
- [ ] Desenhar ERD e matriz de invariantes do restante do domínio: convites, parques, turbinas, issues, eventos de auditoria, recibos de comandos, notificações, subscrições push e outbox de entregas. Relacionar cada entidade à etapa do roadmap que criará sua migração; ainda não detalhar payloads finais sem necessidade.
- [ ] Para as relações futuras, explicitar isolamento por `workspace_id`, coerência parque/turbina/issue e chaves compostas quando necessárias. Definir a estratégia para referências SQL entre módulos sem importar schemas/repositórios privados: FKs entre donos distintos em migrações SQL revisadas, com acesso de aplicação somente por serviços públicos.
- [ ] Documentar o limite da transação de negócio: comando idempotente, mudança, evento e entrega futura; distinguir a outbox local do dispositivo da outbox de notificações no PostgreSQL. Definir quando cada tabela entra em uso para não perder eventos entre as etapas 06, 07 e 09 do roadmap.
- [ ] Especificar retenção de histórico com ator excluído, revogação de membership e limpeza de dados efêmeros. Nada de cascade que apague eventos ou chamados ao excluir uma conta; não adicionar a UI de exclusão nesta slice.
- [ ] Registrar matriz de acesso por papel PostgreSQL e módulo: tabelas privadas de autenticação não entram nos shapes nem na publicação planejada do Electric. Autorização de tenant é obrigatória nos serviços; não declarar RLS implementado. Fixar a estratégia de teste multi-tenant apesar do singleton de produção.
- [ ] Definir a sequência de migrações F03 e o que cada uma entrega, inclusive geração de schema do provedor, dados existentes, grants, rollback operacional e bootstrap. Decisões de segurança ou produto ainda abertas devem ficar explícitas e resolvidas antes da task dependente.

## Aceite e revisão

- [ ] `.agent/database.md` contém ERD, dicionário físico da fundação, índices/constraints, matriz de permissões, sequência de migrações e mapa futuro por roadmap; cada regra tem enforcement identificado no banco, serviço ou ambos.
- [ ] Simular no modelo: conta órfã, mesmo e-mail em senha/Google verificado, provedor não verificado, duas confirmações do mesmo código, reenvio concorrente, usuário com dois vínculos e revogação de um deles.
- [ ] A compatibilidade Better Auth foi sustentada por código/documentação da versão instalada e experimento, não apenas por um nome de tabela sugerido. O plano deixa F03 e F04 sem decisões estruturais de autenticação em aberto.
- [ ] Arquitetura e memória referenciam o modelo, distinguindo entidades planejadas e tabelas implementadas. Não marcar banco pronto por existir ERD.

## Evidências

Pendente. Ao concluir, registrar data, versão do provedor, artefatos consultados/gerados em ambiente descartável, decisões tomadas e resultado da revisão dos cenários. O plano desta task ainda não é o modelo de dados concluído.

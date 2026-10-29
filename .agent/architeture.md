# Arquitetura — Wind Ops

## Objetivo e estágio

Registrar problemas durante visitas sem internet e compartilhar depois sem transcrição de memória. Piloto: 12 usuários, 8 parques com 8 turbinas inicialmente; quantidade não é fixa. Escopo: elevadores, um por turbina, somente texto. PWA mobile-first Android e iPhone. A base executável antecede a implementação visual guiada pelo Pencil/pen.dev e as funcionalidades.

## Referências visuais externas

O proprietário mantém layouts e design system em arquivos `.pen`, em uma pasta local do Windows fora do repositório. Esses arquivos servem somente como guia de desenvolvimento: não serão copiados para o projeto nem commitados, e não são dependências de execução, build ou CI. Versionar no projeto a implementação dos tokens, componentes e telas, além das decisões documentadas.

Pencil/pen.dev roda no Windows e Codex CLI no WSL2. Consultar os documentos pelo MCP do aplicativo Windows, confirmando o arquivo ativo antes de usá-lo. O caminho da pasta é local, informado pelo proprietário, e não deve ser fixado no código ou na infraestrutura. Alterar os designs somente mediante solicitação explícita. Se a referência estiver indisponível ou incompleta, registrar a limitação e solicitar o acesso ou esclarecimento necessário; não inventar layouts definitivos.

## Monólito modular

Monorepositório pnpm/TypeScript; um backend implantável. React/Vite + TanStack Router no frontend; Tailwind e ShadcnUI com design provisório. TanStack DB/IndexedDB mantém o journal local e o cliente Electric `ShapeStream` alimenta a réplica por shapes autorizados; S07 conectou Home, detalhe, catálogo, Histórico e Cloud ao estado local, aguardando validação de interface e aparelho. Fastify + Zod Type Provider gera OpenAPI, apresentado pelo Scalar apenas fora de produção.

Toda interface usa componentes Shadcn UI, inclusive primitives de formulário, feedback, navegação e sidebar. Compor padrões do produto a partir dos componentes Shadcn e usar Tailwind para tokens/estilos; não criar primitives visuais paralelos. Tema claro/escuro usa tokens CSS e a preferência explícita do usuário fica em `localStorage` no navegador.

Módulos:
- identity: autenticação, verificação, vínculo de métodos, perfil e exclusão de conta.
- workspaces: membros, cargos, convites e autorização por workspace.
- parks: parques, turbinas e desativação de equipamentos.
- issues: texto, localização, estados e controle de atendimento.
- audit: eventos imutáveis, antes/depois e restauração rastreável.
- notifications: campainha, subscrições Web Push e entrega.
- sync: comandos idempotentes, revisão de conflitos e proxy de shapes.

Cada módulo é dono de seus dados. Chamadas entre módulos usam serviços públicos exportados em index.ts; não importar tabelas/repositórios internos. O script de lint verifica imports relativos entre módulos. Não introduzir aliases que contornem a regra. Plataforma central fornece configuração, pool PostgreSQL e adaptadores de e-mail/push. Contratos compartilhados não importam código do servidor nem segredos.

## Dados e isolamento

O modelo relacional está registrado em [`.agent/database.md`](database.md), definido em F01 e implementado em F03 com Better Auth 1.7.12. `0001_auth_core` adiciona identidade, challenges e memberships; o banco WSL local já recebeu a migração. F02 separou e verificou os papéis; `windops` continua bootstrap administrativo, enquanto API, migrador e Electric usam papéis próprios. Neon não está provisionado. F04 validou autenticação; F05 implementou autorização e bootstrap. `workspaces` consulta membership ativa no PostgreSQL em cada requisição; o SQL administrativo está em `apps/api/scripts/bootstrap-workspace.sql`, não roda no startup e exige conta verificada e UUIDs explícitos.

Drizzle controla schema e migrações SQL versionadas. Além de workspaces, identidade, desafios de segunda etapa e memberships, a migração `0004_parks_turbines` cria `parks` e `turbines` com integridade tenant e códigos únicos. Migração aplicada ao banco dev; schema e permissões validados em instalações descartáveis e no dev. P03 implementa consultas GET autorizadas e serviço público de localização; P04 implementa POST/PATCH admin com autorização revalidada dentro da transação, locks de workspace/membership compatíveis com as operações administrativas, revisão otimista e unicidade PostgreSQL. Escritas concorrentes com revogação são serializadas. P05 implementa `/parques` com catálogo responsivo e controles administrativos; proprietário confirmou os cargos, navegação desktop/mobile e o diálogo de código sugerido. Decisão de 26/10/2026 para o lifecycle futuro: excluir fisicamente somente sem referências atuais/históricas; arquivar quando houver apenas histórico fechado; bloquear arquivo enquanto houver issue aberta no equipamento ou, para parque, em qualquer turbina descendente. Arquivar parque inativa efetivamente as turbinas sem alterar flags individuais; restaurá-lo preserva turbinas que já estavam individualmente arquivadas. As operações serializam com abertura/edição/atendimento de issues. Remover o limite singleton exige migração futura; workspace_id continua obrigatório em todos os dados de negócio. Não haverá endpoint de criação pública de workspace no piloto.

I02 criou e aplicou no dev `0005_issues_audit_sync` e `0006_issue_integrity_checks`; L02 adiciona `0011_issue_lifecycle_archive`, com marcador `archived_at`, eventos de lifecycle e projeção Electric sanitizada sem alterar históricos anteriores: `issues`, `issue_events`, `issue_location_references` e `sync_commands`, com FKs tenant e retenção de referências históricas. API pode modificar issues; eventos, referências e recibos são append-only para runtime. I08 revalidou instalação vazia, upgrade desde 0004 preservando conta/catálogo, restart, grants e restore em bancos descartáveis; publicação Electric continua limitada a `public.workspaces`. A integração de issues cobre os endpoints online, isolamento, idempotência e corridas. O proprietário aprovou as funcionalidades implementadas; o recorte segue online e não implica operação offline.

E02 adiciona `workspace_invitations`: token aleatório de uso único (somente SHA-256 armazenado), validade de 48 horas, normalização de e-mail e role selecionada com padrão `technician`. O envio de e-mail ocorre após commit; falha encerra esse convite e recuperação cria outro, invalidando o anterior. `pending` pode indicar queda entre commit e entrega; não existe outbox/retry automático ainda. A tabela não entra na publicação Electric. Contratos/migração estão definidos; endpoints de equipe e convite permanecem para E03–E05.

Administrador vê membros do workspace e contas sem vínculo algum; não vê usuários exclusivos de outro workspace. Acesso a issues, histórico, convites, notificações e shapes sempre valida membership no servidor. Nunca confiar em workspace_id do cliente sem autorização. Cache e fila locais separados por conta e workspace.

O schema Better Auth foi mapeado em F03 com OAuth tokens criptografados e marcador da segunda etapa server-only. As rotas estão implementadas e são montadas somente com `AUTH_ENABLED=true`; por padrão permanecem desativadas. Bootstrap do primeiro workspace/administrador nunca promove automaticamente o primeiro cadastro.

## API e autenticação

Contratos atuais incluem `GET /api/sync/:collection` para `workspace`, `parks`, `turbines`, `issues` e `issue-events`. O servidor autoriza sessão completa + membership ativa e escolhe tabela, colunas e filtro tenant; handles Electric são assinados por workspace/coleção. Issues/eventos são filtrados para issues ativas e não arquivadas, com `actor_label` sanitizado; catálogo é replicado para manter referências arquivadas. A UI ainda não usa as coleções locais. Demais contratos de health, identidade, workspace, equipe, convites e catálogo mantêm as autorizações e limites definidos abaixo. `/api/docs` fica disponível apenas fora de produção. `/api/me` retorna ID, nome e e-mail do usuário autenticado, além de suas memberships ativas. Membros, diretório, convites, cargos, revogação e emissão/reenvio exigem sessão com segunda etapa concluída e role admin ativa no workspace. Comandos de membership recebem `expectedRevision`; o servidor bloqueia workspace e vínculo na mesma ordem usada por aceite/convite. Admin pode promover técnico, rebaixar a própria membership para Técnico ou sair do workspace somente quando outro admin ativo permanecer; outro admin não pode rebaixar/remover admin. A regra do último administrador é verificada sob lock do workspace. Revogação preserva identidade/histórico e invalida convites pendentes do e-mail na mesma transação. O diretório lista somente contas com e-mail verificado e sem membership ativa em qualquer workspace; nunca revela contas ligadas a outro workspace. As listas usam cursores e limites validados. A consulta de convites omite o token. Aceite resolve workspace pelo hash do token e exige conta verificada, e-mail correspondente e segunda etapa concluída. `GET` não consome convite; o link usa fragmento, que o frontend retira do histórico e mantém temporariamente na sessão da aba. A tela está em `/convite/aceitar`; gestão fica em `/equipe` e é protegida pelo guard e pelos handlers. As rotas `/api/auth/*` são opt-in e ficam desabilitadas por padrão.

Better Auth e a integração Fastify foram implementados e validados em F04; rotas ficam desabilitadas por padrão (`AUTH_ENABLED=false`). Fluxos de senha e OAuth simulado/real passaram em PostgreSQL/Mailpit, incluindo vinculação nas duas ordens, cookie/callback e segunda etapa. Login Google e senha convergem por e-mail cuja titularidade foi verificada. Não vincular contas apenas porque um provedor declara um e-mail não verificado. Toda nova sessão online exige código por e-mail válido por 15 minutos; reenvio invalida o anterior. Nenhuma sessão com acesso de negócio antes de completar a segunda etapa, inclusive OAuth. A autorização por tenant está implementada em F05; as consultas de membros/diretório de E03 chamam o guard de `workspaces` em cada requisição. `identity` retorna somente campos públicos mínimos por serviço; senhas, contas OAuth e estado de verificação permanecem internos.

E04 envia convites após commit; SMTP/Mailpit foi exercitado e Resend real não. Falha marca convite como failed/revogado; recuperação emite outro token e substitui o anterior. E05 adiciona `revision` monotônica à membership; reativação por convite também incrementa a revisão, evitando que retry antigo de remoção revogue novamente o vínculo. E06 implementou `/convite/aceitar`, remoção imediata do fragmento e gestão em `/equipe`; não houve envio real de convites. A validação autenticada dessas telas com duas contas pertence à E07.

Usar cookies HttpOnly/Secure em produção, origem confiável e proteção CSRF. Não copiar tokens de sessão para armazenamento JavaScript como estratégia offline. Metadados de acesso local e dados persistidos permitem reabrir o dispositivo já autenticado; sessão expirada permite trabalho local, mas upload exige autenticação renovada. Definir descarte de cache na saída sem apagar silenciosamente pendências; oferecer exportação.

P03 adiciona GETs de catálogo em `/api/workspaces/:workspaceId/parks`, `/parks/:parkId`, `/parks/:parkId/turbines` e `/parks/:parkId/turbines/:turbineId`. Todos exigem identidade completa e membership ativa; admin e técnico consultam. IDs externos ao workspace retornam não encontrado, sem expor existência. P04 adiciona POST/PATCH de parques e turbinas somente para admin. Campos extras são rejeitados. Código duplicado retorna `409 CATALOG_CODE_TAKEN`; revisão obsoleta retorna `409 REVISION_CONFLICT`. Retry de criação após timeout deve ser reconciliado por consulta, pois não há chave de idempotência. P05 implementa `/parques`; criação sugere código sequencial e pede confirmação, edição mantém UUID e relações. Transferência fica fora do escopo. Decisão de 26/10/2026: exclusão física somente sem referências atuais ou históricas; arquivamento com histórico fechado; issue aberta bloqueia arquivo de turbina e de seu parque; restauração de parque preserva estado individual das turbinas. A integração serializa lifecycle com criação/edição/atendimento de issue.

## Local-first e sincronização planejada

Execução detalhada na [slice 05 — Operação offline e sincronização](tasks/05-offline-sincronizacao/README.md), concluída em 28/10/2026 para o escopo browser/desktop. S01–S05 implementaram persistência IndexedDB, journal particionado, proxy Electric autorizado, réplica/checkpoints e envio idempotente. S06 concluiu acesso offline, revogação, exportação e resolução de conflito. S07 conectou Home, detalhe, catálogo, Histórico e Cloud à réplica/sender, mantendo histórico limitado e administração de catálogo/equipe online. S08 implementou app shell e atualizações seguras, validadas no desktop via Preview. S09 passou checks diretos, integrações auth/workspaces/parks/issues e cobertura automatizada de quota, retry pós-commit simulado, idempotência e isolamento; matriz funcional também foi confirmada em abas anônimas. Android/iPhone e HTTPS em aparelho foram transferidos para validação em produção por decisão do proprietário; não declarar suporte móvel antes desses testes.

O adaptador atual é IndexedDB pelo journal TanStack persistente, comprovado em harness e usado por S02–S05. A [etapa 07 do roadmap](<tasks/00 - roadmap/07-offline.md>) foi validada para browser/desktop até S09. Quota real/evicção e aparelhos Android/iPhone permanecem como follow-up de produção; a retomada reportada em Galaxy A12/Android 12/Brave e os ensaios desktop da S08 não certificam outras plataformas.

Gravação: UI -> armazenamento local + comando durável -> Fastify -> transação PostgreSQL contendo mudança, evento e trabalho de notificação -> confirmação -> réplica Electric -> reconciliação. Identificadores gerados no cliente, chave idempotente por comando, versão esperada por registro. Não apagar comando antes da confirmação; retries não duplicam issues, eventos ou notificações. Não interpretar atualização otimista em memória como persistência.

Leitura: Electric -> proxy Fastify autenticado -> coleção local. O servidor escolhe tabela, filtro de workspace e campos permitidos; nunca encaminhar table/where arbitrários. Segredo Electric nunca chega ao navegador.

Cache obrigatório: issues Pendentes/Em andamento, histórico dessas issues e cadastros necessários. Concluídas são consultadas online ou pelo cache já existente. A conclusão criada offline permanece local, com relato editável somente enquanto offline e antes do envio. Preservar registros e dependências com comandos pendentes, mesmo que saiam de um shape de issues abertas.

Conflitos: primeiro início de atendimento válido confirmado no servidor prevalece; segundo é sinalizado. Preservar texto local. Criador resolve conflitos de conteúdo; administrador intervém nos conflitos de status. Membro removido não envia novos comandos; pendências ficam exportáveis no aparelho.

PWA guarda app shell e dados para reabertura offline. Não prometer envio com app fechado no iPhone; envio garantido ao abrir/retomar com conexão. Background sync é melhoria onde suportado. Atualizações de service worker não podem perder a outbox.

## Adaptadores

Resend é SaaS, chamado pelo servidor com API key e remetente de domínio verificado. Sem servidor Resend na VPS. Desenvolvimento usa SMTP/Mailpit. Somente convites, códigos e recuperação de senha inicialmente; eventos de issue não geram e-mail. Plano gratuito requer limites de envio, tentativas, cooldown e erro recuperável.

Web Push usa VAPID; chave privada exclusiva do backend. N02–N04 implementam subscrições autorizadas, remoção de endpoints expirados, deduplicação, outbox transacional e worker do mesmo monólito, sem Redis. N05 conecta a campainha, a configuração explícita de push e os eventos do service worker; interface/PWA e entrega real foram validadas pelo proprietário. N06 concluiu a validação integrada em bancos descartáveis; instalação Android/iPhone, HTTPS de produção e quota/evicção permanecem no roadmap 11, sem declaração de suporte móvel. Um push por criação, sem agrupar; demais eventos somente campainha. A etapa 09 do roadmap registra evidências e limitações.

## Infraestrutura

Desenvolvimento: PostgreSQL com wal_level=logical, Electric e Mailpit no Compose; portas somente loopback. Node/pnpm executam apps no host. PostgreSQL dev usa credencial descartável explícita; não reutilizar em produção.

A configuração local usa `windops_app`, `windops_migrator` e `windops_replication`, com grants e publicação verificados em F02. O volume existente foi preservado e passou restart, restore e shape. A configuração equivalente no Neon continua pendente; não declarar produção pronta.

Produção: uma VPS Hostinger com Docker Compose e Caddy (frontend estático + proxy HTTPS), API e Electric internos. Caddy opera sem root em portas internas altas; host publica 80/443. Caddy não pode acessar diretamente endpoints Electric públicos porque não existe rota para isso. Usuários veem uma origem única. API com usuário node, filesystem somente leitura e privilégios reduzidos. Volumes Caddy armazenam certificados; Electric precisa de armazenamento persistente explícito.

PostgreSQL no Neon. Habilitar logical replication, usar conexão direta não pooler para Electric e migrações, configurar TLS com validação de certificado. Separar papel da aplicação, papel de migração e papel de replicação com permissões mínimas. Evitar scale-to-zero durante validação de latência e replicação. Monitorar retenção de WAL/slots. Configurar backup/restauração no Neon antes do uso real.

Resend, Google OAuth, VAPID, domínio, Neon, VPS e GitHub não foram provisionados. Não há homologação agora; arquivos de ambiente e GitHub Environment permitem adicionar depois.

## CI/CD e implantação inicial

CI: install frozen, lint/boundaries, typecheck, testes, build, Compose dev, migração duas vezes (idempotência), teste PostgreSQL/Electric, sintaxe bash e build de imagens. Actions fixadas por SHA; permissões contents:read. Não fornecer segredos de produção em PRs.

Deploy: workflow_run do CI bem-sucedido para push da main, mesma origem e DEPLOY_ENABLED=true. Build das imagens do commit aprovado e publicação GHCR. Concurrency impede deploy simultâneo. Tags por SHA; script no host resolve RepoDigests e grava referências por digest. Main deve exigir CI e revisão antes de merge.

Preparação manual da VPS:
1. Instalar Docker/Compose; configurar firewall, acesso administrativo por chave e atualizações do sistema.
2. Instalar compose.production.yml em /opt/windops/infra; arquivos e diretórios operacionais root-owned.
3. Copiar infra/.env.production.example para /opt/windops/infra/.env.production (0600), substituindo todos os exemplos. Configurar DATABASE_URL de runtime e MIGRATION_DATABASE_URL de owner separado.
4. Criar /etc/windops/deploy.conf root-owned contendo IMAGE_PREFIX=ghcr.io/owner/repository (minúsculo). Credencial GHCR read:packages somente no host, se imagens privadas.
5. Instalar scripts/deploy.sh como /usr/local/sbin/windops-deploy e o entrypoint SSH em caminho root-owned, ambos executáveis. Conta deploy sem docker group e sem shell administrativo livre.
6. Chave dedicada em authorized_keys com restrict e command apontando para deploy-ssh-entrypoint.sh. Sudoers permite somente /usr/local/sbin/windops-deploy; o script valida SHA e não aceita caminhos/comandos adicionais.
7. GitHub vars: DEPLOY_ENABLED (false inicialmente), DEPLOY_HOST, DEPLOY_USER. Secrets no Environment production: DEPLOY_SSH_KEY e DEPLOY_KNOWN_HOSTS, com chave do host verificada fora do pipeline (não ssh-keyscan confiado automaticamente).
8. Habilitar deploy somente após domínio/DNS, Neon, segredos e health checks. Alterações em scripts/Compose do host são revisadas e instaladas administrativamente; pipeline não sobrescreve scripts privilegiados.

Migrações rodam uma vez sob lock antes do rollout. Falha impede atualização. Health failure restaura imagens anteriores quando disponíveis; não reverte schema. Usar migrações expand/contract, preservar compatibilidade com imagem anterior, backup e procedimento explícito para alterações destrutivas. Primeira instalação sem imagem anterior exige correção manual em caso de falha. Registrar e monitorar disco, processos, entrega de e-mail/push e falhas de sync.

## Referências

- https://electric.ax/docs/sync/guides/auth
- https://electric.ax/docs/sync/guides/deployment
- https://tanstack.com/db/latest/docs/guides/mutations
- https://resend.com/docs/send-with-nodejs
- https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions

## Lifecycle de issues

Slice 06 concluída para browser/desktop. Reabertura, arquivo e reativação são comandos online autorizados por tenant, revisão e recibo idempotente. Eventos são append-only; arquivo remove a issue das consultas ativas sem apagar referências ou pendências locais. A projeção Electric autorizada e a reconciliação preservam os limites tenant e comandos locais pendentes. Não expor Electric diretamente nem aceitar filtros fornecidos pelo cliente. Integração PostgreSQL e testes offline de restart, conflito e replay passaram; dispositivos móveis, HTTPS em aparelho e quota/evicção física seguem sem validação de produção.

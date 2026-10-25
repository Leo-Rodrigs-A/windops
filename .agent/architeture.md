# Arquitetura — Wind Ops

## Objetivo e estágio

Registrar problemas durante visitas sem internet e compartilhar depois sem transcrição de memória. Piloto: 12 usuários, 8 parques com 8 turbinas inicialmente; quantidade não é fixa. Escopo: elevadores, um por turbina, somente texto. PWA mobile-first Android e iPhone. A base executável antecede a implementação visual guiada pelo Pencil/pen.dev e as funcionalidades.

## Referências visuais externas

O proprietário mantém layouts e design system em arquivos `.pen`, em uma pasta local do Windows fora do repositório. Esses arquivos servem somente como guia de desenvolvimento: não serão copiados para o projeto nem commitados, e não são dependências de execução, build ou CI. Versionar no projeto a implementação dos tokens, componentes e telas, além das decisões documentadas.

Pencil/pen.dev roda no Windows e Codex CLI no WSL2. Consultar os documentos pelo MCP do aplicativo Windows, confirmando o arquivo ativo antes de usá-lo. O caminho da pasta é local, informado pelo proprietário, e não deve ser fixado no código ou na infraestrutura. Alterar os designs somente mediante solicitação explícita. Se a referência estiver indisponível ou incompleta, registrar a limitação e solicitar o acesso ou esclarecimento necessário; não inventar layouts definitivos.

## Monólito modular

Monorepositório pnpm/TypeScript; um backend implantável. React/Vite + TanStack Router no frontend; Tailwind e ShadcnUI com design provisório. TanStack DB, adapter Electric e cliente Electric já declarados, ainda não ativados. Fastify + Zod Type Provider gera OpenAPI, apresentado pelo Scalar apenas fora de produção.

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

O plano executável começa em [F01 — Modelagem do banco](tasks/01-fundacao/01-modelagem-banco.md), que produzirá `.agent/database.md` antes de novas migrações. A [slice 01 — Fundação](tasks/01-fundacao/README.md) implementará apenas identidade, desafios de autenticação, workspaces e memberships; relações com os demais domínios serão modeladas sem criar antecipadamente todo o schema. O modelo ainda não foi produzido.

Drizzle controla schema e migrações SQL versionadas. Migração inicial cria workspaces com UUID e índice singleton. Remover esse limite exige migração futura; workspace_id continua obrigatório em todos os dados de negócio. Usuários são globais; memberships será N:N com cargo por workspace. Não haverá endpoint de criação pública de workspace no piloto.

Administrador vê membros do workspace e contas sem vínculo algum; não vê usuários exclusivos de outro workspace. Acesso a issues, histórico, convites, notificações e shapes sempre valida membership no servidor. Nunca confiar em workspace_id do cliente sem autorização. Cache e fila locais separados por conta e workspace.

A tabela de usuários e o schema completo de Better Auth serão introduzidos em [F03 — Schema e migrações](tasks/01-fundacao/03-schema-migracoes.md), gerados conforme a versão instalada e as decisões de F01. Preparar bootstrap manual documentado do primeiro workspace/administrador após essa migração; nunca transformar automaticamente o primeiro cadastro em administrador.

## API e autenticação

Contratos atuais: GET /api/health/live, GET /api/health/ready; erros estruturados em error {code,message,requestId}; /api/docs apenas local; GET /api/sync/:collection devolve 503 enquanto não implementado. Sem rota pública funcional de auth.

Better Auth é uma fundação não montada. Login Google e senha convergem por e-mail cuja titularidade foi verificada. Não vincular contas apenas porque um provedor declara um e-mail não verificado. Toda nova sessão online exige código por e-mail válido por 15 minutos; reenvio invalida o anterior. Nenhuma sessão com acesso de negócio antes de completar a segunda etapa, inclusive OAuth. Validar hooks disponíveis em F01 e testar esse fluxo em [F04 — Autenticação](tasks/01-fundacao/04-autenticacao.md), que detalha a etapa 03 do roadmap. As rotas permanecem desabilitadas até os testes críticos passarem.

Usar cookies HttpOnly/Secure em produção, origem confiável e proteção CSRF. Não copiar tokens de sessão para armazenamento JavaScript como estratégia offline. Metadados de acesso local e dados persistidos permitem reabrir o dispositivo já autenticado; sessão expirada permite trabalho local, mas upload exige autenticação renovada. Definir descarte de cache na saída sem apagar silenciosamente pendências; oferecer exportação.

## Local-first e sincronização planejada

Não basta instalar TanStack DB. A [etapa 07 do roadmap](tasks/roadmap/07-offline.md) deve integrar persistência durável das coleções e outbox de comandos antes de declarar offline pronto. Escolher a API suportada de persistência TanStack após prova em Safari/iPhone e Chrome/Android. Validar IndexedDB/SQLite conforme compatibilidade; documentar a decisão antes da implementação final.

Gravação: UI -> armazenamento local + comando durável -> Fastify -> transação PostgreSQL contendo mudança, evento e trabalho de notificação -> confirmação -> réplica Electric -> reconciliação. Identificadores gerados no cliente, chave idempotente por comando, versão esperada por registro. Não apagar comando antes da confirmação; retries não duplicam issues, eventos ou notificações. Não interpretar atualização otimista em memória como persistência.

Leitura: Electric -> proxy Fastify autenticado -> coleção local. O servidor escolhe tabela, filtro de workspace e campos permitidos; nunca encaminhar table/where arbitrários. Segredo Electric nunca chega ao navegador.

Cache obrigatório: issues Pendentes/Em andamento, histórico dessas issues e cadastros necessários. Concluídas são consultadas online ou pelo cache já existente. A conclusão criada offline permanece local, com relato editável somente enquanto offline e antes do envio. Preservar registros e dependências com comandos pendentes, mesmo que saiam de um shape de issues abertas.

Conflitos: primeiro início de atendimento válido confirmado no servidor prevalece; segundo é sinalizado. Preservar texto local. Criador resolve conflitos de conteúdo; administrador intervém nos conflitos de status. Membro removido não envia novos comandos; pendências ficam exportáveis no aparelho.

PWA guarda app shell e dados para reabertura offline. Não prometer envio com app fechado no iPhone; envio garantido ao abrir/retomar com conexão. Background sync é melhoria onde suportado. Atualizações de service worker não podem perder a outbox.

## Adaptadores

Resend é SaaS, chamado pelo servidor com API key e remetente de domínio verificado. Sem servidor Resend na VPS. Desenvolvimento usa SMTP/Mailpit. Somente convites, códigos e recuperação de senha inicialmente; eventos de issue não geram e-mail. Plano gratuito requer limites de envio, tentativas, cooldown e erro recuperável.

Web Push usa VAPID; chave privada exclusiva do backend. Implementar subscrições, autorização, remoção de endpoints expirados e deduplicação por evento na [etapa 09 do roadmap](tasks/roadmap/09-notifications.md). Um push por criação, sem agrupar; demais eventos somente campainha. Banco transacional terá outbox de entregas processada por worker do mesmo monólito, sem Redis inicialmente. Adaptador atual apenas transporta mensagens; não implementa esses fluxos.

## Infraestrutura

Desenvolvimento: PostgreSQL com wal_level=logical, Electric e Mailpit no Compose; portas somente loopback. Node/pnpm executam apps no host. PostgreSQL dev usa credencial descartável explícita; não reutilizar em produção.

A configuração dev atual compartilha a credencial administrativa entre os consumidores. [F02 — PostgreSQL seguro](tasks/01-fundacao/02-postgres-seguro.md) separará runtime, migração e replicação, com testes de grants e atualização sem apagar o volume existente. Não declarar privilégios mínimos implementados antes dessa validação.

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

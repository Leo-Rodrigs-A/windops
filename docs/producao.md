# Produção — Wind Ops

> Decisão D02 concluída em 02/11/2026: Hostinger KVM1 no Brasil, Ubuntu 24.04.5, 1 vCPU/4 GB + Neon Free. VPS ativa; Docker Engine 29.9.2/Compose 5.6.1. Proprietário confirmou pagamento de R$625 por 24 meses; renovação não informada. Sem despesas extras planejadas nem homologação permanente. KVM2 fica como possível upgrade após medir carga. DNS A `windops.devleonardo.com.br` criado na Vercel e resolução ao IP da VPS confirmada pelo proprietário; HTTPS ainda pendente. Política confirmada: API/Caddy ficam ligados e Electric pausa das 18h às 06h diariamente em `America/Sao_Paulo`; timer instalado e ensaio real Neon/Electric iniciado em 02/11.

[Voltar ao manual](../README.md#colocar-em-produção).

Este guia explica a primeira instalação e as atualizações. Há dois caminhos: **VPS com Docker Compose**, para a qual já existem artefatos no repositório, ou **PaaS Render**, que requer adaptações descritas abaixo. Hetzner Cloud fornece máquinas virtuais e entra no primeiro caminho. Veja a [criação de servidor na Hetzner](https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/).

**Estado em 02/11/2026:** D01–D04 concluídas. Neon de produção tem migrations, grants e publication aplicados/verificados; Electric 1.8.1 conectou ao PostgreSQL 18.6 e iniciou o pipeline, ainda sem shapes pois API/web não estão implantadas. CI e publicação GHCR passaram no SHA `11c41793c7734c46b63eaf9c7232b546d61a13fc`, mas o deploy foi ignorado por `DEPLOY_ENABLED=false`. Primeiro rollout segue pendente; HTTPS/ingress, restore, alertas e smoke real de autenticação/sync também não estão comprovados. O rollout inicial será candidato de validação, sem liberar o piloto.

## 1. Decidir destino e reunir acessos

Antes de contratar, escolha com o proprietário: provedor, região, orçamento, domínio, responsável operacional, retenção de backup, perda máxima aceitável de dados (RPO) e tempo máximo para recuperação (RTO). Sem homologação permanente por padrão; ensaios de restore/falha precisam de ambiente descartável isolado.

| Recurso        | Ação do proprietário                                                                                    | Preparação técnica                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VPS ou PaaS    | Criar conta/projeto, contratar plano e conceder acesso limitado.                                        | Conferir CPU/arquitetura, memória, disco, rede e suporte a serviços persistentes. O pipeline atual não configura build multiarch; conferir antes de escolher ARM. |
| Domínio/DNS    | Disponibilizar zona e hostname, por exemplo `app.suaempresa.com`.                                       | Apontar para o destino e configurar HTTPS.                                                                                                                        |
| PostgreSQL     | Criar projeto/banco separado do dev; Neon é a referência atual.                                         | Configurar migração, runtime, replicação, backup e restore.                                                                                                       |
| Resend         | Proprietário informou conta/domínio/remetente e chave já configurados na VPS.                           | Não reproduzir a chave; D08 ainda deve testar entrega real dos fluxos de e-mail.                                                                                  |
| Google OAuth   | Criar/ajustar cliente Web e público autorizado.                                                         | Configurar origem/callback e validar novo login/linking.                                                                                                          |
| GitHub/GHCR    | Nenhum package foi encontrado pelo proprietário; workflow atualizado para separar publicação de deploy. | Habilitar `PUBLISH_IMAGES` e validar package/pull; manter `DEPLOY_ENABLED=false` até liberar rollout.                                                             |
| Primeiro admin | Informar conta e nome do workspace explicitamente.                                                      | Fazer bootstrap após cadastro/verificação.                                                                                                                        |

Cadastre credenciais em secret stores ou arquivos protegidos do servidor. Compartilhe nos registros somente nomes das variáveis, IDs dos projetos, domínio e confirmação de acesso. Não cole chaves, URLs com senha, cookies ou tokens no chat, Git, imagens ou logs.

**Ponto de decisão D02/D04:** destino escolhido e acessos conferidos. Preços/limites devem ser consultados no momento da contratação; este manual não pressupõe plano gratuito suficiente.

## 2. Preparar banco, e-mail e identidade

### Banco

Use um banco exclusivo para produção. Prepare três papéis com credenciais distintas:

| Papel                 | Conexão                  | Responsabilidade                                                                                                                                    |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `windops_app`         | `DATABASE_URL`           | Dados de runtime, sem criar schema/roles nem replicar.                                                                                              |
| `windops_migrator`    | `MIGRATION_DATABASE_URL` | Migrações e ownership de objetos; não é credencial da API.                                                                                          |
| `windops_replication` | `ELECTRIC_DATABASE_URL`  | Neon exige membership administrativa para logical replication; privilégio amplo aceito como exceção, limitado operacionalmente ao Electric privado. |

No Neon, habilite logical replication no projeto e use conexão direta para migração e Electric, com TLS e certificado verificados. Confira as capacidades dos papéis no serviço, retenção de WAL/slots e política de suspensão do compute. Consulte o [guia de logical replication](https://neon.com/docs/guides/logical-replication-guide).

A ordem da **primeira instalação** é:

1. Administrador do banco cria roles e permissões iniciais de conexão/schema.
2. Migrador aplica as migrações versionadas.
3. Administrador reconcilia grants e publicação manual.
4. Aplique migrações e grants/publicação antes de iniciar Electric; API e web podem operar enquanto Electric estiver pausado.

A allowlist atual contém `workspaces`, `parks`, `turbines`, `issue_sync_rows` e `issue_sync_events`, com `REPLICA IDENTITY FULL`. Não publique tabelas brutas de identidade, memberships, `issues`, `issue_events` ou receipts. Projeções sanitizadas e proxy autenticado protegem os dados expostos no fluxo. Exceção Neon aceita pelo proprietário em 02/11/2026: a role que o Electric usa herda `neon_superuser`, portanto seus privilégios SQL não ficam limitados à publication e a credential pode ler/escrever dados amplos se comprometida. Armazenar a URL somente no env root-owned, passar apenas ao Electric, não publicar porta Electric, manter a publication manual e usar somente o proxy API autenticado para clientes. Não declarar a credencial Neon de Electric como least-privilege.

**Provisionamento Neon verificado em D05:** migrations repetidas sem alteração pendente; `infra/postgres/provision-neon.sql` foi executado como `windops_migrator`. A publication `electric_publication_default` contém exatamente as cinco tabelas autorizadas; as cinco estão em `REPLICA IDENTITY FULL`. `windops_app` tem SELECT e nenhuma escrita em `issue_sync_rows`, sem UPDATE/DELETE em `issue_sync_events`. O CI também cobre instalação vazia e grants. O [provisionador local](../infra/postgres/provision-roles.sh) é para PostgreSQL administrativo em Docker e não deve ser executado no Neon; o serviço `migrate` não cria roles nem reconcilia grants/publication. Ainda confirmar slot lógico, HTTPS/ingress e isolamento externo.

**Política de recuperação aceita em 02/11/2026:** manter backup automático semanal Hostinger e Neon Free, sem backup pago adicional. A Hostinger informa que mantém até dois backups semanais e que a restauração pode levar de 10 minutos a algumas horas ([documentação](https://www.hostinger.com/br/support/1583232-como-fazer-backup-ou-restaurar-um-servidor-vps-hostinger/)). Para o estado da VPS, planejar possível perda de até aproximadamente 7 dias desde o último backup semanal. O Neon Free informa janela de restauração instantânea de até 6 horas ([limites do plano Free](https://neon.com/blog/neon-free-plan-1-gb-per-project)); isso é a janela de histórico disponível, não garantia de RPO: corrupção identificada após a janela pode não ter ponto anterior recuperável. Meta operacional aceita: serviço recuperado em até 1 dia útil, ainda não ensaiada e sem SLA; o tempo do provedor pode ser de minutos a horas, além da validação/reimplantação. Backups da VPS e do Neon protegem recursos diferentes. Dados de trabalho ainda não sincronizados e existentes apenas no aparelho não entram nesses backups. Faça restore isolado antes do uso real; `db:restore-check` local não substitui o ensaio de produção.

### E-mail, Google e VAPID

No Resend, adicione o domínio, cadastre os registros DNS solicitados e aguarde verificação. Configure `EMAIL_FROM` com remetente desse domínio e `RESEND_API_KEY`. Consulte [domínios verificados](https://resend.com/docs/dashboard/domains/introduction). Teste cadastro, OTP, convite e recuperação com uma caixa real, incluindo entrega e validade dos links.

Para Google, a origem será `https://app.suaempresa.com` e o redirect URI será **`https://app.suaempresa.com/api/auth/callback/google`**. Configure o cliente Web, público/test users e estado de publicação apropriado. O redirect deve corresponder exatamente ao registrado, conforme [OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server). O aceite em localhost não valida esse callback novo.

Crie `BETTER_AUTH_SECRET` aleatório de pelo menos 32 caracteres e um `ELECTRIC_SECRET` próprio de produção. Gere um par VAPID separado do dev e mantenha `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` juntos. Guarde segredos sem imprimi-los. Rotação de chaves exige avaliar sessões/subscrições e não faz parte de atualizar uma imagem.

Antes de ligar `AUTH_ENABLED=true`, confirme suites de segundo passo e linking verificado aprovadas no release. Login Google não dispensa código por e-mail nem autorização por workspace.

## 3. Caminho VPS: preparar o servidor

Escolha Linux compatível com Docker, por exemplo Ubuntu 24.04. Entre com uma chave administrativa e instale Docker Engine/Compose conforme o [guia oficial](https://docs.docker.com/engine/install/ubuntu/). Configure atualizações e firewall do provedor/host: entrada web 80/443, SSH restrito aos administradores e nenhuma porta pública do Electric/banco. Verifique externamente o resultado; portas publicadas pelo Docker exigem atenção às regras de firewall.

Crie registro DNS A para o IPv4 da VPS; configure AAAA apenas se IPv6 estiver funcional. `APP_DOMAIN` recebe só o hostname e `APP_ORIGIN` recebe `https://` + hostname, sem caminho. Caddy gerencia TLS na VPS e mantém certificados nos volumes `caddy_data`/`caddy_config`.

O [Compose](../infra/compose.production.yml) sobe:

- `web`: Caddy, frontend estático e proxy `/api` para a API; única entrada pública da aplicação.
- `api`: backend e worker de notificações no mesmo processo.
- `electric`: serviço privado com volume `electric_data`.
- `migrate`: job pontual com a imagem da API e credencial do migrador.

PostgreSQL é externo; não há serviço de banco nesse Compose. Os containers da API/web têm usuário sem root e filesystem somente leitura, com exceções explícitas de volumes/tmpfs.

### Instalar arquivos e segredos

A partir de um checkout do commit revisado **no servidor**, execute como administrador:

```bash
sudo install -d -o root -g root -m 0755 /opt/windops/infra /etc/windops /usr/local/sbin
sudo install -o root -g root -m 0644 infra/compose.production.yml /opt/windops/infra/compose.production.yml
sudo install -o root -g root -m 0755 scripts/deploy.sh /usr/local/sbin/windops-deploy
sudo install -o root -g root -m 0755 scripts/deploy-ssh-entrypoint.sh /usr/local/sbin/windops-deploy-ssh
sudo install -o root -g root -m 0755 scripts/electric-window.sh /usr/local/sbin/windops-electric-window
sudo install -o root -g root -m 0644 infra/systemd/windops-electric-window.service /etc/systemd/system/
sudo install -o root -g root -m 0644 infra/systemd/windops-electric-window.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now windops-electric-window.timer
sudo systemctl start windops-electric-window.service
```

Na primeira instalação, crie o arquivo protegido a partir do exemplo. Não execute este passo sobre configuração já preenchida:

```bash
sudo install -o root -g root -m 0600 infra/.env.production.example /opt/windops/infra/.env.production
sudoedit /opt/windops/infra/.env.production
sudoedit /etc/windops/deploy.conf
```

Preencha `.env.production` com valores reais. Auth deve permanecer desabilitada até habilitar após as integrações obrigatórias de segundo passo e linking verificado; Google e Push são opcionais e só ficam ativos quando suas configurações completas forem fornecidas. O exemplo usa o domínio escolhido para o piloto, mas os valores devem corresponder ao DNS configurado. O inventário a seguir é a referência para configuração:

| Variável                                                 | Destino / valor esperado                                       |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| `APP_DOMAIN`, `APP_ORIGIN`                               | Caddy e API; hostname e origem HTTPS correspondentes.          |
| `DATABASE_URL`                                           | Somente API, papel runtime, TLS verificado.                    |
| `MIGRATION_DATABASE_URL`                                 | Somente job de migração, conexão direta.                       |
| `ELECTRIC_DATABASE_URL`                                  | Somente Electric, conexão direta de replicação.                |
| `ELECTRIC_SECRET`                                        | Mesmo valor privado na API e Electric.                         |
| `EMAIL_FROM`, `RESEND_API_KEY`                           | API; Compose fixa transporte `resend`.                         |
| `AUTH_ENABLED`, `BETTER_AUTH_SECRET`                     | `true` após gates de auth; segredo persistente do ambiente.    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`               | Par do cliente de produção, se Google habilitado.              |
| `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Trio para envio Web Push.                                      |
| `API_IMAGE`, `WEB_IMAGE`                                 | Arquivo de release separado, referências imutáveis de imagens. |

Compose fixa `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3000` e `ELECTRIC_URL=http://electric:3000` na API. Alterar essas chaves no `.env.production` sozinho não muda os valores fixos do Compose.

Em `/etc/windops/deploy.conf`, grave somente o prefixo do repositório em minúsculas, por exemplo `IMAGE_PREFIX=ghcr.io/sua-organizacao/windops`. Ele é carregado como shell por um script privilegiado: arquivo e diretório devem pertencer a root, sem escrita pelo usuário de deploy.

### Configurar acesso de deploy

Crie usuário dedicado, por exemplo `windops-deploy`, **sem grupo docker**. Instale sua chave pública no `authorized_keys` com `restrict,command="/usr/local/sbin/windops-deploy-ssh"`. Configure sudoers, revisado por `visudo`, permitindo a esse usuário somente `/usr/local/sbin/windops-deploy` como root, sem senha. O wrapper aceita apenas `deploy <SHA de 40 caracteres>`; o script privilegiado valida o argumento novamente. Não conceda shell/sudo amplo à chave do pipeline.

Confirme que o usuário não pode editar scripts, `/opt/windops`, configuração ou sudoers. Para GHCR privado, configure no contexto do usuário que faz pull (root no script atual) credencial somente de leitura. Não grave o token em uma linha de comando ou no checkout. Valide a fingerprint SSH por canal confiável antes de cadastrar known_hosts; não confie automaticamente em uma coleta de rede durante o deploy.

**Pendente D05/D06:** configurar e exercitar essas restrições no host escolhido. O pipeline não instala nem atualiza scripts privilegiados; alterações neles/Compose requerem instalação administrativa revisada.

## 4. Publicar a primeira versão na VPS

Primeiro rode o CI do commit candidato. As imagens precisam conter **esse mesmo SHA**, inclusive migrations. O workflow publica `ghcr.io/<owner>/<repo>-api:<SHA>` e `-web:<SHA>` quando a variável de repositório `PUBLISH_IMAGES=true`. O deploy continua condicionado separadamente a `DEPLOY_ENABLED=true` e só roda após publicação bem-sucedida. Para publicar sem rollout, mantenha `DEPLOY_ENABLED=false`.

Para uma primeira publicação controlada, uma máquina autorizada pode construir/enviar as imagens do checkout exato que passou no CI. Substitua prefixo/SHA, faça login no GHCR pelo mecanismo seguro escolhido e confira a arquitetura de CPU:

```bash
# Checkout limpo do SHA aprovado; não inclua mudanças locais no build.
RELEASE_SHA='<SHA_APROVADO_DE_40_CARACTERES>'
IMAGE_PREFIX='ghcr.io/sua-organizacao/windops'
docker build -f infra/Dockerfile.api -t "$IMAGE_PREFIX-api:$RELEASE_SHA" .
docker build -f infra/Dockerfile.web -t "$IMAGE_PREFIX-web:$RELEASE_SHA" .
docker push "$IMAGE_PREFIX-api:$RELEASE_SHA"
docker push "$IMAGE_PREFIX-web:$RELEASE_SHA"
```

D06 deve validar publicação controlada e automação; estes comandos usam os Dockerfiles existentes, mas não foram executados contra GHCR na D01.

No host, a instalação inicial precisa aplicar migrações **antes** de iniciar Electric se a publicação ainda não existir. Um administrador baixa as imagens, obtém os digests e cria `/opt/windops/.release.bootstrap.env` (0600), com `API_IMAGE=ghcr.io/...-api@sha256:...` e `WEB_IMAGE=ghcr.io/...-web@sha256:...`. Use o digest retornado pelo registry/pull, não um hash inventado. Com roles iniciais já criados:

```bash
# Shell administrativo, em /opt/windops; arquivo de ambiente já protegido.
docker compose --env-file infra/.env.production --env-file .release.bootstrap.env \
  -f infra/compose.production.yml config --quiet
docker compose --env-file infra/.env.production --env-file .release.bootstrap.env \
  -f infra/compose.production.yml run --rm --no-deps migrate
```

Grants e publication já foram reconciliados e conferidos no Neon. O deploy migra novamente (idempotente), sobe API/web com health checks e grava `.release.env`; então reconcilia Electric pela janela. Como o rollout inicial será executado após as 18h de São Paulo, a reconciliação deve parar o Electric. A partir desse release, o helper systemd passa a aplicar a janela normalmente no boot e às 06h/18h. O administrador executa:

```bash
sudo /usr/local/sbin/windops-deploy 'SHA_APROVADO_DE_40_CARACTERES'
```

O script faz pull, fixa digests, valida Compose, roda migration sob lock de deploy e sobe API/web com health checks de liveness. Ao ter sucesso grava `.release.env`, guardando o release anterior quando existir, e reconcilia Electric conforme a janela. Migração repetida aplica apenas mudanças ainda não registradas. O timer reconcilia no boot e às 06h/18h; não remove o volume Electric ao parar o container. Antes do primeiro release (`.release.env`), o helper encerra sem ação; o deploy inicial grava o arquivo e reconcilia o estado ao final. O primeiro deploy é um candidato para smoke/validação, não a liberação do piloto; restore/alertas de D07 e ensaios de D08–D10 continuam pendentes.

Verifique o domínio:

```bash
curl --fail https://app.suaempresa.com/api/health/live
curl --fail https://app.suaempresa.com/api/health/ready
```

Faça login real, teste links/OTP/Google e confirme cookies/origem, sync autorizado e ausência de acesso público ao Electric. `/api/docs` não é exposto em produção. Health verde não substitui esse percurso funcional.

### Primeiro administrador

Cadastre/verifique a conta indicada pelo proprietário no domínio final. Consulte seu UUID pela conexão administrativa segura do banco, usando filtro explícito por e-mail. Execute [bootstrap-workspace.sql](../apps/api/scripts/bootstrap-workspace.sql) com `psql`, passando `workspace_id`, `workspace_name` e `user_id`, como no [setup local](../README.md#5-criar-o-primeiro-workspace-e-administrador). Em produção, use configuração de conexão protegida do `psql` (service/passfile); não cole a URL com senha no comando ou histórico.

Não há `docker compose exec postgres` no Compose de produção. Não copie o banco dev nem promova o primeiro usuário encontrado. Reutilize os mesmos UUIDs em retry. Convide uma conta técnica, valide permissões e cadastre somente o inventário aprovado.

## 5. Alternativa PaaS: Render

Este é um roteiro **a adaptar e validar em D02/D03/D05/D06**, não um template pronto. Render suporta [imagens Docker ou build de Dockerfile](https://render.com/docs/docker). A topologia proposta mantém uma origem pública, preservando os contratos atuais do app.

1. Crie projeto/ambiente e escolha região/plano. Mantenha os serviços relacionados na mesma rede privada. Use banco com logical replication validada; Neon externo evita presumir essa capacidade do banco do PaaS.
2. Crie **Private Service Electric** com a imagem fixada do Compose. Cadastre `DATABASE_URL` de replicação, `ELECTRIC_SECRET`, `ELECTRIC_MANUAL_TABLE_PUBLISHING=true`, `ELECTRIC_LONG_POLL_TIMEOUT=10000` e `ELECTRIC_STORAGE_DIR=/var/lib/electric/persistent`. Monte disco em `/var/lib/electric`. Prepare roles/schema/publicação antes de iniciá-lo.
3. Crie **Private Service API**, Dockerfile `infra/Dockerfile.api`, contexto na raiz. Use `HOST=0.0.0.0`, porta 3000, configuração de produção e `ELECTRIC_URL` com o hostname privado real. Não use o nome Compose `electric` sem resolvê-lo no ambiente. O worker de notificações já integra a API; não crie uma segunda cópia avulsa.
4. Crie **Web Service** para Caddy/frontend usando `infra/Dockerfile.web`, contexto na raiz. **Antes de implantar, D03 deve fornecer uma variante de Caddy**: ouvir HTTP em `0.0.0.0` na porta do serviço (por exemplo 10000), receber TLS terminado pelo Render, encaminhar `/api` ao hostname privado da API e manter fallback SPA/cache/headers. O Caddyfile atual gerencia TLS e aponta para `api:3000`, portanto não funciona como configuração final desse PaaS sem adaptação. Health check precisa testar a porta/rota realmente exposta, não apenas a porta auxiliar 8081.
5. Cadastre domínio personalizado e DNS indicados pelo painel, aguarde TLS e ajuste `APP_ORIGIN`, cliente Google e remetente. A API precisa respeitar origem/cookies seguros através desse proxy; D03/D08 validam isso. [Web Services](https://render.com/docs/web-services) documenta porta, domínio e entrada HTTP.
6. Execute uma única migração por release com a imagem API e `node dist/platform/database/migrate.js`, em job/pre-deploy suportado pelo plano, com `MIGRATION_DATABASE_URL` exclusiva. Reconcilie grants/publicação. Não replique a credencial de migrador em todos os runtimes nem execute migrations concorrentes em cada réplica.
7. Adapte D06 para publicar/atualizar o mesmo SHA aprovado pelo CI e ordenar migração → runtime → smoke. Desative deploy automático irrestrito por push enquanto esse gate não estiver conectado. O workflow SSH deste repositório é para VPS; não implanta serviços Render diretamente.
8. Faça bootstrap, testes reais, restore e atualização com fila offline conforme os passos deste guia. Mantenha a versão anterior e um procedimento de retorno compatível com o schema.

[Private Services](https://render.com/docs/private-services) não ficam acessíveis pela internet, sendo apropriados para API interna e Electric. Preserve essa separação; publicar Electric e esconder sua URL na interface não é controle de acesso.

[Discos persistentes](https://render.com/docs/disks) exigem plano compatível, pertencem a uma instância e provocam interrupção durante redeploy. O filesystem restante é efêmero. Não conte com deploy sem indisponibilidade para Electric nem use snapshot de disco como substituto de backup lógico do PostgreSQL. Dimensionamento e impacto da pausa serão medidos antes de liberar o piloto.

## 6. Atualizar, acompanhar e recuperar

### Entrega automática na VPS

Cadastre no GitHub:

| Local                    | Configuração                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variável do repositório  | `PUBLISH_IMAGES=false` inicialmente; habilita publicação GHCR. `DEPLOY_ENABLED=false` durante preparação impede rollout. Ambas são lidas fora do Environment. |
| Environment `production` | Vars `DEPLOY_HOST`, `DEPLOY_USER`; secrets `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`.                                                                            |
| Repositório/Environment  | Proteção da main, checks exigidos e política de acesso/liberação disponíveis no plano escolhido.                                                              |

`PUBLISH_IMAGES=true` habilita a publicação no [workflow](../.github/workflows/deploy.yml), após CI bem-sucedido em push da `main` na mesma origem. O job usa `GITHUB_TOKEN` com `packages: write` para publicar imagens imutáveis por SHA e cria os packages GHCR no primeiro push. `DEPLOY_ENABLED=true` é um controle separado; o deploy exige publicação bem-sucedida e usa Environment `production`. Para preparar o primeiro rollout, mantenha `DEPLOY_ENABLED=false` até a configuração do host e dos secrets conferida; então mude a variável do repositório para `true` antes de mergear o PR que gerará o novo push/CI em `main`. Alterar a variável não repete um workflow anterior: é necessário novo CI de push na `main`; após CI verde, a publicação dispara o deploy. O [CI versionado](../.github/workflows/ci.yml) cobre integrações auth, workspaces, parks, issues e Electric. Mesmo após o primeiro deploy, D06/D07 ainda devem registrar os ensaios de falha, recuperação e alertas antes de liberar o piloto.

Para atualizar: submeta mudança revisada → aguarde CI/publicação/deploy → confira SHA/digests e health → faça smoke de login/sync → acompanhe erros, notificações e fila. Alterações em schema devem manter a imagem anterior compatível; clientes/PWA antigos podem continuar ativos com comandos pendentes.

### Diagnóstico e retorno

Em shell administrativo no host:

```bash
cd /opt/windops
docker compose --env-file infra/.env.production --env-file .release.env \
  -f infra/compose.production.yml ps
docker compose --env-file infra/.env.production --env-file .release.env \
  -f infra/compose.production.yml logs --tail=80 api electric web
```

Revise logs localmente e não compartilhe conteúdo sensível. Durante falha da primeira instalação, `.release.env` pode ainda não existir: use o arquivo bootstrap preparado. Não use `compose config` sem `--quiet` em evidências, pois a expansão pode mostrar segredos.

Falha de migração interrompe rollout. Falha de health tenta retornar às imagens de `.release.env`, quando esse release existe. **O script não reverte schema.** Se não houver versão anterior, corrija a causa e reaplique o release. D06/D07 devem ensaiar esses cenários.

Para retorno manual de um release que havia sido aceito, pause novos deploys, confira compatibilidade do banco e validade de `.release.previous.env`, guarde a identificação do release atual e suba as imagens anteriores:

```bash
docker compose --env-file infra/.env.production --env-file .release.previous.env \
  -f infra/compose.production.yml up -d --wait --wait-timeout 180
```

Depois de validar health/fluxos, reconcilie o registro `.release.env` com as imagens efetivamente ativas; não deixe o próximo deploy considerar como saudável a versão que acabou de ser retirada. D07 formalizará o procedimento e suas evidências. Não use down com remoção de volumes como rollback.

### Backup, alertas e liberação

Antes de receber dados operacionais, D07 deve provar restauração isolada do schema atual e dados de identidade, equipe, catálogo, issues/eventos, receipts e outbox; medir recuperação e validar resnapshot/reconciliação após restore. Um backup do servidor não inclui comandos guardados somente no dispositivo.

Configure alerta recebido pelo responsável para indisponibilidade externa/ready, certificados, disco/memória, WAL/slots, falhas de sync, entrega de e-mail/push e backups. Defina retenção e rotação de logs. Metas de carregamento <2s e disponibilidade 99,5% precisam de cenário/janela de medição; não são garantias já comprovadas.

A versão candidata fica restrita aos validadores até D09/D10: teste admin/técnico, Android/iPhone, instalação PWA, modo avião, restart físico, reautenticação, conflito, revogação/exportação e atualização com pendências. Registre plataforma/versão e resultado real. O proprietário confirma a abertura do piloto após revisar as evidências.

## Acompanhamento deste roteiro

A [slice 11](../.agent/tasks/11-producao/README.md) separa execução e responsabilidades: D02 decisão; D03 artefatos; D04 contas; D05 infraestrutura; D06 entrega; D07 recuperação; D08 candidato; D09 aparelhos; D10 liberação. Cada uma deve atualizar este guia com comandos/resultados efetivamente validados. Fontes externas acima foram consultadas em 31/10/2026; reconfira planos e capacidades ao escolher o destino.

## Janela desejada para VPS + Neon Free

O proprietário confirmou operação diária do Electric das 06h às 18h e pausa das 18h às 06h em `America/Sao_Paulo`, mantendo API/Caddy em execução. A API pode acordar Neon sob demanda e terá latência de cold-start; a réplica local para de receber atualizações quando Electric está pausado. O worker de push não faz polling: outbox fica persistida e tenta novamente após atividade posterior da API. Healthchecks usam liveness sem banco; readiness consulta PostgreSQL apenas quando chamada explicitamente. O timer systemd aplica a janela no boot e nos dois limites horários. Instalação e confirmação de scale-to-zero/cold-start na VPS ainda são pendentes; qualquer cálculo de CU-horas depende do uso real e despertares.

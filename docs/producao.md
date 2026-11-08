# Produção — Wind Ops

> Decisão D02 concluída em 02/11/2026: Hostinger KVM1 no Brasil, Ubuntu 24.04.5, 1 vCPU/4 GB + Neon Free. VPS ativa; Docker Engine 29.9.2/Compose 5.6.1. Proprietário confirmou pagamento de R$625 por 24 meses; renovação não informada. Sem despesas extras planejadas nem homologação permanente. KVM2 fica como possível upgrade após medir carga. DNS A `windops.devleonardo.com.br` criado na Vercel e resolução ao IP da VPS confirmada pelo proprietário. Primeiro deploy concluído em 02/11 America/Sao_Paulo: API/web `healthy`, HTTPS e endpoints live/ready verificados; SHA Git/digests/runs ativos estão rastreados em D06. Em 08/11 o proprietário confirmou bootstrap e fluxos funcionais em Android, iPhone e PWA desktop; medições específicas não foram registradas. O proprietário esclareceu que não houve restore de backup: D05 teve reboot da VPS e D06 rollback das imagens. Testes de restore Hostinger/Neon foram retirados do escopo. D05 encerrada em 08/11 após verificar updates, Neon logical slot, pausa/retomada do Electric e restart/reboot da VPS. Política: API/Caddy ficam ligados e Electric pausa das 18h às 06h diariamente em `America/Sao_Paulo`. Compute Neon zerou na pausa por quatro dias; timer iniciou Electric às 06h (09:00 no relógio do host) e slot ficou ativo depois, inclusive após reboot.

[Voltar ao manual](../README.md#colocar-em-produção).

Este guia explica a primeira instalação e as atualizações. Há dois caminhos: **VPS com Docker Compose**, para a qual já existem artefatos no repositório, ou **PaaS Render**, que requer adaptações descritas abaixo. Hetzner Cloud fornece máquinas virtuais e entra no primeiro caminho. Veja a [criação de servidor na Hetzner](https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/).

**Estado atualizado em 08/11/2026:** D01–D09 concluídas; D10 permanece aberta até o aceite explícito do piloto. PR #13 foi mergeada e o proprietário confirmou o deploy; live/ready e a página principal responderam HTTP 200. Os digests ativos foram verificados por labels OCI: API `sha256:3fce2ba00e2d76485f590de3145c50168d462fe62b7cf67a7c535ed18a6a9cd4`, web `sha256:ae6f1bcef7ad153d0e234345d1f5e4c9403c6f507cb1f812427d7bbef8818f5d`; ambos apontam ao SHA `431ca3dabd61a02bc93859f10575af777c48f8df`, [CI run](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42497042208) e [deploy run](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42497240518). Os ensaios de pull falho antes do rollout e rollback de imagem após health failure passaram. Com uma issue pendente em PWA offline durante novo rollback, o proprietário confirmou que a fila zerou e a issue sincronizou uma única vez; live/ready/root responderam HTTP 200 após recuperação. Testes externos confirmaram 80/443 acessíveis e portas internas 3000/8080/8081/8443 inacessíveis. D05 comprovou updates automáticos sem reboot, escopo de exposição SSH observado, pausa e retomada do Neon/Electric e persistência dos volumes após reboot. D07 documentou backups, runbooks e cobertura de monitoramento. O proprietário confirmou que os fluxos funcionais D08/D09 (bootstrap, autenticação, autorização, e-mail/push, sync e uso em campo) funcionaram em Android, iPhone e PWA desktop. Simulação de quota/evicção e p95 numérico foram retiradas do escopo, sem alegar validação. Nenhum restore Hostinger/Neon foi executado; a liberação do piloto continua em D10.

## 1. Decidir destino e reunir acessos

Antes de contratar, escolha com o proprietário: provedor, região, orçamento, domínio, responsável operacional, retenção de backup, perda máxima aceitável de dados (RPO) e tempo máximo para recuperação (RTO). Sem homologação permanente por padrão; ensaios de restore/falha precisam de ambiente descartável isolado.

| Recurso        | Ação do proprietário                                                                                    | Preparação técnica                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VPS ou PaaS    | Criar conta/projeto, contratar plano e conceder acesso limitado.                                        | Conferir CPU/arquitetura, memória, disco, rede e suporte a serviços persistentes. O pipeline atual não configura build multiarch; conferir antes de escolher ARM. |
| Domínio/DNS    | Disponibilizar zona e hostname, por exemplo `app.suaempresa.com`.                                       | Apontar para o destino e configurar HTTPS.                                                                                                                        |
| PostgreSQL     | Criar projeto/banco separado do dev; Neon é a referência atual.                                         | Configurar migração, runtime, replicação, backup e restore.                                                                                                       |
| Resend         | Conta/domínio/remetente configurados pelo proprietário.                                                 | Proprietário confirmou entrega de e-mail transacional/OTP/convite funcionando em produção; não reproduzir a chave.                                                |
| Google OAuth   | Cliente Web e público autorizado configurados para o domínio real.                                      | Proprietário confirmou callback/login/linking e segunda etapa por e-mail funcionando em produção.                                                                 |
| GitHub/GHCR    | Nenhum package foi encontrado pelo proprietário; workflow atualizado para separar publicação de deploy. | Habilitar `PUBLISH_IMAGES` e validar package/pull; manter `DEPLOY_ENABLED=false` até liberar rollout.                                                             |
| Primeiro admin | Conta escolhida e workspace `Elevadores` explicitados pelo proprietário.                                | Proprietário confirmou cadastro/verificação e bootstrap em produção; identificadores pessoais ficam fora deste repositório.                                       |

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

**Política de recuperação aceita em 02/11/2026:** manter backup automático semanal Hostinger e usar a janela de histórico/PITR do Neon Free (até 6 horas), sem backup pago adicional nem rotina semanal separada do Neon. A Hostinger descreve dois backups semanais retidos e avisa que restaurar sobrescreve todo o VPS, não pode ser cancelado e deixa a VM bloqueada durante a operação; também informa que backups VPS não são criptografados em repouso ([guia de backup/restauração VPS](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/)). A política foi confirmada pelo proprietário; D07 ainda deve conferir backups efetivamente disponíveis e retenção atual. Para o estado da VPS, planejar possível perda de até aproximadamente 7 dias desde o último backup semanal. O Neon Free informa janela de restauração instantânea de até 6 horas ([limites do plano Free](https://neon.com/blog/neon-free-plan-1-gb-per-project)); isso é a janela de histórico disponível, não garantia de RPO: corrupção identificada após a janela pode não ter ponto anterior recuperável. Meta operacional aceita: serviço recuperado em até 1 dia útil, sem SLA. Os ensaios em D05/D06 foram reboot da VPS e rollback das imagens, não restore de backup Hostinger/Neon. Backups da VPS e o histórico/PITR do Neon protegem recursos diferentes. Dados de trabalho ainda não sincronizados e existentes apenas no aparelho não entram nesses backups. O Hostinger restore é da VM inteira; nunca iniciá-lo como teste nem sem janela/aprovação do proprietário. `db:restore-check` local não substitui validação dos backups de produção.

Capturas e confirmação do proprietário em 08/11/2026: hPanel mostra backup automático semanal ativo e exatamente um ponto disponível de 4,15 GB, Brasil, Ubuntu 24.04 LTS, criado em 06:20, com estimativa de 30 min para restore. A documentação Hostinger informa até dois pontos semanais retidos; a diferença entre a política documentada e o único ponto atualmente disponível segue para esclarecimento. O console Neon mostra janela de histórico/PITR de 6 horas na branch `production` e um timestamp de 08/11/2026 14:23 America/Sao_Paulo selecionado. Não foi usado “Preview data” nem “Restore”; a captura não comprova conteúdo recuperável nem uma restauração. Nenhum dado foi alterado.

### E-mail, Google e VAPID

No Resend, adicione o domínio, cadastre os registros DNS solicitados e aguarde verificação. Configure `EMAIL_FROM` com remetente desse domínio e `RESEND_API_KEY`. Consulte [domínios verificados](https://resend.com/docs/dashboard/domains/introduction). Teste cadastro, OTP, convite e recuperação com uma caixa real, incluindo entrega e validade dos links.

Para Google, a origem será `https://app.suaempresa.com` e o redirect URI será **`https://app.suaempresa.com/api/auth/callback/google`**. Configure o cliente Web, público/test users e estado de publicação apropriado. O redirect deve corresponder exatamente ao registrado, conforme [OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server). O aceite em localhost não valida esse callback novo.

Crie `BETTER_AUTH_SECRET` aleatório de pelo menos 32 caracteres e um `ELECTRIC_SECRET` próprio de produção. Gere um par VAPID separado do dev e mantenha `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` juntos. Guarde segredos sem imprimi-los. Rotação de chaves exige avaliar sessões/subscrições e não faz parte de atualizar uma imagem.

Antes de ligar `AUTH_ENABLED=true`, confirme suites de segundo passo e linking verificado aprovadas no release. Login Google não dispensa código por e-mail nem autorização por workspace.

## 3. Caminho VPS: preparar o servidor

Escolha Linux compatível com Docker, por exemplo Ubuntu 24.04. Entre com uma chave administrativa e instale Docker Engine/Compose conforme o [guia oficial](https://docs.docker.com/engine/install/ubuntu/). Configure atualizações e firewall do provedor/host: entrada web 80/443, SSH restrito aos administradores e nenhuma porta pública do Electric/banco. Verifique externamente o resultado; portas publicadas pelo Docker exigem atenção às regras de firewall.

**Estado observado na VPS em 08/11/2026:** a tela Firewall da Hostinger oferece criar um firewall e o painel indica zero regras; não foi observado grupo ativo/vinculado. UFW também está inativo. TCP/22 foi alcançável no teste externo da rede do proprietário, portanto não há filtro de origem documentado e qualquer origem com rota à VPS pode tentar SSH. A autenticação segue chave-only, sem root/senha; `windops-deploy` é restrito ao wrapper. Criar regras explícitas no provedor continua recomendado para bloquear portas não usadas. Um grupo Hostinger ativo sem regras bloqueia todo o tráfego, então adicione e confira permissões de 22, 80 e 443 antes de associá-lo. Consulte o [guia oficial do firewall gerenciado](https://www.hostinger.com/support/8172641-how-to-use-a-managed-vps-firewall-at-hostinger/).

Política escolhida para a VPS em 08/11/2026: aplicar atualizações de segurança do Ubuntu automaticamente, sem reboot automático. Revise os logs de `unattended-upgrades` e os serviços que aguardam restart; agende reinícios necessários em janela combinada. Após reboot, confirme acesso SSH por chave, `docker compose ps`, health da API/web, HTTPS e execução do timer `windops-electric-window`. Antes de encerrar D05, confira no host se `unattended-upgrades` e os timers APT estão realmente habilitados; a política documentada, sozinha, não comprova configuração efetiva.

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

O script versionado faz pull, fixa digests, valida Compose, roda migration sob lock de deploy e sobe API/web com health checks de liveness. Ao ter sucesso grava `.release.env` com `RELEASE_SHA` e os digests, guardando o release anterior quando existir, e reconcilia Electric conforme a janela. O proprietário atualizou a cópia root-owned na VPS; `release-info` confirmou o campo `RELEASE_SHA` no arquivo ativo. As imagens também carregam labels OCI com SHA e URLs dos runs CI/deploy, que permitem rastrear digests sem ler configuração de runtime. Migração repetida aplica apenas mudanças ainda não registradas. O timer reconcilia no boot e às 06h/18h; não remove o volume Electric ao parar o container. Antes do primeiro release (`.release.env`), o helper encerra sem ação; o deploy inicial grava o arquivo e reconcilia o estado ao final. D08/D09 registram o deploy e os testes funcionais de produção relatados pelo proprietário; a liberação do piloto segue em D10. A política de backups, runbooks e cobertura de monitoramento D07 está documentada.

Verifique o domínio:

```bash
curl --fail https://app.suaempresa.com/api/health/live
curl --fail https://app.suaempresa.com/api/health/ready
```

O proprietário confirmou em 08/11/2026 que login, links/OTP/Google, cookies/origem, sync autorizado e isolamento do Electric foram testados e funcionaram em produção no Android, iPhone e PWA desktop. `/api/docs` não é exposto em produção. Health verde, isoladamente, não substitui esse percurso funcional.

### Primeiro administrador

O proprietário confirmou o cadastro/verificação da conta indicada e o bootstrap do workspace `Elevadores` em produção. Para novos ambientes, consulte o UUID da conta explicitamente indicada pela conexão administrativa segura do banco, usando filtro explícito por e-mail. Execute [bootstrap-workspace.sql](../apps/api/scripts/bootstrap-workspace.sql) com `psql`, passando `workspace_id`, `workspace_name` e `user_id`, como no [setup local](../README.md#5-criar-o-primeiro-workspace-e-administrador). Em produção, use configuração de conexão protegida do `psql` (service/passfile); não cole a URL com senha no comando ou histórico.

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

`PUBLISH_IMAGES=true` habilita a publicação no [workflow](../.github/workflows/deploy.yml), após CI bem-sucedido em push da `main` na mesma origem. O job usa `GITHUB_TOKEN` com `packages: write` para publicar imagens imutáveis por SHA e cria os packages GHCR no primeiro push. `DEPLOY_ENABLED=true` é um controle separado; o deploy exige publicação bem-sucedida e usa Environment `production`. Para preparar o primeiro rollout, mantenha `DEPLOY_ENABLED=false` até a configuração do host e dos secrets conferida; então mude a variável do repositório para `true` antes de mergear o PR que gerará o novo push/CI em `main`. Alterar a variável não repete um workflow anterior: é necessário novo CI de push na `main`; após CI verde, a publicação dispara o deploy. O [CI versionado](../.github/workflows/ci.yml) cobre integrações auth, workspaces, parks, issues e Electric. D06 já ensaiou falha de pull antes do rollout e rollback após health failure; D07 ainda precisa provar restore de backup, monitoramento e alertas antes da liberação do piloto.

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

Falha de migração interrompe rollout. Falha de health tenta retornar às imagens de `.release.env`, quando esse release existe. **O script não reverte schema.** Se não houver versão anterior, corrija a causa e reaplique o release. D06 já ensaiou a falha de pull e rollback de imagem e registrou o caminho para o primeiro release. Por decisão do proprietário, D07 não exige ensaio de compatibilidade de schema nem recuperação pós-restore; a compatibilidade continua não validada.

Para retorno manual de um release que havia sido aceito, pause novos deploys, confira compatibilidade do banco e validade de `.release.previous.env`, guarde a identificação do release atual e suba as imagens anteriores:

```bash
docker compose --env-file infra/.env.production --env-file .release.previous.env \
  -f infra/compose.production.yml up -d --wait --wait-timeout 180
```

Depois de validar health/fluxos, reconcilie o registro `.release.env` com as imagens efetivamente ativas; não deixe o próximo deploy considerar como saudável a versão que acabou de ser retirada. O rollback de imagem e a fila PWA foram ensaiados em D06; os runbooks de recuperação estão documentados em D07. Teste PITR Neon e rollback compatível com schema foram retirados do escopo D07 pelo proprietário; não foram validados. Não use down com remoção de volumes como rollback.

### Backup, alertas e liberação

O proprietário esclareceu que não houve restore de backup Hostinger durante D06: os ensaios foram reboot da VPS em D05 e rollback das imagens de release em D06. Nenhum restore de produção foi feito. Por decisão do proprietário, o teste de recuperação Neon foi retirado do escopo de D07; a janela de PITR é apenas registrada, sem branch de restore. D07 confere os pontos Hostinger e configura alertas externos. Backup VPS não volta o Neon; backup do servidor também não inclui comandos guardados somente no dispositivo.

#### Runbook de indisponibilidade e restauração

1. Registre hora UTC e horário de São Paulo, SHA/digests conhecidos e sintomas. Verifique externamente `/`, `/api/health/live` e, uma vez durante o diagnóstico, `/api/health/ready`; readiness executa consulta ao Neon e sondagem frequente poderia impedir scale-to-zero. Preserve o IndexedDB e a fila local dos aparelhos; não peça logout, limpeza de dados ou reinstalação enquanto houver pendências.
2. Se o site falha, consulte o run CI/deploy e `release-info`. O rollback automático de D06 já demonstrou retorno às imagens saudáveis; não rode `docker compose down -v` e não altere `.release.env` sem confirmar quais imagens estão ativas. Logs devem ser revisados localmente e sanitizados antes de compartilhar.
3. **Falha total do VPS:** o restore Hostinger sobrescreve a VM inteira, é irreversível e pode interromper a disponibilidade por minutos a horas. Antes de iniciar, proprietário identifica o backup e horário, registra o estado/release atual e combina janela de indisponibilidade. No hPanel: VPS → Manage → Backups & Monitoring → Snapshots & Backups → escolher data → Restore; acompanhar em Latest actions. Depois, conferir fingerprint SSH conforme canal conhecido, Docker/timer, containers e volumes, `release-info`, domínio/TLS, live/ready/root e slot lógico. A restauração não volta Neon nem DNS/secret stores externos; reconcile cada recurso. A recuperação disponível via [API Hostinger de restore](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/) tem a mesma natureza destrutiva, portanto não será disparada como ensaio.
4. **Recuperação Neon (referência para incidente, fora do aceite D07):** o proprietário retirou o ensaio de recuperação do escopo. A janela de seis horas vista no console não foi testada; não toque na branch conectada para validar recuperação. Em uma emergência real, prepare um plano de recuperação e proteção dos dados antes de qualquer alteração de branch/endpoints; PITR pode interromper conexões. Esta seção é orientação de incidente, não autorização para restaurar nem requisito de fechamento.
5. Após qualquer restore, verifique migrations e papéis, memberships, workspace/catálogo, issues/eventos, receipts/outbox, estado do slot/publication e reconciliação de cliente. Compare horário do ponto recuperado com último dado confirmado; nunca afirme RPO/RTO sem esses registros.

Procedimentos de VPS estão alinhados ao [guia oficial Hostinger](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/); restauração Neon deve ser feita por branch/PITR isolado, conforme [documentação da função de branch restore](https://neon.com/blog/announcing-point-in-time-restore).

#### Runbook para falha de migration, disco e credenciais

- **Migration/health failure:** interrompa novos deploys; anote SHA e estágio; verifique logs sem divulgar valores. Migration falha interrompe rollout e a automação só reverte imagem, nunca schema. Não reaplique migration às cegas. Inspecione o registro de migration e compare o schema; prefira correção forward testada em branch Neon isolada. Se precisar recuperar dados, siga o procedimento de branch/restore acima e coordene resnapshot Electric e fila offline.
- **Disco cheio:** em shell administrativo, consulte `df -h`, `df -i`, `docker system df`, `docker compose ... ps` e uso de logs/volumes. Identifique a origem antes de remover arquivos; não apague volumes, WAL, `.release*`, dados Electric ou logs sem cópia e plano. Preserve dados, expanda disco ou remova somente artefato descartável identificado. Revalide espaço, containers, health e slot; registre causa e folga restante.
- **Segredo comprometido:** proprietário revoga/rotaciona primeiro no emissor (GitHub, Neon, Resend ou outro), instala novo valor apenas no secret store/arquivo root-owned e com permissão restrita, recria somente os serviços que o consomem, confirma health/autenticação/replicação e revoga o valor antigo. Nunca inclua segredo em ticket, chat, comando, captura ou log. Se suspeita envolver acesso SSH, remova a chave comprometida, valide host key/fingerprint, instale nova chave por canal confiável e revise ações recentes.
- **Revogar acesso:** proprietário revoga membership pelo fluxo administrativo do workspace e cancela convites relacionados; para revogar conta/sessões, usa mecanismo de identidade oficialmente suportado e comprova que a sessão deixa de acessar API protegida. Preserve/exporte pendências locais antes de trocar conta ou remover dados do aparelho. Para acesso de deploy, revogue a chave no GitHub/servidor e revise o Environment `production`; não edite tabelas de identidade diretamente no banco. A task de D08 ainda precisa provar revogação de sessão real em produção.

Responsável de continuidade: proprietário executa mudanças em Hostinger, Neon, GitHub e Resend e decide a janela/cutover. Codex pode fazer triagem, revisar comandos e registrar resultados quando acionado; não há operação de plantão 24/7 acordada.

#### Protocolo de medição e monitoramento

- **Disponibilidade alvo 99,5%:** janela móvel de 30 dias, serviço HTTPS público em operação contínua, incluindo a pausa do Electric. Para não acordar Neon, o monitor externo consulta `https://windops.devleonardo.com.br/` e `/api/health/live`, nunca `/api/health/ready` em polling. Probes a cada 5 minutos, de dois locais se disponíveis; incidente conta após duas falhas seguidas e termina após duas respostas válidas. Calcular disponibilidade = probes válidas ÷ probes esperadas. Manutenção planejada e falha de provedor contam como indisponibilidade; só excluir falha comprovada do próprio monitor. Isso mede alcance do frontend/API liveness, não login, banco nem sync. 99,5% em 30 dias permite no máximo 3h36 de indisponibilidade observada. Não é SLA prometido.
- **Desempenho de campo:** o proprietário relatou testes funcionais/cold-start aprovados, sem números. Por decisão do proprietário, mediana/p95 <2 s foi retirada do escopo de aceite da D09; não declarar a meta quantitativa atendida. Se essa métrica for retomada em outra etapa, usar aparelho/rede registrados, amostras frias/quentes, mediana/p95 e cold-start Neon separado; não limpar IndexedDB nem dados pendentes.
- **Recursos da VPS:** o proprietário revisa semanalmente CPU, RAM, disco e tendências em **hPanel → VPS → Manage → Backups & Monitoring → Server Usage**. O painel apresenta gráficos históricos; essa é uma revisão manual, sem alerta automático nesta configuração. Se o uso subir de forma sustentada, investigar antes de alterar o plano ou remover dados. Consulte o [guia Hostinger de uso de recursos VPS](https://www.hostinger.com/support/4725768-how-to-check-vps-resources-usage-at-hostinger/).
- **TLS:** Caddy gerencia e renova automaticamente os certificados. Os dois monitores UptimeRobot HTTPS detectam uma falha TLS quando ela interrompe as requisições, mas não enviam alerta antecipado de expiração no plano atual. Em incidentes de HTTPS, revisar os logs do Caddy e estado do certificado. Consulte a [documentação de HTTPS automático do Caddy](https://caddyserver.com/docs/automatic-https).
- **Electric, slot/WAL e sync:** após a retomada diária do Electric e após reboot ou deploy, verificar `windops-electric` saudável, conexão/streaming nos logs e slot lógico ativo no Neon. Durante o uso normal, confirmar que alterações feitas no fluxo da aplicação aparecem após sincronização; se a fila ficar pendente ou a réplica parar, seguir o runbook de indisponibilidade. O Neon remove slots lógicos inativos após aproximadamente 40 horas, por isso retomada e atividade do consumidor precisam ser conferidas; não consultar `/api/health/ready` em polling para isso. Consulte [replicação lógica no Neon](https://neon.com/docs/guides/logical-replication-neon).
- **Limitações e alertas:** o proprietário confirmou os monitores HTTPS `Up` e recebeu alerta de teste por e-mail/push. Nesta configuração não há alertas automáticos para CPU/RAM/disco da VPS, WAL/slot ou falha de sync, nem aviso antecipado de expiração TLS. Revisões de recursos e replicação são manuais conforme a cadência acima; não há plantão 24/7 acordado nem agentes adicionais instalados.

UptimeRobot Free permite monitores HTTP(s) com intervalo mínimo de cinco minutos, e-mail pessoal e push móvel. O proprietário confirmou a criação dos monitores para `https://windops.devleonardo.com.br/` e `https://windops.devleonardo.com.br/api/health/live`, que ambos estão `Up`, e o recebimento do alerta de teste; a [página pública de status](https://stats.uptimerobot.com/kwNQpc0mCF) foi compartilhada. Não monitore `/api/health/ready` em polling: ele consulta Neon e pode impedir scale-to-zero. O resultado cobre HTTPS/front/API liveness, não autenticação, banco, sync ou fila. Consulte [criar monitor](https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide) e [canais pessoais](https://help.uptimerobot.com/en/articles/11360953-uptimerobot-personal-notification-channels-setup-guide).

A versão candidata fica restrita aos validadores até a decisão de abertura registrada em D10. O proprietário relatou os fluxos admin/técnico, Android/iPhone, instalação PWA, modo avião, restart físico, reautenticação, conflito, revogação/exportação e atualização com pendências como funcionais. Simulação de quota/evicção e p95 numérico foram retiradas do escopo D09; o comportamento sob pressão de armazenamento permanece não validado. O proprietário confirma a abertura do piloto após revisar as evidências.

## Acompanhamento deste roteiro

A [slice 11](../.agent/tasks/11-producao/README.md) separa execução e responsabilidades: D02 decisão; D03 artefatos; D04 contas; D05 infraestrutura; D06 entrega; D07 recuperação; D08 candidato; D09 aparelhos; D10 liberação. Cada uma deve atualizar este guia com comandos/resultados efetivamente validados. Fontes externas acima foram consultadas em 31/10/2026; reconfira planos e capacidades ao escolher o destino.

## Janela desejada para VPS + Neon Free

O proprietário confirmou operação diária do Electric das 06h às 18h e pausa das 18h às 06h em `America/Sao_Paulo`, mantendo API/Caddy em execução. A API pode acordar Neon sob demanda e terá latência de cold-start; a réplica local para de receber atualizações quando Electric está pausado. O worker de push não faz polling: outbox fica persistida e tenta novamente após atividade posterior da API. Healthchecks usam liveness sem banco; readiness consulta PostgreSQL apenas quando chamada explicitamente. O timer systemd aplica a janela no boot e nos dois limites horários. Em 08/11/2026, o proprietário observou o compute Neon zerado em quatro noites; o log confirmou a partida automática do Electric às 06h e o slot lógico ativo depois da retomada, inclusive após reboot do host. A latência de cold-start não foi medida; qualquer cálculo de CU-horas depende do uso real e despertares.

### Acordar Electric manualmente fora da janela

Quando precisar de sincronização do Electric à noite, após as 18h, inicie o serviço diretamente pelo Compose. O helper `windops-electric-window` sempre reconcilia a política atual; fora da janela ele **para** o container, portanto não use o helper para acordá-lo fora do horário. No host, em `/opt/windops`, execute:

```bash
cd /opt/windops
sudo docker compose --env-file infra/.env.production --env-file .release.env \
  -f infra/compose.production.yml up -d --wait electric
sudo docker compose --env-file infra/.env.production --env-file .release.env \
  -f infra/compose.production.yml ps electric
```

Os dois arquivos de ambiente são necessários: `infra/.env.production` contém a configuração privada do runtime e `.release.env` aponta para as imagens fixadas do release. Não exiba nem compartilhe seu conteúdo. Pode repetir a subida manual sempre que precisar durante a noite. Ela não desabilita nem altera o timer systemd: uma execução às 06h o manterá ativo, e a próxima execução das 18h o pausará. A API/Caddy não são afetados.

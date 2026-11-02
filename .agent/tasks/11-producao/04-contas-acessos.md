# D04 — Criar ambientes, contas e fornecer acessos

## Status

- Concluída em 02/11/2026

- [x] Task concluída

## Responsável

Proprietário; Codex fornece instruções e confere.

## Objetivo

Disponibilizar recursos externos e permissões mínimas para preparar o ambiente escolhido.

## Escopo e exclusões

Contas e metadados de operação; credenciais persistem apenas no local apropriado. Sem copiar dados dev para produção.

## Estado atual

O proprietário confirmou VPS Hostinger KVM1/Ubuntu 24.04.5 por R$625 pagos por dois anos, projeto Neon Free PostgreSQL 18 e roles separadas, domínio/DNS, configuração completa do Resend, SSH de deploy restrito, segredos de runtime armazenados no `.env.production` e OAuth Google configurado para o domínio de produção. O Environment GitHub e suas entradas, `DEPLOY_ENABLED=false`, ruleset da `main`, metadados do Neon e conta de primeiro admin foram informados/confirmados pelo proprietário; nenhum segredo ou identificador pessoal foi persistido. O workspace de produção foi nomeado `Elevadores`. Renovação não informada; login/e-mail real, grants/TLS e deploy continuam em D05/D06/D08.

## Dependências

D02; pode ocorrer junto de D03.

## Plano

- [x] Registrar custo/prazo e capacidade contratada informados: R$625 por 24 meses, KVM1 1 vCPU/4 GB. Renovação não informada; registrar como limite, não bloqueador. Neon Free production e papéis separados confirmados em D02; validação de roles/publicação pertence a D05.
- [x] Registrar configuração completa de domínio/remetente/conta Resend conforme confirmação do proprietário; não registrar API key. Teste de entrega real permanece em D08.
- [x] Registrar que o proprietário adicionou Client ID/Secret OAuth de produção ao `.env.production`; não ler/copiar os valores.
- [x] Proprietário confirmou o redirect URI exato no cliente OAuth Web de produção: `https://windops.devleonardo.com.br/api/auth/callback/google`.
- [x] Proprietário confirmou que a configuração Google OAuth de produção está correta, incluindo a origem autorizada `https://windops.devleonardo.com.br`; teste de login real fica após deploy.
- [x] Confirmar repositório conectado: `Leo-Rodrigs-A/windops` é público, branch padrão `main`, e a conexão GitHub informa permissão admin/push.
- [x] Confirmar pelo workflow que a primeira publicação cria o package GHCR automaticamente via `GITHUB_TOKEN`/`packages: write`; nenhuma criação manual do package é necessária. Publicação/pull real ficam em D06.
- [x] Proprietário confirmou Environment `production` e suas quatro entradas de deploy (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`), além de `DEPLOY_ENABLED=false` como variable do repositório.
- [x] Proprietário verificou a página Branch protection rules e confirmou que não há regra clássica nem ruleset configurado para `main` (captura de 02/11/2026).
- [x] Proprietário informou que criou ruleset ativo para `main`, exigindo PR e CI, bloqueando force push e exclusão; sem bypass configurado. Confirmação reportada, não observada diretamente pelo Codex.
- [x] Codex preparou inventário das variáveis de runtime, deploy e seus destinos em [`docs/producao.md`](../../../docs/producao.md#instalar-arquivos-e-segredos).
- [x] Proprietário informou que os segredos de runtime já estão no `.env.production` protegido na VPS; nenhum valor foi lido ou copiado.
- [x] Proprietário confirmou vars/secrets de deploy no Environment `production`; valores não foram compartilhados no chat, commits ou evidências.
- [x] Registrar metadados não secretos já informados: Hostinger KVM1 no Brasil, Ubuntu 24.04.5, domínio DNS e repositório `Leo-Rodrigs-A/windops`.
- [x] Proprietário confirmou que o SSH da VPS está totalmente configurado; teste da chave restrita/known_hosts pelo workflow fica em D06.
- [x] Proprietário informou metadados não secretos do projeto Neon: ID `blue-surf-65807897`, nome `windops-production`.
- [x] Proprietário informou hostname não secreto do Neon (`ep-blue-mud-b601ar3h.c-2.sa-east-1.aws.neon.tech`) e role proprietária/admin (`windops-production_owner`).
- [x] Proprietário confirmou a role operacional `windops_app`, distinta de `windops-production_owner`, `windops_migrator` e `windops_replication`.
- [x] Proprietário selecionou a conta pessoal que será o primeiro admin; dados pessoais não reproduzidos porque o repositório é público. A conta ainda deve autenticar/verificar o e-mail após deploy.
- [x] Proprietário definiu `Elevadores` como nome do workspace de produção; sua criação junto à membership admin ocorrerá no bootstrap de D08, após cadastro/verificação da conta.
- [x] A conexão GitHub confirmou permissão admin/push ao repositório.

## Contratos e dados afetados

Contas e metadados de operação; credenciais persistem apenas no local apropriado. Sem copiar dados dev para produção.

## Testes e aceite

Checklist de recursos e acessos conferido item a item. Acesso disponível não significa serviço configurado nem produção validada.

## Evidências

Planejamento em 30/10/2026. Execução parcial e pendências registradas abaixo.

### Preparação do inventário — 02/11/2026

Inventário de runtime (`.env.production` root-owned), release (`.release.env`), `IMAGE_PREFIX` e vars/secrets de deploy está no manual. GitHub confirmou repo público `Leo-Rodrigs-A/windops`, branch `main` e permissão admin/push; settings do Environment/proteção da branch não estão expostos pelo conector. O workflow cria o package GHCR no primeiro push; publicação/pull e SSH do workflow ficam em D06. O proprietário confirmou R$625/24 meses, Resend totalmente configurado, SSH da VPS pronto, Client ID/Secret OAuth de produção no `.env.production` e redirect URI de produção cadastrado; nenhum segredo foi solicitado, lido ou copiado. Para fechar D04 restam Environment/proteção/vars/secrets de deploy e metadados não secretos do Neon/host/primeiro admin/workspace. Renovação e testes reais de OAuth/e-mail ficam registrados como limites/gates posteriores, sem bloquear D04.

### Configuração de acesso na VPS e OAuth — 02/11/2026

O proprietário confirmou que a configuração Google OAuth de produção está correta. Em acesso guiado à VPS, confirmou usuário `windops-deploy` existente, chave pública dedicada em `authorized_keys` com forced command, sudoers restrito a `/usr/local/sbin/windops-deploy`, scripts e Compose instalados do commit `f5395bba2c4eedae662db43ba2e344b298a55aec`, e `IMAGE_PREFIX=ghcr.io/leo-rodrigs-a/windops`. Teste SSH local com comando inválido retornou a mensagem do wrapper, confirmando autenticação da chave e bloqueio do comando arbitrário. Nenhum deploy ou login OAuth de produção executado. Repositório permanece público; proprietário informou plano GitHub Free, portanto mudança para privado está adiada até adaptar os secrets do workflow ou mudar de plano. Mantém-se `DEPLOY_ENABLED=false`; proteção da `main`, metadados Neon e identificação do admin/workspace ainda pendentes. Pull GHCR e deploy real pertencem à D06.

Captura enviada pelo proprietário em 02/11/2026 da página “Branch protection rules” não mostra regras existentes. A pendência agora é criar ruleset para `main` que exija PR e check `validate`, bloqueie force push e exclusão; não presumir branch protegida até aplicar e confirmar a regra ativa.

Atualização: o proprietário informou “pronto” após configurar o ruleset ativo da `main` conforme orientação (PR, checks de CI, force push bloqueado, exclusão bloqueada, bypass vazio). Aceite baseado no relato do proprietário; validação direta do settings não disponível.

O proprietário informou o ID Neon `blue-surf-65807897`, nome `windops-production`, hostname `ep-blue-mud-b601ar3h.c-2.sa-east-1.aws.neon.tech` e `PGUSER=windops-production_owner` (role proprietária/admin). Essa role não deve ser usada pela API. Falta confirmar que a `DATABASE_URL` da aplicação usa `windops_app`; não solicitar nem registrar URLs completas ou senhas. O proprietário informou `PGSSLMODE=require` e `PGCHANNELBINDING=require`; validação de TLS/roles fica em D05.

O proprietário confirmou que a conexão da aplicação usa `PGUSER=windops_app`, com o mesmo hostname/database informados e `PGSSLMODE=require`, `PGCHANNELBINDING=require`. O metadado da role operacional está concluído; validação de grants/TLS permanece em D05.

O proprietário indicou a conta pessoal que pretende usar como primeiro admin. Nome/e-mail não foram persistidos no repositório público e a conta ainda precisa autenticar/verificar o e-mail em produção após deploy. Workspace de produção ainda sem nome definido. A mensagem incluiu um campo identificado como senha; nenhum valor foi copiado para arquivos. Se era uma senha real/reutilizada, trocá-la antes do uso em produção.

O proprietário nomeou o workspace de produção `Elevadores`. Com a conta de primeiro admin selecionada, metadados Neon registrados, Environment/SSH/ruleset confirmados, D04 está concluída. A conta ainda deve ser cadastrada/autenticada e verificada no domínio final; o workspace e membership admin serão criados pelo bootstrap pós-deploy em D08. Nenhuma credencial ou dado pessoal foi copiado ao repositório. Login OAuth/e-mail, acesso GHCR, deploy, grants e TLS reais permanecem nas tasks posteriores.

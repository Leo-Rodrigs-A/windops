# Wind Ops

Wind Ops ajuda equipes de manutenção a registrar e atender problemas nos elevadores de torres eólicas, inclusive durante visitas sem internet. Em vez de lembrar dos problemas para transcrevê-los depois em uma planilha, o técnico registra o chamado no local; a aplicação guarda a alteração no dispositivo e a envia quando a conexão retorna.

O fluxo é: **visitar o parque → registrar o problema → sincronizar → atender → consultar o histórico**. A interface está em português e funciona como PWA, uma aplicação web que pode ser instalada pelo navegador.

## Neste manual

1. [O projeto e seus limites](#o-projeto-e-seus-limites)
2. [Preparar o desenvolvimento do zero](#preparar-o-desenvolvimento-do-zero)
3. [Trabalhar no dia a dia](#trabalhar-no-dia-a-dia)
4. [Colocar em produção](#colocar-em-produção)
5. [Encontrar código e documentação](#encontrar-código-e-documentação)

## O projeto e seus limites

O piloto atende uma empresa/workspace por instalação. A referência inicial é de 12 pessoas e oito parques com oito turbinas cada; o inventário é configurável. Cada turbina tem um elevador. Os chamados desta versão contêm texto, sem fotos nem gestão de materiais.

| Recurso           | Comportamento entregue                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Acesso            | Cadastro por link de e-mail ou Google, perfil/senha, código por e-mail obrigatório em cada novo login online e recuperação de senha.                                                       |
| Equipe            | Administradores e técnicos, convites, alteração de cargo e revogação de acesso.                                                                                                            |
| Equipamentos      | Parques/turbinas, edição, exclusão sem referências e arquivamento/restauração conforme histórico e chamados abertos.                                                                       |
| Chamados          | Pendente → Em andamento → Concluído, edição autorizada, arquivo, reabertura e histórico imutável. O criador aguarda uma hora desde a criação no servidor para iniciar seu próprio chamado. |
| Offline           | Cache e fila persistidos em IndexedDB, reconciliação, retries idempotentes, conflitos explícitos e exportação de pendências.                                                               |
| Consulta e avisos | Filtros por parque/turbina, histórico paginado, campainha e Web Push configurável.                                                                                                         |

A primeira autenticação precisa de rede. Administração de equipe/equipamentos e determinadas ações administrativas também são online. Consultas de concluídos/arquivados podem exigir rede; o histórico local é parcial. Uma sessão expirada permite continuar o trabalho local previamente habilitado, mas exige autenticação para enviar pendências. Abra ou retome o app com conexão para sincronizar; envio em segundo plano não é garantido.

As slices 01–10 foram encerradas com as evidências registradas no [índice de tarefas](.agent/tasks/README.md). O proprietário confirmou testes funcionais de produção em Android, iPhone e PWA desktop; a matriz detalhada por versão/cenário, pressão física de armazenamento e métricas numéricas continuam na [slice 11](.agent/tasks/11-producao/README.md). Essa confirmação não declara suporte móvel geral além dos aparelhos e fluxos testados. Apagar os dados do site pode apagar trabalho ainda não enviado: preserve ou exporte pendências antes de limpar o navegador.

O backend é um monólito modular Fastify. O frontend usa React/Vite, TanStack e Shadcn/Tailwind; PostgreSQL guarda os dados, Electric entrega a réplica e IndexedDB mantém o estado local. O navegador acessa Electric **somente pelo proxy autenticado da API**. Mesmo no piloto com uma empresa, cada operação valida o acesso ao workspace no servidor.

## Preparar o desenvolvimento do zero

### 1. Instalar as ferramentas

O caminho de referência é Ubuntu 24.04, nativo ou no WSL2. No Windows, instale o [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) pelo PowerShell como administrador, reinicie quando solicitado e abra o terminal Ubuntu:

```powershell
wsl --install -d Ubuntu-24.04
```

Execute os próximos comandos no Bash do Linux. Mantenha o projeto no filesystem Linux, por exemplo `~/projetos/windops`; não compartilhe `node_modules` entre Windows e WSL.

```bash
sudo apt update
sudo apt install -y git curl ca-certificates build-essential
mkdir -p ~/projetos
cd ~/projetos
git clone 'URL_DO_REPOSITORIO' windops
cd windops
```

Substitua `URL_DO_REPOSITORIO` pelo endereço SSH/HTTPS fornecido pelo proprietário; repositório privado exige acesso à conta GitHub.

Instale o gerenciador de versões seguindo a seção [Installing and Updating do nvm](https://github.com/nvm-sh/nvm#installing-and-updating), reabra o terminal e, dentro do repositório, execute:

```bash
nvm install "$(cat .node-version)"
nvm use "$(cat .node-version)"
corepack enable
corepack prepare pnpm@10.34.8 --activate
node --version
pnpm --version
```

O projeto fixa Node **22.22.2** em [.node-version](.node-version) e pnpm **10.34.8** em [package.json](package.json). Não substitua pelas versões `latest` dos tutoriais. Se Corepack reclamar de assinatura, consulte a [instalação do pnpm](https://pnpm.io/installation); uma alternativa é instalar a versão fixa com `npm install --global pnpm@10.34.8` no Node gerenciado pelo nvm.

Instale o Docker Engine e o plugin Compose pelo [guia oficial para Ubuntu](https://docs.docker.com/engine/install/ubuntu/), incluindo o acesso do usuário ao daemon. No WSL, também é possível usar Docker Desktop com integração habilitada para a distribuição; escolha um daemon. Não execute `pnpm` com sudo para contornar permissão do Docker.

```bash
docker version
docker compose version
docker run --rm hello-world
```

Esses comandos precisam funcionar no mesmo terminal do projeto antes de continuar. O Docker é necessário para PostgreSQL, Electric, Mailpit e testes de integração. Reserve as portas locais 5432, 3001, 1025, 8025, 3000 e 5173.

### 2. Instalar dependências e criar o ambiente local

```bash
pnpm install --frozen-lockfile
cp .env.example .env
chmod 600 .env
```

Copie o exemplo apenas na primeira instalação: não sobrescreva um `.env` que já contém configurações. Ele fica na raiz, é ignorado pelo Git e é lido pela API e ferramentas de banco. Variáveis exportadas no processo podem prevalecer sobre o arquivo.

| Configuração local                               | Para que serve                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `APP_ORIGIN=http://localhost:5173`               | Origem exata da interface, links de e-mail e autenticação. Abra esse endereço, sem trocar por `127.0.0.1`.                           |
| `DATABASE_URL`                                   | Conexão da API com papel `windops_app`.                                                                                              |
| `MIGRATION_DATABASE_URL`                         | Conexão exclusiva de migração, com papel `windops_migrator`.                                                                         |
| `ELECTRIC_DATABASE_URL`                          | Conexão usada pelos verificadores de permissões. No Compose dev, a URL do Electric é montada internamente com o papel de replicação. |
| `WINDOPS_*_PASSWORD`                             | Senhas dos três papéis locais; devem corresponder às URLs. O exemplo usa valores descartáveis de desenvolvimento.                    |
| `ELECTRIC_URL` / `ELECTRIC_SECRET`               | API → Electric. O segredo local deve coincidir com o Compose dev.                                                                    |
| `EMAIL_TRANSPORT=smtp`, `SMTP_URL`, `EMAIL_FROM` | Envio local para o Mailpit; não envia mensagens à internet.                                                                          |
| `AUTH_ENABLED=false`                             | Estado inicial para preparar/testar a instalação; autenticação ainda desativada.                                                     |

Nunca copie credenciais locais para produção nem coloque segredos em `VITE_`: essas variáveis podem entrar no código entregue ao navegador.

### 3. Subir dependências e preparar o banco

```bash
pnpm db:setup
pnpm db:permissions
pnpm --filter @windops/contracts build
pnpm test:auth-integration
```

`db:setup` sobe PostgreSQL/Mailpit, reconcilia papéis, inicia Electric, aplica migrações e atualiza grants/publicação. Pode ser repetido sobre um volume existente. O teste de autenticação usa banco descartável e Mailpit e verifica, entre outros casos, segundo passo obrigatório e vínculo de contas verificadas. Deixe-o passar **antes de habilitar as rotas de autenticação**; não contorne uma falha ligando `AUTH_ENABLED`.

O resultado esperado é banco migrado, permissões aprovadas e integração sem erro. Não são criados usuário, senha padrão, workspace nem inventário. Confira os serviços:

```bash
docker compose -f infra/compose.dev.yml --profile sync ps
```

### 4. Habilitar acesso e iniciar a aplicação

Gere um segredo local, gravando-o diretamente no arquivo sem imprimi-lo:

```bash
node --input-type=module <<'JS'
import { appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
appendFileSync('.env', '\nBETTER_AUTH_SECRET=' + randomBytes(48).toString('base64url') + '\n');
JS
```

Faça isso uma vez, sem duplicar uma chave já configurada. Edite `.env` e troque `AUTH_ENABLED=false` por `AUTH_ENABLED=true`. Depois:

```bash
pnpm dev
```

O comando compila os contratos e inicia API e frontend com recarga durante desenvolvimento. Mudanças em `.env` exigem reiniciar os processos.

| Endereço                                 | O que verificar                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| http://localhost:5173                    | Interface; cadastro/login disponíveis.                                                        |
| http://localhost:8025                    | Caixa de entrada Mailpit, com links e códigos enviados no dev.                                |
| http://localhost:3000/api/health/live    | API em execução.                                                                              |
| http://localhost:3000/api/health/ready   | HTTP 200 quando PostgreSQL e Electric estão disponíveis; 503 aponta dependência indisponível. |
| http://localhost:3000/api/auth/providers | Indica se o processo carregou Google (`google: true/false`).                                  |
| http://localhost:3000/api/docs           | Referência da API, disponível apenas fora de produção.                                        |

Cadastre-se por e-mail, abra o link recebido no Mailpit, defina nome/senha e conclua o login com o código recebido. É normal ficar sem workspace neste ponto.

**Google opcional no dev:** crie um cliente OAuth do tipo Web no Google Cloud, configure origem `http://localhost:5173` e redirect URI `http://localhost:5173/api/auth/callback/google`. Cadastre `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` juntos no `.env`, reinicie a API e consulte `/api/auth/providers`. Use a origem do frontend, que encaminha `/api` à API. Configurações já existentes na máquina do proprietário não são distribuídas no clone. Google também exige o segundo passo por e-mail; produção terá configuração própria.

### 5. Criar o primeiro workspace e administrador

Depois de cadastrar e verificar a conta destinada a administrador, consulte seu UUID explicitamente. No comando abaixo, troque somente o e-mail pelo da conta que você acabou de criar:

```bash
docker compose -f infra/compose.dev.yml exec -T postgres \
  psql -U windops -d windops -v ON_ERROR_STOP=1 <<'SQL'
SELECT id, email, email_verified
FROM public.auth_users
WHERE email = 'admin@example.com';
SQL
node -e 'console.log(require("node:crypto").randomUUID())'
```

O último comando gera o UUID de um **novo** workspace. Guarde-o. Substitua os três valores abaixo e execute a partir da raiz:

```bash
docker compose -f infra/compose.dev.yml exec -T postgres \
  psql -U windops -d windops -v ON_ERROR_STOP=1 \
  -v workspace_id='UUID_DO_WORKSPACE' \
  -v workspace_name='Nome da empresa' \
  -v user_id='UUID_DA_CONTA_VERIFICADA' \
  < apps/api/scripts/bootstrap-workspace.sql
```

O [bootstrap](apps/api/scripts/bootstrap-workspace.sql) é transacional e repetível com os **mesmos valores**; rejeita conta não verificada ou conflitos com workspace/membership existente. Não gere outro UUID ao repetir nem escolha automaticamente o primeiro usuário do banco. Recarregue a interface; como administrador, cadastre parques/turbinas e convide um técnico pela tela Equipe. O convite chega ao Mailpit. As próximas promoções são feitas pela interface.

### 6. Configurar Web Push quando for testá-lo

O app pode rodar sem VAPID; para envio de push, configure as três variáveis no servidor. Este comando gera um par de desenvolvimento usando a dependência já instalada, sem imprimir a chave privada:

```bash
pnpm --filter @windops/api exec node --input-type=module <<'JS'
import { appendFileSync } from 'node:fs';
import webpush from 'web-push';
const keys = webpush.generateVAPIDKeys();
appendFileSync('../../.env', '\nVAPID_SUBJECT=mailto:dev@example.com\n' +
  'VAPID_PUBLIC_KEY=' + keys.publicKey + '\nVAPID_PRIVATE_KEY=' + keys.privateKey + '\n');
JS
```

Substitua o contato por um endereço seu, evite entradas duplicadas e mantenha o par estável para as subscrições existentes. Reinicie a API e teste na interface usando o Preview abaixo, que registra o service worker. Produção usa outro par, armazenado como segredo. Não é necessário criar uma variável `VITE_` para isso.

## Trabalhar no dia a dia

### Abrir e encerrar o ambiente

Na raiz do projeto, confira suas alterações antes de atualizar a branch:

```bash
git status --short
git pull --ff-only
nvm use "$(cat .node-version)"
pnpm install --frozen-lockfile
pnpm db:setup
pnpm dev
```

Resolva alterações locais antes do pull. `db:setup` também aplica novas migrações e reconcilia grants; não é necessário gerar migrações ao baixar código de outra pessoa. Em uma sessão sem mudanças de dependências/schema, basta `pnpm infra:up` e `pnpm dev`.

Pare API/web com `Ctrl+C`. Para parar a infraestrutura preservando dados:

```bash
pnpm infra:down
```

Não acrescente `-v`/`--volumes` em um ambiente que contém dados necessários. Limpar volumes PostgreSQL e limpar IndexedDB são operações diferentes; nenhum dos dois recupera pendências do outro.

### Conferir alterações

| Comando                            | Quando usar / efeito                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                       | Lint, fronteiras dos módulos, typecheck, testes e builds; obrigatório para mudanças de fonte.                                                            |
| `pnpm test:auth-integration`       | Cadastro, login, OTP, linking e permissões de sessão com PostgreSQL/Mailpit.                                                                             |
| `pnpm test:workspaces-integration` | Bootstrap, convites e autorização de equipe.                                                                                                             |
| `pnpm test:parks-integration`      | Catálogo e lifecycle.                                                                                                                                    |
| `pnpm test:issues-integration`     | Chamados, concorrência, autorização e idempotência; o alias `test:issues-read-integration` executa o mesmo script.                                       |
| `pnpm test:integration`            | PostgreSQL/Electric e shapes; não substitui as quatro suites acima.                                                                                      |
| `pnpm db:permissions`              | Confere privilégios dos papéis usando conexões do ambiente.                                                                                              |
| `pnpm db:empty-check`              | Instalação vazia, upgrade/reaplicação e persistência em bancos temporários; **reinicia o PostgreSQL dev**, interrompendo conexões locais.                |
| `pnpm db:restore-check`            | Dump/restore em banco temporário; compara contagens de workspace/journal e presença do schema de issues. Não certifica recuperação completa de produção. |

Integrações usam o Docker local e bancos descartáveis; execute-as com infraestrutura ativa e sem apontar URLs para produção. Confira a variável `MAILPIT_URL` se mudar a porta do Mailpit. Evite executar testes que reiniciam o banco durante outra sessão de trabalho.

Ao **alterar o schema**, edite o schema do módulo responsável, gere/revise SQL com `pnpm db:generate`, aplique `pnpm db:setup` e valide permissões, instalação vazia e integrações afetadas. Commite a migração junto do código; não edite uma migração já aplicada. `db:migrate` sozinho não reconcilia a publicação/grants do provisionador.

### Testar o build e o PWA

Pare `pnpm dev` antes: dev e Preview usam a mesma porta/origem. Depois:

```bash
pnpm build
# Terminal 1, na raiz:
pnpm --filter @windops/api start
# Terminal 2, na raiz:
pnpm --filter @windops/web preview
```

Abra `http://localhost:5173`. O Preview serve o build e usa o proxy `/api`; a API compilada permanece no terminal 1. `NODE_ENV` continua vindo do ambiente local: **não** o troque para `production` ao testar HTTP local, pois essa configuração exige HTTPS.

Entre online, espere o cache ficar pronto, registre uma alteração offline, feche/reabra e reconecte. Confira a fila e ausência de duplicação. Para testar atualização, mantenha o Preview, gere outro build e use o aviso do app, preservando pendências. Vite dev remove o registro do worker da aplicação para evitar misturar módulos de desenvolvimento com assets antigos; o teste de PWA deve ocorrer no Preview. No DevTools, deixe “Bypass for network” desmarcado durante o ensaio offline.

### Resolver problemas comuns

| Sintoma                                     | Conferência e ação                                                                                                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker permission denied / daemon ausente   | Corrija a instalação/integração e acesso do usuário; confirme `docker ps` antes de chamar pnpm.                                                                                                           |
| Porta já em uso                             | Verifique `ss -ltnp` e `docker ps`. Pare apenas o processo identificado; não derrube outra sessão para trocar dev por Preview.                                                                            |
| API não fica pronta                         | Consulte `docker compose -f infra/compose.dev.yml --profile sync ps` e `logs --tail=80 postgres electric`; confira URLs, roles, migrations e publicação. Não compartilhe logs sem revisar segredos/dados. |
| Login indisponível / Google ausente         | Confira `AUTH_ENABLED`, segredo, SMTP e o par Google no processo da API; reinicie após editar `.env`.                                                                                                     |
| Origem inválida / callback falha            | Navegue exatamente em `APP_ORIGIN`; confira origem e redirect URI do cliente Google. Preview também usa 5173.                                                                                             |
| Conta sem empresa                           | Execute bootstrap apenas para a conta verificada indicada ou aceite convite; não dê acesso apenas por conseguir fazer login.                                                                              |
| Arquivo de contratos não encontrado         | Rode `pnpm --filter @windops/contracts build`; `pnpm dev` e `pnpm build` já fazem isso.                                                                                                                   |
| Conflito de sincronização                   | Revise o conflito na Cloud; preserve/exporte a fila. Não apague IndexedDB para esconder o erro.                                                                                                           |
| pnpm tenta outra versão / instalação parada | Confira Node, `pnpm --version`, proxy/rede e saída do comando. Preserve o lockfile; erro/timeout não é check aprovado.                                                                                    |

## Colocar em produção

O roteiro completo está no [guia de produção](docs/producao.md). Ele começa pelas contas necessárias, passa por banco/domínio/segredos e segue até deploy, bootstrap, atualização e recuperação. Leia-o antes de criar recursos pagos.

| Caminho                                     | Como funciona                                                                                                            | Situação neste repositório                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| VPS, por exemplo Hetzner Cloud ou Hostinger | Você administra Linux/Docker; Compose sobe Caddy/web, API e Electric; PostgreSQL fica externo, com Neon como referência. | Dockerfiles, Compose, Caddy, scripts SSH e workflow existem. Provisionamento e validação no destino seguem em D02–D10.                     |
| PaaS, exemplo Render                        | Plataforma administra os serviços; API/Electric ficam privados e uma entrada web recebe o tráfego.                       | Alternativa documentada; exige adaptação de ingress/Caddy e pipeline, além de validação de volumes e banco. Não há template Render pronto. |

A sequência é **escolher destino → criar contas/acessos → preparar app/banco/rede → validar entrega e recuperação → publicar candidato → testar aparelhos → liberar piloto**. O proprietário define orçamento, região, domínio e administrador; Codex prepara e valida as configurações com os acessos fornecidos. Não é preciso criar uma hospedagem em cada provedor.

O README ensina o caminho e os comandos existentes. A [D01](.agent/tasks/11-producao/01-readme-manual.md) registra o ensaio local deste manual. O deploy candidato e os fluxos funcionais de produção foram confirmados pelo proprietário em D08; testes de restore foram excluídos do escopo. Matriz detalhada de aparelhos e liberação do piloto permanecem em D09/D10.

## Encontrar código e documentação

| Caminho                                                             | Conteúdo                                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [apps/web](apps/web)                                                | Interface, features, rotas, componentes e persistência/sincronização local.                  |
| [apps/api](apps/api)                                                | API, identidade, workspaces, parques, issues, audit, notifications e sync.                   |
| [packages/contracts](packages/contracts)                            | DTOs/schemas Zod e tipos públicos.                                                           |
| [infra](infra) / [scripts](scripts)                                 | Compose, imagens, Caddy, provisionamento e deploy.                                           |
| [Arquitetura](.agent/architecture.md) / [banco](.agent/database.md) | Fronteiras, invariantes e modelo de dados.                                                   |
| [Tarefas](.agent/tasks/README.md) / [memória](.agent/memory.md)     | Planos, decisões e evidências históricas; o estado mais recente supera registros anteriores. |

Módulos chamam os serviços públicos de outros módulos, sem importar schemas/repositórios alheios. Autorização por tenant, segunda etapa, idempotência e persistência da fila são invariantes, inclusive ao refatorar.

As referências visuais `.pen` pertencem ao proprietário e ficam fora do repositório, no Windows. Consulte-as pelo MCP do Pencil/pen.dev, confirme o documento antes de usar e não edite o design sem solicitação. Build e execução não dependem desses arquivos; não os copie para o Git.

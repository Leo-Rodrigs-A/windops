# D01 — README como manual do desenvolvedor

## Status

Concluída em 31/10/2026.

- [x] Task concluída

## Responsável

Codex.

## Objetivo

Transformar o README na entrada única para entender, desenvolver e operar o Wind Ops.

## Escopo e exclusões

README e eventuais guias em docs/; nenhuma alteração de contrato público ou design. Não embutir segredos nem dados pessoais.

## Estado atual

Antes da D01, o README tinha setup parcial, referências históricas e afirmações desatualizadas (por exemplo, proxy sync 503 e etapa atual). Compose, scripts e workflows já existem, mas não comprovam deploy real.

## Dependências

Nenhuma; primeira tarefa da slice.

## Plano

- [x] Explicar o problema de registro em campo sem internet, público, fluxo visita→registro→sincronização→equipe, recursos entregues e limites reais do piloto.
- [x] Organizar o manual na ordem solicitada: projeto/problema; ambiente do zero; rotina diária; produção. Incluir sumário e links para detalhes operacionais sem obrigar a leitura da memória do agente.
- [x] Descrever instalação em Linux/WSL2 desde Git, Node da .node-version, Corepack/pnpm e Docker/Compose; clone sem caminho pessoal fixo, dependências frozen, .env de exemplo, banco/roles/migrations, Mailpit, API/web e resultados esperados.
- [x] Ensinar configuração de auth, teste de cadastro/OTP, Google opcional no dev, bootstrap explícito do workspace/admin e VAPID; diferenciar configuração local de produção e apontar os testes obrigatórios antes de habilitar auth.
- [x] Ensinar rotina: atualizar código/dependências/migrations quando necessário, subir serviços, iniciar dev, encerrar preservando volumes, executar checks/integrações e Preview com origem/porta correta; explicar recuperação de erros comuns e impacto dos comandos de banco.
- [x] Escrever passo a passo VPS com Docker Compose/Caddy e alternativa PaaS concreta a avaliar em D02: pré-requisitos, serviços, banco, rede privada, storage, segredos, domínio/TLS, migração, deploy, bootstrap, atualização e recuperação. Identificar adaptações ainda pendentes, sem apresentar comandos inexistentes como prontos.
- [x] Distinguir VPS Hetzner/Hostinger de PaaS gerenciado; explicar responsabilidades operacionais e requisitos de compatibilidade. Manter ambos os caminhos documentados e marcar qual foi efetivamente testado.
- [x] Conferir cada comando contra scripts/configuração reais e ensaiar setup em ambiente descartável. Registrar passos externos não executados. Revisar manual novamente nas tasks que alterarem o fluxo.

## Contratos e dados afetados

README e eventuais guias em docs/; nenhuma alteração de contrato público ou design. Não embutir segredos nem dados pessoais.

## Testes e aceite

Leitor consegue entender o produto, preparar dev e seguir o roteiro operacional sem conhecimento prévio do repositório. Links/comandos conferidos; setup isolado registrado. Produção ainda não executada fica explicitamente identificada.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.


### Entrega — 31/10/2026

[README](../../../README.md) reescrito como manual na ordem solicitada: problema/recursos/limites, instalação Linux/WSL2, clone/ferramentas/ambiente, auth e Mailpit, bootstrap por UUID explícito, Google/VAPID, rotina diária, migrations/checks, Preview/PWA e diagnóstico. [Guia de produção](../../../docs/producao.md) detalha contas/permissões, Neon/roles/publicação, Resend/OAuth, VPS/Docker/Caddy, imagens imutáveis, primeiro deploy, GitHub/SSH, Render, recuperação e liberação. Links oficiais consultados em 31/10/2026; Context7 indisponível, consulta direta às fontes oficiais.

Nenhum layout, fonte, schema, infraestrutura versionada ou segredo foi alterado. A alternativa Render é roteiro de adaptação, sem template executável: Caddy/ingress, pipeline, volumes e migração ainda dependem de D02–D06. O provisionamento Neon continua D05. D03–D10 deverão revisar o manual à medida que validarem o destino.

### Ensaio isolado

Cópia dos arquivos versionados em `/tmp/windops-d01-setup`, sem copiar o `.env` do proprietário. Projeto Compose `windops-d01`, volumes próprios e portas 15432/13001/11025/18025 para PostgreSQL/Electric/SMTP/Mailpit; API/web 13000/15173, com origem/proxy ajustados somente na cópia. Nenhum restart ou alteração no banco `windops-dev`.

- `pnpm install --frozen-lockfile --store-dir /tmp/windops-d01-store`: passou, 323 pacotes, store isolada. Rede exigiu execução autorizada fora do sandbox.
- `pnpm db:setup`: passou em instalação vazia e novamente sobre o mesmo volume. Migrações aplicadas; contagem do journal no restore: 14.
- `pnpm db:permissions`: passou; runtime DML, migrador e allowlist de replicação conferidos.
- `pnpm --filter @windops/contracts build` e `MAILPIT_URL=http://127.0.0.1:18025 pnpm test:auth-integration`: passaram antes de habilitar auth no ambiente do ensaio. OAuth simulado, linking verificado, OTP/restart e signup cobertos pelo script.
- `pnpm build`: passou (contracts/API/web).
- `pnpm db:restore-check`: passou em banco descartável, `workspaces:migrations=0:14`, schema de issues/projeções presente. Não havia inventário operacional; não é prova completa de recuperação de produção.
- Trechos do README que geram segredo de auth e par VAPID foram executados na cópia isolada sem imprimir os valores; auth habilitada somente após a integração.
- `pnpm dev`: frontend, ready via proxy, providers (Google false no exemplo) e docs responderam HTTP 200. Processos encerrados antes de testar Preview.
- `pnpm --filter @windops/api start` + `pnpm --filter @windops/web preview`: frontend, ready via proxy, manifesto e service worker responderam HTTP 200. Processos encerrados ao final.
- `MAILPIT_URL=http://127.0.0.1:18025 pnpm test:workspaces-integration`: passou; bootstrap/idempotência/negativas, convites, segunda etapa, cargos e isolamento. Erros SQL esperados das negativas não são falhas do ensaio.
- `pnpm check`: **não passou**; interrompido pelo Biome em duas tabelas Markdown preexistentes (`baseline-r01.md` e índice da slice 11). Typecheck/testes/build encadeados não foram executados por esse comando. O build e as integrações acima foram executados separadamente. O índice da slice 11 foi formatado nesta entrega; baseline R01 está fora do escopo e permanece sem alteração.

### Limites e verificação documental

Host do ensaio: Node 24.13.1 (compatível com engines), pnpm 10.34.8, Compose 2.39.2. O manual recomenda o Node 22.22.2 fixado em `.node-version`/imagens; não houve instalação nova de SO, nvm, Node 22 ou Docker nesta task. Nenhum novo ensaio interativo no navegador, callback Google real, entrega Resend, push real ou aparelho físico. O smoke HTTP de Preview não comprova offline em navegador. GHCR, VPS/Render, TLS público, Neon e deploy remoto não foram executados.

Links locais/âncoras do manual e sintaxe Bash dos exemplos conferidos; comandos pnpm comparados aos manifests. Formatação dos documentos novos/da D01 e `git diff --check` aprovados. Containers temporários encerrados e volumes exclusivos do ensaio removidos; serviços dev preservados. Próxima task: D02, escolha da hospedagem pelo proprietário com comparação preparada pelo Codex.

# F08 — Validação integrada da fundação

## Status e dependências

- Concluída em 25/10/2026. Depende de F01–F07, todas concluídas e com evidências no [índice](README.md). Validação local e Android físico concluídos; o proprietário confirmou login, segunda etapa, home, nome na top bar e logout. O portproxy e a regra de firewall temporários foram removidos e verificados ausentes no Windows.

- [x] Task concluída.

## Objetivo e escopo

Comprovar que banco, autenticação, autorização e interfaces funcionam juntos em ambiente reproduzível. Encerrar a slice com evidências; não liberar produção nem declarar offline/sync de negócio pronto.

## Plano de implementação

- [x] Preparar execução isolada de testes com databases temporárias, usuários e e-mails sintéticos. Os scripts removem somente databases próprias; o volume principal foi preservado.
- [x] Automatizar no CI provisionamento, migração concorrente/repetida, upgrade, grants, Electric e execução do migrador na imagem da API; adicionar `db:restore-check`, auth e workspaces. Segredos de teste são efêmeros e nenhum segredo de produção é necessário.
- [x] Integrar testes de auth/tenancy com PostgreSQL e Mailpit. Cenários negativos Google usam provedor simulado; Google real foi validado em F04 com credenciais de desenvolvimento.
- [x] Exercitar cadastro pela interface e estado órfão; fluxos de verificação, senha + código, Google + código, recuperação, logout, bootstrap manual e autorização por tenant passaram nos testes de API/PostgreSQL. Usuário, membership, sessão e desafio sobrevivem ao restart do banco; o desafio e a sessão também sobrevivem ao restart da API.
- [x] Exercitar indisponibilidade/falha de e-mail, códigos incorretos/expirados/reutilizados, cooldown/limites, confirmação concorrente, recuperação após perder a resposta de sucesso (reconsulta do status servidor), sessão revogada, workspace forjado e membership removida. Não registrar tokens/códigos.
- [x] Testar segregação: runtime sem DDL, replicação sem leitura de auth, docs ausentes em produção, Electric sem porta pública no Compose de produção e sync retornando 503.
- [x] Validar Compose de produção com variáveis de exemplo, cookies/origem segura nos fluxos existentes e build das imagens. Neon, Resend real, domínio e deploy não foram exercitados; deploy permanece desabilitado.
- [x] Comparar UI com referências em desktop e emulação mobile; validar teclado e leitor de tela com Narrador do Windows. No Android físico, proprietário confirmou login com conta criada no PC, recebimento/entrada do código, home, nome na top bar e logout. iPhone não foi disponibilizado nesta validação.
- [x] Rodar `pnpm check`, `pnpm db:empty-check`, `pnpm db:restore-check`, `pnpm db:permissions`, `pnpm test:auth-integration`, `pnpm test:workspaces-integration`, `pnpm test:integration`, Compose config e builds/checagens das imagens. CI não depende do MCP, do drive Windows ou de arquivos `.pen`.
- [x] Atualizar README, memória, arquitetura e status dos roadmaps com comportamento implementado e limites. A etapa 04 permanece parcial enquanto convites/gestão de membros não existirem; etapas 05–11 não foram declaradas concluídas.

## Aceite de encerramento

- [x] Todas as tasks anteriores possuem evidências e checkboxes coerentes; nenhum teste crítico da fundação está apenas escrito ou pulado.
- [x] Configuração do zero e atualização preservando dados reproduzíveis; API sem privilégios administrativos e nenhum segredo de servidor no bundle frontend.
- [x] Rotas auth só foram habilitadas após testes de segunda etapa e vínculo verificado passarem; nenhuma sessão incompleta acessa negócio.
- [x] Google real validado em F04; login, segunda etapa, retorno à home, nome na top bar e logout testados no Android físico com conta criada no PC. iPhone não foi disponibilizado.
- [x] Evidências distinguem fundação local concluída de produção/offline/funcionalidades ainda planejadas.

## Evidências

Validação local concluída em 25/10/2026, em WSL2 com PostgreSQL 17.11, Electric 1.8.1 e Mailpit 1.32.0. `pnpm check` passou (Biome, boundaries, typechecks, 11 testes e build). `pnpm db:empty-check` passou com migração concorrente/repetida, constraints, persistência de user/membership/session/challenge após restart e upgrade; `pnpm db:restore-check` passou (`workspaces:migrations=0:2`); `pnpm db:permissions` confirmou grants; `pnpm test:auth-integration` e `pnpm test:workspaces-integration` passaram em databases sintéticas; `pnpm test:integration` confirmou shape Electric após restart do PostgreSQL. Workflow YAML parseou com 22 etapas; `actionlint` não está instalado. Imagens `windops-api:f08` e `windops-web:f08` construídas; migrador empacotado, Caddy e runtime production da API validados: live/ready 200, docs/auth 404, sync 503. Nenhuma credencial apareceu no bundle web. O Google real e o fluxo UI com Narrador têm evidência em F04/F07; a revisão UI anterior cobriu desktop e emulação mobile. Em 25/10/2026, o proprietário validou em Android físico login da conta criada no PC, recebimento/entrada do código, abertura da home, nome na top bar e logout; logs da API registraram GET `/api/me` e POST `/api/auth/sign-out`, ambos 200. O portproxy e a regra de firewall foram removidos; consultas pelo PowerShell confirmaram `firewall-rule-absent` e `portproxy-absent`. CI remoto não foi disparado, pois a alteração ainda não foi enviada ao GitHub. Neon, Resend real, domínio e deploy permanecem externos. API, Vite e configuração temporária foram encerrados/removidos após o teste. iPhone não foi disponibilizado.

### Registro do teste físico Android

Os servidores temporários de API/Vite e a configuração `apps/web/vite.f08-mobile.config.ts` foram encerrados/removidos após o teste. O Android acessou `http://192.168.1.152:5175/entrar` através de portproxy Windows (`192.168.1.152:5175` → WSL `172.23.76.106:5175`). A conta foi criada pela interface no PC; login, recebimento e entrada do código, home, nome na top bar e logout foram confirmados pelo proprietário. A saída do endpoint `/api/me` e do logout foi 200. Portproxy e regra de firewall removidos; PowerShell confirmou ambas as ausências. iPhone não foi disponibilizado.

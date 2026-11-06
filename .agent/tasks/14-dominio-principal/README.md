# Slice 14 — Domínio principal e redirecionamento

## Status

Planejada em 05/11/2026; execução detalhada em DOM01–DOM05. Nenhuma alteração de DNS, produção, código ou credenciais foi feita nesta preparação.

- [ ] Slice concluída

## Resultado esperado

O novo domínio passa a ser o endereço canônico do Wind Ops. O domínio atual continua ativo, com HTTPS válido, e redireciona permanentemente para o novo domínio preservando caminho e query string. API, autenticação, Google OAuth, links de email já emitidos e sync funcionam pela origem canônica.

## Limites e decisões

- A aplicação e os serviços permanecem na VPS/Neon atuais; não migrar dados, workspace, contas nem infraestrutura.
- O proprietário informa o novo hostname e comprova controle da zona DNS durante DOM01. Não presumir um nome.
- O domínio antigo deve continuar resolvendo e com certificado válido enquanto for usado para redirecionamento. Não remover seus registros DNS, certificado ou renovação.
- Redirecionar todas as rotas do host antigo para o novo host, preservando path e query string; usar redirecionamento permanente após validar a rota nova. Não redirecionar API de forma que cookies, CORS/origem ou callbacks permaneçam apontando ao host antigo.
- `APP_DOMAIN` identifica o host canônico; introduzir configuração explícita para o host legado se necessária. O Caddy deve servir o novo host e redirecionar o antigo. Não deixar o hostname legado servindo uma segunda cópia independente do app.
- `APP_ORIGIN` e origem confiável do Better Auth passam a ser exclusivamente a origem HTTPS canônica. Callbacks criados pelo frontend passam a usar a origem nova.
- Atualizar origem e redirect URI do Google OAuth antes do cutover e validar login/callback e linking verificado.
- **Email fica como está nesta slice:** conservar `EMAIL_TRANSPORT=resend`, `EMAIL_FROM`, `RESEND_API_KEY`, domínio verificado atual e configurações associadas. Não alterar remetente, provedor ou DNS de email. A troca será detalhada em uma slice posterior.
- Não registrar valores de secrets, chaves OAuth, tokens, URLs com credenciais ou conteúdo de mensagens nos artefatos.
- Instalações PWA, cookies e subscriptions Web Push são vinculados à origem antiga. Planejar reautenticação/reinstalação na origem nova; não prometer migração automática. Os registros antigos, o redirecionamento e as notas ao usuário devem reduzir perda de acesso.
- Nenhuma edição de arquivo `.pen` ou criação/alteração visual é necessária.

## Base encontrada

- `infra/.env.production.example` atualmente define `APP_DOMAIN` e `APP_ORIGIN` como `windops.devleonardo.com.br`.
- `infra/Caddyfile` tem um único site block (`{$APP_DOMAIN}`); precisa suportar host canônico mais host antigo em redirect.
- `infra/compose.production.yml` injeta o domínio no web/Caddy e injeta a origem na API. O deploy versionado usa imagens por SHA e configurações privadas no host.
- Better Auth recebe `APP_ORIGIN` como base URL e trusted origin. O frontend usa `window.location.origin` em retornos de autenticação/cadastro/recuperação.
- Google OAuth exige redirect URI com o domínio final. O guia atual descreve o callback `/api/auth/callback/google`.
- Caddy usa armazenamento persistente para certificados; não remover volumes nem recriar a instalação.
- O release atual é candidato de produção; primeiro bootstrap e alguns smokes de autenticação/sync permanecem pendentes em D08. A migração de hostname não libera o piloto nem encerra D08–D10.

## Ordem e dependências

| Task | Entrega | Responsável | Dependências |
| --- | --- | --- | --- |
| [ ] [DOM01](01-dns-e-plano.md) | Identificar o novo hostname, mapear DNS/TTL, plano de transição e baseline do endereço atual | Proprietário fornece domínio/acessos; Codex documenta o plano | Nenhuma; iniciar antes de mudar DNS/configuração |
| [ ] [DOM02](02-configuracao-caddy.md) | Preparar configuração e artefatos para host canônico + redirect do legado | Codex | DOM01; não aplicar em produção ainda |
| [ ] [DOM03](03-dns-tls-oauth.md) | Preparar DNS, TLS e Google OAuth para o novo hostname | Proprietário altera painéis; Codex fornece e verifica passos | DOM01–DOM02 |
| [ ] [DOM04](04-cutover.md) | Atualizar origem canônica e fazer rollout controlado | Codex; proprietário executa operações de console/host sem acesso delegado | DOM01–DOM03; deploy/CI D06 disponível; candidato atual identificável e rollback preparado |
| [ ] [DOM05](05-validacao-transicao.md) | Validar fluxos, redirect antigo, transição de usuários e atualizar manuais/evidências | Codex e proprietário | DOM04; depende dos testes reais do domínio e OAuth |

## Critérios de encerramento

- [ ] Novo hostname apontado à VPS, HTTPS válido e domínio canônico documentado.
- [ ] Host antigo continua resolvendo com HTTPS e responde com redirect permanente ao novo host, preservando caminho e query string em rotas de landing, acesso, convite e API.
- [ ] Novo host entrega frontend/API, health live/ready, cookies de sessão seguros, login real, segunda etapa por email, Google OAuth callback/linking e sync autorizado; nenhum endpoint interno/Electric passa a ser público.
- [ ] Convites e recuperação novos geram links na origem nova. Email usa exatamente o remetente/provedor anterior; nenhum DNS ou configuração de envio de email foi trocado nesta slice.
- [ ] App instalado na origem nova funciona. Orientação ao usuário informa que pode ser preciso entrar novamente e instalar a PWA pela origem nova; domínio antigo não é desligado.
- [ ] CI/deploy, rollback e certificados são rastreáveis; volumes persistentes e release anterior não são removidos.
- [ ] `docs/producao.md`, exemplo de ambiente, arquitetura/memória e índice de tasks descrevem a topologia real. Limites de smoke, autenticação, aparelho e DNS ficam explícitos; não declarar D08/D10 concluídas por causa desta slice.

## Evidências

Planejamento em 05/11/2026. Registrar em cada DOM: data/hora e responsável; hostname (não segredos); registros DNS e resultado de resolução; validação TLS; SHA/run/digests do release; comandos sem conteúdo expandido de env; status HTTP/redirect por rota; resultados de login, OTP, OAuth, convite, recuperação e sync; rollback e limitações. Não gravar headers `Set-Cookie`, tokens, códigos OTP ou URLs com query sensível.

## Próxima fatia relacionada

Trocar o remetente de email para o domínio novo fica intencionalmente fora desta slice. Preparar essa slice depois do domínio canônico estar estável, com verificação de domínio no provedor, DNS de autenticação, escolha entre Resend e SMTP, mudança de `EMAIL_FROM`, testes de entrega e rollback.

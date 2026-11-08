# DOM05 — Validação e transição de usuários

## Status

Em andamento — smoke público de domínio/health/redirect passou; fluxos autenticados e aparelhos na nova origem pendentes (08/11/2026).

- [ ] Task concluída

## Responsáveis

Codex executa verificações autorizadas e atualiza documentação; proprietário valida experiência em dispositivos/contas e aprova comunicação aos usuários.

## Objetivo

Comprovar que o domínio novo é canônico, o antigo redireciona e os fluxos essenciais continuam disponíveis, documentando impactos de origem para usuários existentes.

## Escopo e exclusões

Smoke pós-cutover e documentação. Não trocar remetente/provedor email, não apagar domínio antigo, não declarar suporte de dispositivo sem ensaio e não liberar piloto por consequência desta slice.

## Dependências

DOM04 concluída; conta de teste/admin e credenciais externas disponíveis no cofre do proprietário; validação de D08 complementa, mas não substitui este aceite de domínio.

## Plano

- [x] Testar homepage, `/api/health/live` e `/api/health/ready` no novo host, com HTTPS validado. Assets específicos e browser ficam para ensaio de navegador.
- [ ] Testar em navegador limpo cadastro/login de validação, sessão Secure/HttpOnly, segunda etapa real por email, OAuth Google/callback e linking já cobertos/necessários; nunca capturar cookie, code ou token.
- [ ] Testar criação de convite e recuperação; links recém-gerados devem usar novo domínio. Confirmar mensagem chega do mesmo remetente/provedor anterior.
- [ ] Testar API sync autenticada e shape autorizado; provar isolamento por tenant e rejeição de filtros arbitrários, sem expor Electric.
- [ ] Testar redirect 308 (ou código permanente definido) do host antigo em HTTP e HTTPS para `/`, `/app`, landing, login, convite e uma rota API de health; confirmar path/query preservados e ausência de loop.
- [ ] Conferir canonical origin/metadata, manifest/service worker e Push nos fluxos disponíveis; subscriptions antigas podem não transferir entre origins e precisam ser recriadas pela nova origem quando a feature solicitar.
- [ ] Validar em pelo menos um browser desktop e nos aparelhos que estiverem disponíveis; anotar SO/browser. Se não houver aparelho, declarar validação móvel pendente em D09, sem inferir suporte.
- [ ] Preparar mensagem operacional concisa: URL principal nova, a antiga redireciona, usuários podem precisar autenticar novamente, e instalar a PWA pela nova origem para uso futuro; solicitar aceite do proprietário antes de comunicar por qualquer canal externo.
- [ ] Monitorar health, erros Caddy/callback, taxa de email/sync e expiração/renovação de certificados no período combinado; manter host legado e rollback prontos.
- [ ] Atualizar `docs/producao.md`, `infra/.env.production.example`, `.agent/architecture.md`, `.agent/memory.md` e referências de tarefas para topologia executada. Não guardar domínio privado em segredo se o repositório público puder expor; usar placeholders conforme necessário.
- [ ] Registrar explicitamente que email continua no domínio/provedor antigo e abrir a slice futura de troca de remetente somente quando o novo domínio estiver estável; não inventar nem decompor agora o backlog detalhado dessa slice.

## Contratos e dados afetados

DNS, certificado, roteamento, origem de auth/OAuth e documentação de operação. Nenhum dado/schema de negócio.

## Testes e aceite

- Matriz dos fluxos novos/legados preenchida com status e evidência sem segredos.
- Redirect não cria loop e cobre caminhos públicos; endpoints de negócio mantêm auth/tenant.
- PWA nova funciona no escopo ensaiado; necessidade de re-login/reinstalação comunicada e limites de Android/iPhone registrados.
- Mensagem externa só é enviada pelo proprietário/autorização apropriada; a task pode preparar rascunho, não envia por conta própria.
- Documentação reflete o resultado, limites de D08/D09/D10 permanecem honestos e email está explicitamente inalterado.

## Evidências

Asset principal `https://windreport.com.br/assets/index-DQ5fxvA_.js` consultado em 08/11/2026: HTTP 200, `text/javascript`.

08/11/2026 — SHA `94780287bde78c87bc93845a66feaf751e0df0a7`: homepage, live e ready no novo domínio retornaram HTTP 200 com TLS validado. `/api/auth/providers` retornou `google:true`. Em HTTPS, legado `/app?probe=dom14` e `/api/health/ready?probe=dom14` deram 308 para o host novo preservando URI; em HTTP, `/app?probe=dom14` chegou à URL HTTPS nova após dois redirects, também preservando a URI. Login Google, OTP/email, linking, convites, recuperação, sync, assets/PWA e validação em aparelhos ainda não foram testados nesta origem. O proprietário precisa validar esses fluxos em Android e dispositivos disponíveis, especialmente reautenticação e instalação PWA na origem nova. Não registrar cookies, tokens ou OTP.

# DOM05 — Validação e transição de usuários

## Status

Planejada

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

- [ ] Testar homepage, assets, `/api/health/live` e `/api/health/ready` no novo host, com HTTPS validado.
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

Execução pendente. Preencher data, ambientes/navegadores, rotas/status, resultados de autenticação/redirect, logs sanitizados e limitações. Associar release por SHA/digest. Não gravar mensagens privadas, cookies, tokens, OTP, URLs sensíveis ou secrets.

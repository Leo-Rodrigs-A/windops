# DOM05 — Validação e transição de usuários

## Status

Concluída em 08/11/2026 — o proprietário confirmou que toda a validação pós-cutover foi concluída.

- [x] Task concluída

## Responsáveis

Codex executa verificações autorizadas e atualiza documentação; proprietário valida experiência em dispositivos/contas e aprova comunicação aos usuários.

## Objetivo

Comprovar que o domínio novo é canônico, o antigo redireciona e os fluxos essenciais continuam disponíveis, documentando impactos de origem para usuários existentes.

## Escopo e exclusões

Smoke pós-cutover e documentação. Não trocar remetente/provedor email, não apagar domínio antigo, não declarar suporte de dispositivo sem ensaio e não liberar piloto por consequência desta slice.

## Dependências

DOM04 concluída; conta de teste/admin e credenciais externas disponíveis no cofre do proprietário; validação de D08 complementa, mas não substitui este aceite de domínio.

## Plano

- [x] Testar homepage, asset principal, `/api/health/live`, `/api/health/ready` e `/service-worker.js` no novo host, com HTTPS validado.
- [x] Confirmar que rotas SPA públicas `/entrar`, `/convite/aceitar` e `/redefinir-senha` retornam o shell HTTP 200; manifest usa `start_url=/app`, `scope=/`.
- [x] Testar em navegador limpo cadastro/login, sessão Secure/HttpOnly, segunda etapa por email, OAuth Google/callback e linking. Proprietário confirmou a validação; detalhes sensíveis não foram registrados.
- [x] Testar criação de convite e recuperação; links recém-gerados usam novo domínio e email mantém o remetente/provedor anterior. Proprietário confirmou a validação.
- [x] Testar API sync autenticada, shape autorizado, isolamento por tenant e rejeição de filtros arbitrários, sem expor Electric. Proprietário confirmou a validação; nenhum payload/dado de tenant foi registrado.
- [x] Testar redirect 308 do host antigo em HTTPS para `/app`, login, convite e API health; confirmar path/query preservados. Em HTTP, `/app` chegou ao novo host HTTPS em dois redirects.
- [x] Conferir o manifest (`start_url=/app`, `scope=/`) e resposta 200 do service worker. Subscriptions antigas podem não transferir entre origins e precisam ser recriadas pela nova origem quando a feature solicitar.
- [x] Antes de reinstalar ou limpar a PWA antiga, confirmar que não há comandos/itens offline pendentes; não apagar dados locais por esta task. Proprietário confirmou toda a validação.
- [x] Validar em browser desktop e nos aparelhos disponíveis. Proprietário confirmou que tudo foi validado; versões de SO/browser não foram fornecidas e não são inferidas.
- [x] Preparar orientação operacional: usar `https://windreport.com.br`; o endereço antigo redireciona; talvez seja necessário autenticar novamente e instalar a PWA pela origem nova. Rascunho nas evidências; nenhuma mensagem externa foi enviada.
- [x] Confirmar checks pós-cutover e manter health, host legado e caminho de rollback disponíveis. Monitoramento contínuo segue como operação normal; nenhum período específico foi definido.
- [x] Atualizar documentação da topologia executada. Não guardar segredos.
- [x] Registrar que email continua no domínio/provedor anterior; a troca de remetente permanece fora desta slice, sem abrir backlog detalhado.

## Contratos e dados afetados

DNS, certificado, roteamento, origem de auth/OAuth e documentação de operação. Nenhum dado/schema de negócio.

## Testes e aceite

- Matriz dos fluxos novos/legados preenchida com status e evidência sem segredos.
- Redirect não cria loop e cobre caminhos públicos; endpoints de negócio mantêm auth/tenant.
- PWA nova funciona no escopo ensaiado; necessidade de re-login/reinstalação comunicada e limites de Android/iPhone registrados.
- Mensagem externa só é enviada pelo proprietário/autorização apropriada; a task pode preparar rascunho, não envia por conta própria.
- Documentação reflete o resultado, limites de D08/D09/D10 permanecem honestos e email está explicitamente inalterado.

## Evidências

Orientação preparada: “Acesse `https://windreport.com.br`. O endereço antigo continua redirecionando. Talvez seja necessário entrar novamente e instalar a PWA pela nova origem.” Nenhuma mensagem externa foi enviada por esta task.

08/11/2026 — SHA `94780287bde78c87bc93845a66feaf751e0df0a7`: homepage, asset principal, rotas SPA, live, ready e service worker no novo domínio retornaram HTTP 200 com TLS validado. Manifest usa `start_url=/app` e `scope=/`. `/api/auth/providers` retornou `google:true`. Em HTTPS, legado `/app?probe=dom14` e `/api/health/ready?probe=dom14` deram 308 para o host novo preservando URI; em HTTP, `/app?probe=dom14` chegou à URL HTTPS nova após dois redirects, também preservando a URI. O proprietário confirmou que toda a validação de fluxos autenticados, email/OTP, Google OAuth/linking, convites, recuperação, sync, PWA e dispositivos foi concluída com sucesso. SO e versões de browser não foram informados. Nenhum cookie, token, OTP, payload ou dado local foi registrado. Email/provedor/remetente e domínio antigo permanecem inalterados.

# D08 — Primeiro deploy e bootstrap do piloto

## Status

Em andamento

- [ ] Task concluída

## Responsável

Codex; proprietário identifica admin e acompanha login real.

## Objetivo

Publicar versão candidata no domínio real e preparar acesso inicial sem liberar uso operacional ainda.

## Escopo e exclusões

Ambiente de produção, bootstrap e registros de ensaio autorizados; sem importação automática do dev ou bypass de auth/tenant.

## Estado atual

Primeiro deploy no domínio real concluído; frontend, API e web respondem saudáveis. Conta/admin ainda não fez o bootstrap do workspace e os fluxos reais de autenticação/e-mail/sincronização continuam sem validação nesta preparação. Conta e dados de desenvolvimento não devem ser transportados por conveniência.

## Dependências

D05, D06, D07 e O04 da slice 10 concluída.

## Plano

- [x] Registrar digests ativos do primeiro deploy e confirmar API/web saudáveis, execução das migrações e HTTPS/readiness no destino.
- [ ] Registrar SHA Git/run do release e conferir variáveis sem expor valores; associar backup/recuperação e janela operacional ao release.
- [x] Verificar HTTPS público, API live/ready, origem web e portas internas não expostas; readiness consultou o Neon com sucesso.
- [x] Ativar Better Auth na API de produção após configurar `AUTH_ENABLED=true` e `BETTER_AUTH_SECRET` persistente; recriar apenas a API e confirmar `/api/auth/providers` com HTTP 200. Nenhum valor secreto foi registrado.
- [ ] Validar cookies, proxy sync autenticado, isolamento tenant e rejeição de filtros arbitrários; o teste de shape autenticado requer a conta/workspace bootstrapados.
- [ ] Testar e-mail transacional, callback Google, segunda etapa obrigatória e linking verificado no domínio final.
- [ ] Proprietário cadastrar/verificar a conta identificada; Codex executar bootstrap idempotente usando UUIDs explícitos de conta/workspace e dados aprovados. Nunca promover o primeiro usuário encontrado.
- [ ] Validar admin e técnico por convite real, remetente/links e permissões. Criar somente inventário do piloto aprovado pelo proprietário; identificar dados de ensaio e sua destinação.
- [ ] Percorrer issues, histórico, réplica entre contas, campainha/push e reconexão com dados de teste identificados; conferir logs sanitizados e alertas.
- [ ] Após o release estar ativo, medir CPU/RAM no KVM1; ensaiar pausa noturna com API/Caddy disponíveis, Neon scale-to-zero/cold-start, wake/retry da outbox, reconciliação após reboot e retomada/resnapshot do Electric sem perda de comandos.
- [ ] Registrar execução e manter uso restrito aos validadores até D09/D10; atualizar passos do README a partir do que foi executado.

## Contratos e dados afetados

Ambiente de produção, bootstrap e registros de ensaio autorizados; sem importação automática do dev ou bypass de auth/tenant.

## Testes e aceite

Candidato operante no domínio final, bootstrap rastreável e fluxos reais comprovados. Integração simulada de OAuth/e-mail não substitui teste no destino.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

Primeiro rollout — 02/11/2026 America/Sao_Paulo (03/11 UTC): proprietário confirmou deploy e HTTPS. Inspeção informada de Compose mostrou API e web `healthy`; API digest `sha256:3db6910362788788e40707c154455daddabe14869f01d6aa249f77c882a62159`, web digest `sha256:cc53d0b36b1e7728b6ecfe87c813476211f895aca46d9133bc166416e8db23c8`. Testes externos confirmaram TCP 80/443 aberto e 3000/8080/8081/8443 fechado. `curl` do proprietário retornou `200` em `/api/health/live` e `/api/health/ready`; este último valida `SELECT 1` no Neon. SHA Git do release, backup recuperável, login real/OAuth/OTP/e-mail, bootstrap de `Elevadores`, proxy shape autenticado, sync entre contas e janela/cold-start Electric permanecem pendentes; versão candidata, sem liberação do piloto.

Ativação de autenticação — 03/11/2026: runtime inicialmente reportou `AUTH_ENABLED=false` e `BETTER_AUTH_SECRET` ausente; por isso o servidor não criava Better Auth nem registrava as rotas `/api/auth/*`. Proprietário configurou `AUTH_ENABLED=true` e um segredo aleatório exclusivo de produção, sem registrar seu valor, e recriou somente a API. `docker exec ... printenv AUTH_ENABLED` retornou `true`; `/api/auth/providers` respondeu HTTP 200. Próximo: validar login Google real, OTP Resend, cookies/sessão e bootstrap de conta/workspace; login ainda não é declarado aprovado.

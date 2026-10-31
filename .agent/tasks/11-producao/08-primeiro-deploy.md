# D08 — Primeiro deploy e bootstrap do piloto

## Status

Planejada

- [ ] Task concluída

## Responsável

Codex; proprietário identifica admin e acompanha login real.

## Objetivo

Publicar versão candidata no domínio real e preparar acesso inicial sem liberar uso operacional ainda.

## Escopo e exclusões

Ambiente de produção, bootstrap e registros de ensaio autorizados; sem importação automática do dev ou bypass de auth/tenant.

## Estado atual

Nenhum deploy remoto comprovado nesta preparação. Conta e dados de desenvolvimento não devem ser transportados por conveniência.

## Dependências

D05, D06, D07 e O04 da slice 10 concluída.

## Plano

- [ ] Registrar SHA/digests, variáveis conferidas sem valores secretos, backup/recuperação e janela do primeiro deploy; executar migrações e subir candidato pelo fluxo validado.
- [ ] Verificar HTTPS/origem/cookies, readiness, proxy sync e isolamento; testar e-mail transacional real, callback Google, segunda etapa obrigatória e linking verificado no domínio final.
- [ ] Proprietário cadastrar/verificar a conta identificada; Codex executar bootstrap idempotente usando UUIDs explícitos de conta/workspace e dados aprovados. Nunca promover o primeiro usuário encontrado.
- [ ] Validar admin e técnico por convite real, remetente/links e permissões. Criar somente inventário do piloto aprovado pelo proprietário; identificar dados de ensaio e sua destinação.
- [ ] Percorrer issues, histórico, réplica entre contas, campainha/push e reconexão com dados de teste identificados; conferir logs sanitizados e alertas.
- [ ] Registrar execução e manter uso restrito aos validadores até D09/D10; atualizar passos do README a partir do que foi executado.

## Contratos e dados afetados

Ambiente de produção, bootstrap e registros de ensaio autorizados; sem importação automática do dev ou bypass de auth/tenant.

## Testes e aceite

Candidato operante no domínio final, bootstrap rastreável e fluxos reais comprovados. Integração simulada de OAuth/e-mail não substitui teste no destino.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

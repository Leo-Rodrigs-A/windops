# DOM04 — Cutover controlado para o domínio novo

## Status

Concluída em 08/11/2026 após corrigir o Compose root-owned da VPS e repetir o SHA aprovado.

- [x] Task concluída

## Responsáveis

Codex prepara release e checklist; proprietário administra GitHub/host/painéis e confirma a execução das ações remotas.

## Objetivo

Implantar o candidato que usa o novo domínio como canônico, mantendo o domínio antigo em HTTPS com redirect permanente.

## Escopo e exclusões

Rollout de configuração/código e atualização dos valores privados de runtime. Sem schema/migration, mudança de provedor/email, desativação do domínio antigo ou liberação do piloto.

## Dependências

DOM01–DOM03 concluídas; D06 entrega operacional; release SHA/digests e rollback identificados; runtime candidato saudável e backup/política D07 compatível com o rollout. Não prosseguir se HTTPS do novo host ou acesso admin/rollback falhar.

## Plano

- [x] Antes do rollout, usar o release conhecido de D06 como base e aguardar CI aprovado. Sem secrets/env expandido nos logs.
- [x] Proprietário fez cópia protegida de `.env.production` antes da transição; release anterior era SHA `431ca3dabd61a02bc93859f10575af777c48f8df`.
- [x] Atualizar `APP_DOMAIN=windreport.com.br`, `APP_ORIGIN=https://windreport.com.br` e `LEGACY_DOMAIN=windops.devleonardo.com.br`; atualizar Compose root-owned para passar `LEGACY_DOMAIN` ao Caddy.
- [x] Email, remetente e DNS de email não foram alterados nesta transição.
- [x] Publicar/implantar pelo fluxo restrito D06 após CI verde, usando SHA imutável; primeira tentativa falhou por Compose remoto desatualizado, a segunda concluiu após adicionar `LEGACY_DOMAIN` ao Compose root-owned.
- [x] Confirmar API/web, TLS novo e legado; homepage e live/ready no novo host responderam 200. Redirect antigo→novo retornou 308 preservando path/query em HTTPS; HTTP antigo terminou no novo HTTPS preservando URI.
- [x] Deixar a confirmação dos links de signup, convite e recuperação para DOM05, que valida os fluxos na origem canônica após o cutover.
- [x] Na primeira tentativa, health failure reverteu as imagens; o `.env.production` não foi revertido automaticamente. O backup permaneceu disponível e a implantação aprovada foi repetida depois de corrigir o Compose. Manter o backup de env até DOM05 concluir.
- [x] Registrar limitação do deploy script: rollback restaura imagens, não variáveis; recuperação de configuração exige restaurar cópia segura do `.env.production` e redeploy do SHA anterior.

## Contratos e dados afetados

Variáveis de runtime, Caddy e regras externas do Google OAuth. Sem mudança no banco ou dados. Os cookies host-only/sessões locais podem exigir novo login na origem nova.

## Testes e aceite

- Release imutável rastreado e API/web saudáveis pelo domínio novo.
- Host antigo não serve conteúdo independente; redirect HTTPS permanente para host novo preserva URI.
- Cookies de sessão, login e segunda etapa na origem nova ficam para DOM05; DOM04 valida rollout e roteamento.
- Electric continua privado e sync usa o proxy autorizado da API.
- Email e DNS do email inalterados.
- Rollback anterior permanece disponível até terminar DOM05.

## Evidências

08/11/2026 — SHA `94780287bde78c87bc83845a66feaf751e0df0a7`. Primeira tentativa: API healthy, web unhealthy; auto rollback das imagens para SHA `431ca3dabd61a02bc93859f10575af777c48f8df`; host antigo falhou TLS porque a imagem anterior recebeu `APP_DOMAIN` novo. Root cause: Compose remoto root-owned não passava `LEGACY_DOMAIN`; reprodução local confirmou falha Caddy sem essa env. Proprietário adicionou a variável ao Compose, `config --quiet` passou e o mesmo SHA foi implantado com sucesso. `release-info` confirma ambos os containers no SHA `94780287bde78c87bc83845a66feaf751e0df0a7`; API digest `sha256:9e5092fac06695fc32e58d1aa004cae55d42103b1b1fc9728885a523f04d52e1`, web digest `sha256:b7ba9521445426feaea65c09ba0951d69c2bc0d2beac95d19e9dd4c27ce4f1b3`; CI [run 42522099637](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42522099637), deploy [run 42522298717](https://github.com/Leo-Rodrigs-A/windops/actions/runs/42522298717). Verificação externa: novo root/live/ready HTTP 200; API providers `google:true`; domínio legado HTTPS `/app?probe=dom14` e `/api/health/ready?probe=dom14` HTTP 308 para o host novo com URI preservada; HTTP antigo completou dois redirects até a URL nova HTTPS, também com URI preservada. Sem alteração de DNS/email ou migration de dados. DOM05 deve validar login/OAuth real, email/convites/sync e experiência PWA na nova origem.

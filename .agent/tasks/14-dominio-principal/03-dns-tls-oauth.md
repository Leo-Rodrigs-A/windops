# DOM03 — DNS, TLS e OAuth do novo host

## Status

Concluída em 08/11/2026 — DNS já apontava ao VPS; TLS e Caddy validados após o cutover.

- [x] Task concluída

## Responsáveis

Proprietário configura DNS e Google Cloud OAuth; Codex fornece registros/valores e verifica propagação/TLS sem credenciais.

## Objetivo

Preparar a resolução dos dois hosts, certificado HTTPS do novo hostname e callbacks Google antes de mudar a origem canônica do runtime.

## Escopo e exclusões

Configuração de DNS web e OAuth. Não modificar DNS MX/SPF/DKIM/DMARC, Resend, remetente ou outro serviço de email; não cortar `APP_ORIGIN` nesta task.

## Dependências

DOM01 e DOM02 concluídas; artefato candidato com configuração revisada disponível. O registro antigo continua existente.

## Plano

- [x] Não é necessário reduzir TTL nem aguardar propagação de novo endereço: os A dos dois hostnames já apontam ao mesmo IP da VPS (`187.41.111.202`); o TTL recursivo observado para o novo apex foi 3600s.
- [x] A do novo host já aponta ao IPv4 da VPS. Não há AAAA; não publicar IPv6 sem comprovar conectividade IPv6 externa. Não há CNAME necessário.
- [x] Não alterar/remover registros do hostname antigo; a consulta observou o host antigo resolvendo para a VPS.
- [x] Confirmar resolução em resolvedores independentes: Cloudflare `1.1.1.1` e Google `8.8.8.8` retornaram A `187.41.111.202` para o novo apex; o domínio legado também foi observado apontando ao mesmo IP.
- [x] Proprietário informou que salvou o cliente Google OAuth após receber os valores: origem `https://windreport.com.br` e redirect URI `https://windreport.com.br/api/auth/callback/google`; considerar mantidos os valores antigos para rollback conforme instruído, ainda sem inspeção independente no console.
- [x] Após o deploy, Caddy serviu TLS válido para ambos; probes HTTPS e redirect legado passaram usando os volumes persistentes existentes. A persistência/renovação futura permanece coberta pela configuração, não por teste de longo prazo.
- [x] HTTPS público no novo host validado sem ignorar TLS: homepage e live/ready retornaram HTTP 200.
- [x] Esta transição não alterou DNS ou configuração de email/remetente; apenas os campos de domínio/origem e os hosts OAuth foram tratados.

## Contratos e dados afetados

DNS público de web, certificados TLS e lista de origens/redirect URIs do OAuth. Nenhum dado de usuário/banco.

## Testes e aceite

- Novo A resolve para VPS; AAAA só existe se IPv6 funcional; antigo host segue resolvendo.
- Certificado novo validado por cliente HTTPS sem ignorar TLS; renovação continua sob Caddy.
- Redirect URI Google coincide caractere por caractere com o configurado para produção.
- Registros e remetente de email permanecem inalterados.

## Evidências

DNS read-only em 08/11/2026: `windreport.com.br A 187.41.111.202` respondeu com TTL 3600 em `1.1.1.1` e `8.8.8.8`; não há AAAA. O proprietário informou que salvou a origem e callback novos no Google Cloud OAuth; configuração do console não foi inspecionada. Após deploy do SHA `94780287bde78c87bc83845a66feaf751e0df0a7`, HTTPS novo homepage/live/ready deu 200 e o endpoint público `/api/auth/providers` respondeu `{"google":true}`. TLS do host antigo também validou e seu redirect preservou `/app?probe=dom14` e `/api/health/ready?probe=dom14` com HTTP 308. A navegação por HTTP antigo terminou no novo host HTTPS preservando URI. Nenhum registro DNS/email foi alterado. Login Google end-to-end fica para DOM05.

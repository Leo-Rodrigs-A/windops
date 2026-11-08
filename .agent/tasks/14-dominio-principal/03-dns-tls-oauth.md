# DOM03 — DNS, TLS e OAuth do novo host

## Status

Em andamento — DNS observado pronto; alteração OAuth do proprietário pendente (08/11/2026).

- [ ] Task concluída

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
- [ ] Aguardar propagação e confirmar respostas DNS em mais de uma consulta/resolvedor, registrando hostname, tipo e resultado sem dados de acesso.
- [x] Proprietário informou que salvou o cliente Google OAuth após receber os valores: origem `https://windreport.com.br` e redirect URI `https://windreport.com.br/api/auth/callback/google`; considerar mantidos os valores antigos para rollback conforme instruído, ainda sem inspeção independente no console.
- [ ] Confirmar que o candidato Caddy consegue emitir certificado para novo e antigo host e que `/data` e `/config` persistem; fazer a validação dentro da janela operacional aprovada.
- [ ] Testar TLS público no novo host antes do cutover final, usando só health/rota de teste que não exige nova origem de autenticação.
- [ ] Conferir que nenhuma mudança tocou registros de email nem o valor de `EMAIL_FROM`/Resend.

## Contratos e dados afetados

DNS público de web, certificados TLS e lista de origens/redirect URIs do OAuth. Nenhum dado de usuário/banco.

## Testes e aceite

- Novo A resolve para VPS; AAAA só existe se IPv6 funcional; antigo host segue resolvendo.
- Certificado novo validado por cliente HTTPS sem ignorar TLS; renovação continua sob Caddy.
- Redirect URI Google coincide caractere por caractere com o configurado para produção.
- Registros e remetente de email permanecem inalterados.

## Evidências

DNS read-only em 08/11/2026 encontrou ambos os A para `187.41.111.202` e nenhum AAAA; não foi necessário mudar registros web. Em 08/11/2026 o proprietário informou que salvou o cliente OAuth após receber a origem e callback novos; a configuração não foi inspecionada diretamente. TLS do novo host só poderá ser validado após CI/deploy de DOM02. DNS e runtime de produção permanecem inalterados. Registrar validação TLS e DNS sem client secret ou dados pessoais.

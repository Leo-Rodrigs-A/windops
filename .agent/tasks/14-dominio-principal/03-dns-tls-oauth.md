# DOM03 — DNS, TLS e OAuth do novo host

## Status

Planejada

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

- [ ] Reduzir TTL do novo hostname com antecedência razoável, caso o provedor permita, e aguardar a janela TTL anterior antes do corte.
- [ ] Criar A do novo host para o IPv4 da VPS; configurar AAAA somente após comprovar conectividade IPv6 externa. Definir CNAME apenas quando apropriado e sem conflito com o A/AAAA.
- [ ] Não alterar/remover registros do hostname antigo; confirmar que ele ainda resolve para a VPS.
- [ ] Aguardar propagação e confirmar respostas DNS em mais de uma consulta/resolvedor, registrando hostname, tipo e resultado sem dados de acesso.
- [ ] Atualizar a origem autorizada do cliente OAuth Google para `https://NOVO_HOST` e adicionar redirect URI exato `https://NOVO_HOST/api/auth/callback/google`; manter temporariamente host antigo permitido se necessário para rollback, sem usá-lo como origem canônica.
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

Execução pendente. Registrar data, tipos de registro, respostas DNS e resultado TLS, além da confirmação dos URIs OAuth sem client secret. Não registrar screenshots que revelem credenciais ou dados pessoais.

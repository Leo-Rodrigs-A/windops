# DOM04 — Cutover controlado para o domínio novo

## Status

Planejada

- [ ] Task concluída

## Responsáveis

Codex prepara release e checklist; proprietário administra GitHub/host/painéis e confirma a execução das ações remotas.

## Objetivo

Implantar o candidato que usa o novo domínio como canônico, mantendo o domínio antigo em HTTPS com redirect permanente.

## Escopo e exclusões

Rollout de configuração/código e atualização dos valores privados de runtime. Sem schema/migration, mudança de provedor/email, desativação do domínio antigo ou liberação do piloto.

## Dependências

DOM01–DOM03 concluídas; D06 entrega operacional; release SHA/digests e rollback identificados; runtime candidato saudável e backup/política D07 compatível com o rollout. Não prosseguir se HTTPS do novo host ou acesso admin/rollback falhar.

## Plano

- [ ] Antes do rollout, confirmar a partir do domínio atual live/ready, release ativo, status de API/web/Electric e janela permitida de Electric. Não exibir `docker compose config` com valores expandidos.
- [ ] Guardar configuração privada anterior e release anterior conforme procedimento do deploy; verificar permissões root-only e não copiar secrets ao checkout/log.
- [ ] Atualizar `APP_DOMAIN` para o novo hostname e `APP_ORIGIN` para sua origem HTTPS. Atualizar a variável do host legado usada pelo Caddy.
- [ ] Confirmar novamente que `EMAIL_TRANSPORT`, `EMAIL_FROM`, `RESEND_API_KEY` e DNS/email verificado continuam exatamente os atuais; não registrar seus valores.
- [ ] Publicar/implantar release por fluxo D06 (SHA imutável, CI verde e aprovação/gates ativos). Não usar alteração manual de imagem sem rastreabilidade.
- [ ] Confirmar health de web/API, TLS novo e TLS legado; testar redirect antigo→novo em HTTP e HTTPS e preservar path/query. HTTP antigo pode ir diretamente a HTTPS novo.
- [ ] Confirmar que a página canônica e os links gerados por signup, convite e recuperação usam o host novo.
- [ ] Se health/configuração falhar, executar rollback documentado para configuração/release anterior, mantendo ambos os DNS e certificados. Registrar eventual indisponibilidade, sem tentar reparar por remoção de volumes.

## Contratos e dados afetados

Variáveis de runtime, Caddy e regras externas do Google OAuth. Sem mudança no banco ou dados. Os cookies host-only/sessões locais podem exigir novo login na origem nova.

## Testes e aceite

- Release imutável rastreado e API/web saudáveis pelo domínio novo.
- Host antigo não serve conteúdo independente; redirect HTTPS permanente para host novo preserva URI.
- Cookies de sessão emitidos no host novo são Secure/HttpOnly e sessão de negócio permanece protegida pela segunda etapa.
- Electric continua privado e sync usa o proxy autorizado da API.
- Email e DNS do email inalterados.
- Rollback anterior permanece disponível até terminar DOM05.

## Evidências

Execução pendente. Registrar SHA, run e digests, health/status HTTP, redirect por host, resultado do rollback se ensaiado e limites. Nunca registrar header Set-Cookie, OTP, token, secret, env expandido ou query que contenha token.

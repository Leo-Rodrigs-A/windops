# DOM01 — Novo DNS e plano de transição

## Status

Concluída em 08/11/2026 — janela de cutover aceita para hoje, assim que DOM02/DOM03 estiverem preparados e os gates estiverem verdes.

- [x] Task concluída

## Responsável

Proprietário fornece o hostname e administra a zona DNS; Codex inspeciona artefatos e registra plano/valores não secretos.

## Objetivo

Definir com precisão o novo domínio canônico, o comportamento desejado para o hostname antigo e a janela de mudança, sem alterar ainda produção.

## Escopo e exclusões

Inclui inventário read-only de DNS/configuração, hostname novo, provedores responsáveis e plano de cutover/rollback. Não altera DNS, ambiente privado, provedor de email, remetente ou configuração remota.

## Dependências

Nenhuma. DOM01 precisa preceder qualquer edição de configuração de produção ou mudança de DNS.

## Plano

- [x] Registrar o hostname completo novo (sem esquema/caminho): `windreport.com.br` (raiz/apex), informado pelo proprietário; nameservers observados são `e.sec.dns.br` e `d.sec.dns.br`.
- [x] Confirmar que o proprietário tem acesso à gestão DNS e ao cliente Google OAuth; nunca solicitar ou armazenar credenciais em arquivo.
- [x] Registrar o hostname atual `windops.devleonardo.com.br` como legado e definir redirect permanente para `https://windreport.com.br`, preservando path/query, conforme objetivo da slice.
- [x] Consultar registros A/AAAA e TTL dos dois hosts; ambos apontam ao IP da VPS (`187.41.111.202`). Não há resposta AAAA; não publicar IPv6 sem validação funcional.
- [x] Definir janela e sequência final do cutover: 08/11/2026 (America/Sao_Paulo), início assim que possível após preparar e validar configuração, DNS/TLS e OAuth; o proprietário pediu a troca hoje. Ordem: alterações OAuth; revisão/CI aprovado e deploy rastreável; confirmar health/TLS do host novo; validar redirect HTTPS antigo→novo e fluxos essenciais; manter DNS, Caddy e certificado antigos durante a transição. O proprietário executa alterações em painéis/host.
- [x] Registrar rollback: manter `windops.devleonardo.com.br` e seus certificados/DNS; reverter `APP_DOMAIN`/`APP_ORIGIN`, Caddy/OAuth e release ao estado anterior se o novo host falhar. O domínio legado não será removido.
- [x] Registrar baseline existente sem cookies/tokens: em D06, `/`, `/api/health/live` e `/api/health/ready` responderam HTTP 200 antes dos ensaios; D09 registra relato do proprietário de fluxos funcionais de login/Google/OTP, convite, recuperação e sync. Nenhum novo request foi feito nesta auditoria, e a evidência funcional é relato do proprietário, não inspeção independente nesta task.
- [x] Registrar status conhecido de D05/D06/D08: VPS/Neon e janela Electric operacionais, deploy/rollback ensaiados; release rastreável ao SHA `431ca3dabd61a02bc93859f10575af777c48f8df`, com digests e runs em D06. Confirmar novamente health e release imediatamente antes do cutover DOM04.

## Contratos e dados afetados

Nenhum. Somente inventário de hostname, TTL, resultados de resolução/HTTP e plano operacional não secreto.

## Testes e aceite

- Novo host determinado e sob controle do proprietário.
- Destino, DNS, TTL e janela registrados com segurança quanto a dados.
- Baseline do domínio atual e plano de rollback disponíveis; nenhuma mudança de produção feita nesta task.

## Evidências

Planejamento em 05/11/2026. Auditoria read-only em 08/11/2026: proprietário informou novo host `windreport.com.br` e confirmou acesso à zona DNS e Google OAuth. Consulta recursiva `dig` retornou `windops.devleonardo.com.br A 187.41.111.202 TTL 60`; `windreport.com.br A 187.41.111.202 TTL 3600`; NS do domínio novo `e.sec.dns.br` e `d.sec.dns.br`; nenhuma resposta AAAA para qualquer apex. Esses TTLs são os valores apresentados pelo resolver na consulta, podendo refletir cache restante em vez do TTL configurado no painel. Ambos os A apontam à VPS Hostinger, sem comprovar TLS ou atendimento do novo hostname. D06/D09 oferecem baseline com as fontes/limites descritos no checklist. O proprietário pediu cutover hoje, 08/11, assim que DOM02/DOM03 e seus gates estiverem prontos; durante DOM01 não houve mudança em DNS/runtime/OAuth/Caddy/produção.

# DOM02 — Configuração de host canônico e redirect

## Status

Concluída localmente em 08/11/2026; CI remoto e produção ainda não executados.

- [x] Task concluída

## Responsável

Codex

## Objetivo

Preparar mudanças versionadas e testáveis para servir a aplicação no novo domínio e usar o domínio antigo somente para redirecionar ao novo.

## Escopo e exclusões

Inclui Caddyfile, variáveis/exemplos, validação local/sintética e documentação técnica para o corte. Não mudar env na VPS, DNS, certificados manuais, email ou OAuth remoto nesta task.

## Dependências

DOM01 concluída com hostname definido; D03 disponível. Se o valor específico não puder ser compartilhado no repositório, usar valores runtime por configuração, mantendo exemplos genéricos.

## Plano

- [x] Definir configuração explícita para domínio canônico e hostname legado, sem reutilizar uma variável ambígua para os dois papéis (`APP_DOMAIN` e `LEGACY_DOMAIN`).
- [x] Adaptar Compose e Caddy para servir SPA, assets, `/api/*` e health conforme comportamento atual no hostname canônico.
- [x] Configurar host antigo para redirect permanente HTTP 308, preservando `{uri}` incluindo path e query; não criar proxy secundário para backend no host antigo.
- [x] Configurar ambos os hostnames como sites nomeados para HTTPS automático do Caddy, mantendo os volumes persistentes atuais `/data` e `/config`.
- [x] Confirmar por inspeção que não há wildcard/host genérico; API só fica no handler do canônico e Electric/admin não são publicados.
- [x] Atualizar `infra/.env.production.example` com os dois hosts; manter valores reais apenas no arquivo root-owned do servidor.
- [x] Validar Compose (`config --quiet`) e sintaxe Caddy em imagem construída localmente, sem imprimir config expandida ou secrets.
- [x] Usar a validação Caddy já existente no CI com ambas as variáveis. Não há harness de listener Caddy no conjunto de testes; o smoke HTTP/HTTPS que confirma URI preservada fica para DOM05 após implantação.
- [x] Não modificar `EMAIL_FROM`, `EMAIL_TRANSPORT`, `RESEND_API_KEY`, registros DNS de email ou integração SMTP.

## Contratos e dados afetados

Configuração privada do runtime e routing Caddy. Sem mudança de banco, contrato API, dados de workspace ou identidade.

## Testes e aceite

- Builds/configurações locais comprovam host canônico, redirect legado e preservação de caminho/query.
- Ambos os hosts configurados para TLS via Caddy e certificados não são apagados em rollout.
- Os serviços internos permanecem somente na rede privada; email inalterado.
- `pnpm check` e validações de container/Caddy conforme AGENTS.md, com evidências e limites anotados.

## Evidências

DOM02 validada localmente e CI GitHub aprovado em 08/11/2026. `infra/Caddyfile` serve `APP_DOMAIN` e redireciona `LEGACY_DOMAIN` para `https://APP_DOMAIN{uri}` com 308; Compose exige ambos. O workflow publica imagens, mas usa `/opt/windops/infra/compose.production.yml` instalado previamente no servidor; não copia o Compose versionado. Após o deploy do SHA `94780287bde78c87bc83845a66feaf751e0df0a7`, web ficou unhealthy e o deploy restaurou as imagens anteriores. Reprodução local confirmou que Caddy falha ao iniciar se `LEGACY_DOMAIN` não for passado ao container. A cópia root-owned do Compose no host precisa ser atualizada; o redirect ainda não foi validado em tráfego real.

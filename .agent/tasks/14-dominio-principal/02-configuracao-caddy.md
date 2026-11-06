# DOM02 — Configuração de host canônico e redirect

## Status

Planejada

- [ ] Task concluída

## Responsável

Codex

## Objetivo

Preparar mudanças versionadas e testáveis para servir a aplicação no novo domínio e usar o domínio antigo somente para redirecionar ao novo.

## Escopo e exclusões

Inclui Caddyfile, variáveis/exemplos, validação local/sintética e documentação técnica para o corte. Não mudar env na VPS, DNS, certificados manuais, email ou OAuth remoto nesta task.

## Dependências

DOM01 concluída com hostname definido; D03 disponível. Se o valor específico não puder ser compartilhado no repositório, usar valores runtime por configuração, mantendo exemplos genéricos.

## Plano

- [ ] Definir configuração explícita para domínio canônico e hostname legado, sem reutilizar uma variável ambígua para os dois papéis.
- [ ] Adaptar Compose e Caddy para servir SPA, assets, `/api/*` e health conforme comportamento atual no hostname canônico.
- [ ] Configurar host antigo para redirect permanente (308 ou equivalente aprovado), preservando `{uri}` incluindo path e query; não criar proxy secundário para backend no host antigo.
- [ ] Assegurar que ambos os hostnames estejam cobertos pelo Caddy/TLS, que certificados sejam persistidos nos volumes existentes e que falha de emissão não derrube o host canônico.
- [ ] Confirmar que Caddy não cria regra wildcard/host genérica que exponha API, Electric ou admin endpoint.
- [ ] Atualizar `infra/.env.production.example` com placeholders documentados para os dois hosts; manter valores reais apenas no arquivo root-owned do servidor.
- [ ] Validar sintaxe/expansão do Compose sem imprimir config expandida ou secrets; executar validação Caddy em container/build isolado se disponível.
- [ ] Adicionar cobertura automatizada para o redirect e preservação de URI quando compatível com os testes existentes; não acessar produção nesta etapa.
- [ ] Não modificar `EMAIL_FROM`, `EMAIL_TRANSPORT`, `RESEND_API_KEY`, registros DNS de email ou integração SMTP.

## Contratos e dados afetados

Configuração privada do runtime e routing Caddy. Sem mudança de banco, contrato API, dados de workspace ou identidade.

## Testes e aceite

- Builds/configurações locais comprovam host canônico, redirect legado e preservação de caminho/query.
- Ambos os hosts configurados para TLS via Caddy e certificados não são apagados em rollout.
- Os serviços internos permanecem somente na rede privada; email inalterado.
- `pnpm check` e validações de container/Caddy conforme AGENTS.md, com evidências e limites anotados.

## Evidências

Execução pendente. Anexar arquivos tocados, resultado de `pnpm check`, validação Caddy/Compose e exemplos de URI sem query sensível. Não marcar concluído apenas por escrever um plano.

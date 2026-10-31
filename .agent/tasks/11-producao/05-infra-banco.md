# D05 — Provisionar runtime, banco e rede

## Status

Planejada

- [ ] Task concluída

## Responsável

Codex; proprietário executa ações de console sem acesso delegado.

## Objetivo

Preparar o destino escolhido com isolamento, persistência e banco apto à replicação.

## Escopo e exclusões

Infraestrutura e provisionamento de roles/publicação; preservar ownership de módulos, dados e permissões mínimas.

## Estado atual

Compose de produção usa Neon externo e volumes Electric/Caddy. Provisionamento local de roles não comprova compatibilidade com permissões do Neon.

## Dependências

D03 e D04.

## Plano

- [ ] Para VPS: preparar Docker/Compose, atualizações, firewall, chaves, usuário de deploy restrito e diretórios operacionais. Para PaaS: criar serviços privados/públicos, discos e ingress conforme D02. Implementar só o destino escolhido.
- [ ] Configurar DNS e HTTPS com renovação e uma origem pública; publicar somente entrada web e acesso administrativo restrito. Confirmar externamente que Electric, banco e portas internas não estão expostos.
- [ ] Provisionar banco com papéis runtime/migrador/replicação separados, TLS verificado e conexões diretas onde exigidas; habilitar logical replication e validar privilégios efetivos no provedor.
- [ ] Definir ordem explícita roles→migrações→grants/publicação→Electric→API/web, ajustando scripts existentes quando necessário. Validar instalação vazia e repetição; não presumir que o deploy atual cria roles ou publicação.
- [ ] Conferir publicação limitada às tabelas/projeções autorizadas, slots/WAL e comportamento de suspensão do banco. Validar shape pelo proxy autenticado, isolamento tenant e rejeição de filtros arbitrários.
- [ ] Configurar persistência e reiniciar runtime/host ou equivalente PaaS em ensaio; verificar dados, certificados e retomada da replicação. Registrar inventário sem segredos e atualizar manual.

## Contratos e dados afetados

Infraestrutura e provisionamento de roles/publicação; preservar ownership de módulos, dados e permissões mínimas.

## Testes e aceite

HTTPS, isolamento externo, grants, instalação/reaplicação e restart comprovados no destino. Ready comprova dependências; smoke autenticado comprova fluxo. Executar checks de integração/container e pnpm check se fonte mudar.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

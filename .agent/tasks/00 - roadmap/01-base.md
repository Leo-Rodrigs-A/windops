# 01-base: Base executável e infraestrutura

## Status

Base implementada; contêineres locais ativos, validação completa de integração e imagens ainda pendente. Consolidação e segurança detalhadas na [fundação](../01-fundacao/README.md).

## Objetivo e escopo

Inicializar workspace, apps, contratos, health checks, adaptadores inativos, Drizzle, Compose, Dockerfiles, CI/CD e documentação.

## Dependências

Nenhuma

## Critérios de aceite

pnpm check passa; migração versionada; deploy desativado sem configuração; nenhuma credencial publicada; ferramentas e limites documentados.

## Testes

Testes de configuração/saúde/contratos e fail-closed; install frozen; integração DB/Electric; build Docker. Registrar bloqueios ambientais sem declarar teste executado.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

## Evidência de validação

Registro inicial no Windows (Node 22.15.1): 9 testes passaram, typecheck/build/lint aprovados. Compose dev/prod e workflows validados estaticamente com ferramentas oficiais; naquele ambiente não havia Docker acessível.

Verificação posterior em 24/10/2026 no WSL: PostgreSQL/Electric/Mailpit saudáveis; metadados confirmam `workspaces`, journal Drizzle e `wal_level=logical`. Isso não comprova execução completa de migrações do zero, teste de shape, grants, reinício ou build de imagens. Ver [memória](../../memory.md) e tasks F02/F03/F08 da fundação.

# 01-base: Base executável e infraestrutura

## Status

Base implementada e validada localmente, incluindo integração, grants, restart, restore e imagens. A revisão final da fundação segue na [F08](../01-fundacao/08-validacao-integrada.md); CI remoto e serviços de produção ainda não foram exercitados.

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

Validação integrada local em 25/10/2026: `pnpm check`, bancos descartáveis do zero/restore, grants, migrações concorrentes e repetidas, upgrade e Electric após restart passaram. Imagens da API e web foram construídas; migrador empacotado e runtime production foram verificados. Workflow YAML parseou localmente, mas CI remoto ainda não foi disparado. Ver [memória](../../memory.md) e [F08](../01-fundacao/08-validacao-integrada.md). Neon, domínio, deploy e serviços externos permanecem sem validação.

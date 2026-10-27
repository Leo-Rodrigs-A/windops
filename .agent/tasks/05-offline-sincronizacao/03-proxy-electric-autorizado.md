# S03 — Proxy Electric e publicação autorizada

## Status

Planejada

- [ ] Task concluída

## Objetivo

Entregar somente dados autorizados do workspace por um proxy controlado pelo servidor.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

## Dependências

S01 concluída, incluindo o conjunto de dados e a estratégia de shapes.

## Escopo e exclusões

Proxy e publicação mínima/projeções necessárias; sem expor Electric diretamente, identidade privada ou recibos globais.

## Plano de implementação

- [ ] Substituir o 503 de /api/sync/:collection apenas para coleções autorizadas. Guard exige sessão com segunda etapa e membership ativa; workspace é resolvido/validado no servidor.
- [ ] Fixar tabela/projeção, colunas e filtro tenant por coleção. Aceitar apenas parâmetros de protocolo necessários e validados; rejeitar table/where/URL/headers arbitrários e parâmetros duplicados capazes de alterar o escopo.
- [ ] Vincular handles/offsets ao escopo autorizado, reautorizar polls/reconexões e limitar duração de streams. Definir prazo mensurável de interrupção após revogação/expiração, cancelar upstream no abort e testar a janela de revogação.
- [ ] Aplicar política explícita de cache/headers para impedir compartilhamento entre contas/tenants; não repassar segredo Electric, cookies ou headers internos ao cliente. Não confiar que um handle funcione como autorização.
- [ ] Implementar projeções mínimas se necessárias para nomes de atores e histórico; módulos fornecem dados por serviços públicos. Não publicar auth_*, challenges, convites, diretório, memberships privadas ou sync_commands.
- [ ] Atualizar database.md antes de migrations/provisionamento; ampliar grants/publication só para tabelas aprovadas e com verificação de colunas acessíveis. Testar migração vazia, upgrade, reaplicação, restore e privilégio de replicação.
- [ ] Verificar Compose/Caddy e produção: upstream interno, URL/segredo somente servidor e nenhuma rota pública alternativa ao proxy. Não modificar infraestrutura de produção externa neste recorte.

## Contratos e dados afetados

Módulo sync e autorização pública de workspaces/identity; projeções dos respectivos proprietários quando exigidas. Contrato de coleções permitido e erros estruturados; migrations/grants explícitos e revisados.

## Testes e aceite

- [ ] Com Electric real e dois tenants, rejeitar anônimo, sessão pendente, órfão e membro revogado; nenhuma linha/coluna externa é entregue.
- [ ] Tentar injetar filtros, trocar workspace/handle, reutilizar cache e abrir long poll antes de revogar; verificar limites também durante reconexão.
- [ ] Validar abort/timeout/backpressure e indisponibilidade Electric sem vazamento; grants/publication contêm exatamente o conjunto permitido.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

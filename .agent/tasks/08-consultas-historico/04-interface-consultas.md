# Q04 — Filtros e paginação nas interfaces

## Status

Concluída em 30/10/2026.

- [x] Task concluída

## Objetivo

Conectar filtros P/T e carregamento por demanda à Home, ao Histórico e aos Arquivados, apresentando corretamente dados locais, parciais e remotos.

## Escopo e exclusões

Telas e componentes existentes. Preservar ações de criação/atendimento/lifecycle, acesso por cargo, navegação e largura interna padronizada. Sem redesign geral, busca global, filtro por data ou mudança dos indicadores de Conta.

## Estado atual

Home tem paginação e busca local, Histórico chama `getAllIssues`, Arquivados pagina online e busca também por UUID. Faltam filtros explícitos P/T. Carregamentos têm proteções diferentes contra troca de contexto; o merge do Histórico não acompanha toda mudança do journal enquanto online.

## Dependências

[Q02](02-api-consultas.md) e [Q03](03-cache-projecao.md). Seguir [referência visual](../../design-reference.md) e autorização registrada para compor telas existentes. Antes de usar Pencil, reconfirmar o documento ativo; se faltar referência necessária, registrar e pedir acesso sem inventar layout definitivo. Não editar `.pen`.

## Plano

- [x] Adicionar seletores Shadcn de parque e turbina com códigos legíveis, opção de limpar e dependência P→T; catálogo paginado remoto e réplica local incluem equipamentos arquivados.
- [x] Aplicar filtros nas requisições e, offline, na projeção local. O formulário de criação mantém seleção independente; mudança de parque limpa turbina e reinicia a consulta.
- [x] Substituir `getAllIssues` no Histórico por páginas de 25, botão de carregar anteriores, deduplicação por ID e ordenação definida em Q01. Os outros consumidores de `getAllIssues` foram preservados.
- [x] Proteger respostas HTTP atrasadas por geração da consulta nas três listas; mudança de filtro/workspace invalida resultados anteriores.
- [x] Em `INVALID_CURSOR` durante continuação, reiniciar uma vez pela primeira página e mostrar aviso. Falha do retry fica visível para atualização manual.
- [x] Mesclar páginas do Histórico com conclusões locais e observar alterações do journal/ACK também online.
- [x] Arquivados mantém mensagem de conexão necessária; Histórico informa que o cache offline é parcial; busca informa que opera sobre itens carregados. Erros 401/403 seguem refresh de sessão existente.
- [x] Seletores mostram códigos legíveis e identificam equipamentos arquivados; todos usam labels e primitives Shadcn.
- [x] Rodar `pnpm check` (lint/boundaries, typecheck, 57 testes e builds aprovados).

## Contratos e dados afetados

`issues-pages.tsx`, componentes/helpers de consulta quando necessários, `issues-api.ts` e journal Q03. Reutilizar endpoints Q02, sem service worker armazenar respostas `/api`/auth, sem novas dependências por padrão.

## Testes e aceite

As três listas filtram corretamente em massa descartável com mais de uma página. Histórico mostra a primeira página sem baixar tudo; filtro não mantém linhas antigas. Conclusão local sobrevive a restart/ACK e os códigos históricos são legíveis. Respostas antigas não vazam entre contas. Registrar como relato do proprietário qualquer validação feita por ele.

## Evidências

30/10/2026 — Implementados filtros P/T nas três listas, catálogo paginado com fallback para réplica local, filtro local pela projeção Q03, paginação de Histórico em páginas de 25 e reset limitado de cursor inválido. A troca de consulta limpa resultados e geração monotônica impede resposta antiga de atualizar a interface. Busca em Histórico também compara códigos legíveis disponíveis no catálogo local. `getAllIssues` continua nos indicadores de Conta e outros percursos existentes.

`pnpm check` aprovado: lint/boundaries, typecheck, 57 testes em 10 arquivos e builds de contratos/API/web. `git diff --check` aprovado. Não houve inspeção visual autenticada nem teste manual de foco/teclado/temas/viewports nesta execução; não havia sessão de preview autorizada disponível. A geometria existente foi preservada, sem consultar ou editar arquivo Pencil. Q05 fará validação integrada e percurso funcional autenticado.

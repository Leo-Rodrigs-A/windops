# Q04 — Filtros e paginação nas interfaces

## Status

Planejada.

- [ ] Task concluída

## Objetivo

Conectar filtros P/T e carregamento por demanda à Home, ao Histórico e aos Arquivados, apresentando corretamente dados locais, parciais e remotos.

## Escopo e exclusões

Telas e componentes existentes. Preservar ações de criação/atendimento/lifecycle, acesso por cargo, navegação e largura interna padronizada. Sem redesign geral, busca global, filtro por data ou mudança dos indicadores de Conta.

## Estado atual

Home tem paginação e busca local, Histórico chama `getAllIssues`, Arquivados pagina online e busca também por UUID. Faltam filtros explícitos P/T. Carregamentos têm proteções diferentes contra troca de contexto; o merge do Histórico não acompanha toda mudança do journal enquanto online.

## Dependências

[Q02](02-api-consultas.md) e [Q03](03-cache-projecao.md). Seguir [referência visual](../../design-reference.md) e autorização registrada para compor telas existentes. Antes de usar Pencil, reconfirmar o documento ativo; se faltar referência necessária, registrar e pedir acesso sem inventar layout definitivo. Não editar `.pen`.

## Plano

- [ ] Adicionar seletores Shadcn de parque e turbina com códigos legíveis, opção de limpar e dependência P→T; aproveitar catálogo local/serviço público sem carregar localização individual repetidamente. Distinguir equipamento arquivado em consultas históricas.
- [ ] Aplicar filtros na requisição e na projeção local antes de apresentar resultados; trocar filtro reinicia cursor e itens da consulta. Não reutilizar o estado de parque/turbina do formulário de criação para filtrar listas.
- [ ] Substituir `getAllIssues` somente no percurso do Histórico por páginas de 25 e ação de carregar anteriores. Manter ordenação Q01 e deduplicar por ID; preservar os demais consumidores do helper ou ajustá-los apenas se necessário para compatibilidade.
- [ ] Centralizar a coordenação de consultas na menor unidade útil: identidade da consulta, descarte de resposta antiga, carregamento inicial/adicional e retry. Trocar conta/workspace desmonta o contexto anterior; resposta atrasada não atualiza UI nem grava no store da nova partição.
- [ ] Em `INVALID_CURSOR`, reiniciar pela primeira página com aviso claro; limitar recuperação automática a uma tentativa e oferecer atualização manual em nova falha. Não apagar pendências nem manter cursor inválido no cache.
- [ ] Mesclar páginas com projeção local de Q03 também online; observar journal/ACK para mover conclusão ao Histórico sem sumiço, duplicata ou retorno temporário à Home. Reabrir/reativar invalida consultas afetadas.
- [ ] Diferenciar vazio confirmado, filtro sem resultado, cache parcial, cache frio, erro de rede e falha ao persistir. Offline não oferece carregar páginas remotas; Arquivados explica necessidade de conexão. `401/403` segue o fluxo de sessão/revogação, sem tratar falta de autorização como simples fallback de rede.
- [ ] Indicar que busca textual filtra somente itens carregados; buscar códigos P/T legíveis em vez de exigir IDs. Não declarar resultado global vazio enquanto páginas remotas não foram consultadas.
- [ ] Validar foco, rótulos, teclado, temas, viewport estreito e retorno do detalhe; manter largura e componentes existentes. Exercitar em front autenticado, sem depender de sequências manuais no Scalar.
- [ ] Rodar `pnpm check`; testar respostas fora de ordem, mudança de filtro/conta durante requisição e erro ao carregar página seguinte sem perder os itens anteriores. Registrar inspeção visual efetiva e o que estiver indisponível.

## Contratos e dados afetados

`issues-pages.tsx`, componentes/helpers de consulta quando necessários, `issues-api.ts` e journal Q03. Reutilizar endpoints Q02, sem service worker armazenar respostas `/api`/auth, sem novas dependências por padrão.

## Testes e aceite

As três listas filtram corretamente em massa descartável com mais de uma página. Histórico mostra a primeira página sem baixar tudo; filtro não mantém linhas antigas. Conclusão local sobrevive a restart/ACK e os códigos históricos são legíveis. Respostas antigas não vazam entre contas. Registrar como relato do proprietário qualquer validação feita por ele.

## Evidências

28/10/2026 — Planejamento documental. Nenhum documento Pencil consultado nesta preparação; referências existentes foram lidas. Interface e seus testes permanecem pendentes.

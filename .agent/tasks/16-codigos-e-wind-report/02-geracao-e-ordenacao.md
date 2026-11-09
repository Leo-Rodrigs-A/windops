# C02 — Geração e ordenação do catálogo

**Status:** Concluída em 08/11/2026.  
**Task concluída:** [x]

## Objetivo

Gerar códigos automaticamente no formato novo e manter a ordem de criação em todas as leituras do catálogo.

## Regras

- Parque novo: maior número P existente + 1, mínimo de dois dígitos (`P-01`).
- Turbina nova: número do parque selecionado e maior número de turbina associado + 1 (`ZAC-01-04`). Não reaproveitar o número do parque de outro parque.
- Edição de código de turbina deve manter o segmento correspondente ao parque. Alterar o código do parque atualiza, na mesma transação, os códigos e revisions de suas turbinas.
- Listagem online/paginada e cache offline ordenam `createdAt` crescente e `id` crescente para desempate; buscas conservam essa ordem.
- Cada leitura offline e fallback de rede ordena explicitamente, sem depender da ordem física retornada por IndexedDB/TanStack DB.

## Arquivos esperados

- API parks: cursor estável por `(created_at, id)` e `ORDER BY created_at, id`.
- UI `/parques`, filtros de localização e seleção de equipamento no formulário de issue.
- Modelo de sugestão e formatação/validação dos campos de edição.

## Testes de aceite

- [x] Sugestão de parque e turbina inclui formatos, zeros mínimos, sequência e limites.
- [x] Paginação com horários iguais não repete nem omite registros.
- [x] Réplica local embaralhada é ordenada pela criação; falha de rede mantém a mesma ordem do servidor.
- [x] Mudança de código do parque e de turbina preserva associação e atualiza o catálogo.

## Evidências — 08/11/2026

`pnpm check` passou (18 arquivos de teste, 87 testes e builds). `pnpm test:parks-integration` passou em PostgreSQL descartável, incluindo ordenação por `created_at,id`, paginação, renomeação com atualização dos códigos das turbinas, vínculo correto do parque e unicidade concorrente. O teste unitário de catálogo confirma ordenação de dados locais/fallback; não foi feito ensaio manual de PWA sem rede.

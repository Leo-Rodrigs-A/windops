# Slice 16 — Códigos de equipamentos e Wind Report

**Status:** Concluída em 08/11/2026 após ajuste de nomenclatura.

## Resultado

Nomear parques como `Parque 01` e turbinas como `ZAC-01-04`, converter os registros atuais por migration, ordenar parques e turbinas por criação tanto online quanto offline e exibir Wind Report nas superfícies do produto/PWA.

## Limites

- Conversão de dados via migration versionada; sem escrita direta em produção nesta implementação.
- Não renomear identificadores técnicos `windops` usados por chaves IndexedDB, sessões, storage, API, infraestrutura e nomes de pacotes.
- Sem mudança em domínio, remetente de email, autenticação ou layout.

## Dependências e ordem

| Task                                    | Entrega                                                                    | Dependências |
| --------------------------------------- | -------------------------------------------------------------------------- | ------------ |
| [x] [C01](01-migracao-codigos.md)       | Contratos, schema e migration que converte os códigos existentes           | Nenhuma      |
| [x] [C02](02-geracao-e-ordenacao.md)    | Geração/edição coerente com códigos e ordenação de catálogo por criação    | C01          |
| [x] [C03](03-nome-wind-report.md)       | Nome público Wind Report em interface, email e PWA                         | Nenhuma      |
| [x] [C04](04-validacao-integrada.md)    | Validar conversão, fluxos, ordenação online/offline e atualizar evidências | C01–C03      |
| [x] [C05](05-nomes-legiveis-parques.md) | Nomear parques como `Parque 01` e manter o número no prefixo ZAC           | C01–C04      |

## Critérios de encerramento

- [x] Parques existentes e novos seguem `Parque <número>`; turbinas seguem `ZAC-<parque>-<turbina>`.
- [x] Renumerar um parque mantém coerência nos códigos das turbinas associadas.
- [x] Listas e paginação mostram parques/turbinas pela criação crescente, com UUID como desempate, online e offline.
- [x] O nome instalado do PWA e superfícies públicas usam Wind Report.
- [x] Migration é repetível pelo mecanismo normal, preserva IDs/referências e tem validação em banco descartável.
- [x] `pnpm check` e integração de schema/catálogo passam.

## Evidências e limites — 08/11/2026

C01–C05 concluídas. `pnpm check`, `pnpm db:empty-check`, `pnpm test:parks-integration` e `pnpm test:issues-integration` passaram; `drizzle-kit check` também aprovou o journal/snapshot. A migration converte `P-01` para `Parque 01`, preserva IDs e deixa os códigos ZAC vinculados ao número. Nenhuma escrita em produção nem deploy foi realizado nesta slice. Não houve ensaio manual ponta a ponta da PWA offline/reconexão.

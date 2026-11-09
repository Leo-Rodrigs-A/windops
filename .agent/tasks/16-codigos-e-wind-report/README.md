# Slice 16 — Códigos de equipamentos e Wind Report

**Status:** Concluída em 08/11/2026.

## Resultado

Padronizar códigos como `P-01` e `ZAC-01-04`, converter os registros atuais por migration, ordenar parques e turbinas por criação tanto online quanto offline e exibir Wind Report nas superfícies do produto/PWA.

## Limites

- Conversão de dados via migration versionada; sem escrita direta em produção nesta implementação.
- Não renomear identificadores técnicos `windops` usados por chaves IndexedDB, sessões, storage, API, infraestrutura e nomes de pacotes.
- Sem mudança em domínio, remetente de email, autenticação ou layout.

## Dependências e ordem

| Task                                 | Entrega                                                                    | Dependências |
| ------------------------------------ | -------------------------------------------------------------------------- | ------------ |
| [x] [C01](01-migracao-codigos.md)    | Contratos, schema e migration que converte os códigos existentes           | Nenhuma      |
| [x] [C02](02-geracao-e-ordenacao.md) | Geração/edição coerente com códigos e ordenação de catálogo por criação    | C01          |
| [x] [C03](03-nome-wind-report.md)    | Nome público Wind Report em interface, email e PWA                         | Nenhuma      |
| [x] [C04](04-validacao-integrada.md) | Validar conversão, fluxos, ordenação online/offline e atualizar evidências | C01–C03      |

## Critérios de encerramento

- [x] Códigos existentes e novos seguem `P-<parque>` e `ZAC-<parque>-<turbina>`.
- [x] Renumerar um parque mantém coerência nos códigos das turbinas associadas.
- [x] Listas e paginação mostram parques/turbinas pela criação crescente, com UUID como desempate, online e offline.
- [x] O nome instalado do PWA e superfícies públicas usam Wind Report.
- [x] Migration é repetível pelo mecanismo normal, preserva IDs/referências e tem validação em banco descartável.
- [x] `pnpm check` e integração de schema/catálogo passam.

## Evidências e limites — 08/11/2026

C01–C04 concluídas. Validações e evidências individuais estão nas tasks vinculadas. O teste automatizado cobre réplica/fallback e a integração cobre ordenação/paginação da API; não houve ensaio manual ponta a ponta com PWA offline/reconexão. Nenhuma escrita em produção nem deploy foi realizado nesta slice.

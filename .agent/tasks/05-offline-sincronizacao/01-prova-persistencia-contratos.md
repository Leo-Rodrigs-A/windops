# S01 — Prova de persistência e contratos offline

## Status

Planejada

- [ ] Task concluída

## Objetivo

Escolher uma base de armazenamento comprovada e fechar o protocolo antes de integrar gravações offline.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

## Dependências

Slices 01–04 concluídas. Primeira task desta slice.

## Escopo e exclusões

Prova isolada, decisões e contratos. Não habilitar offline na aplicação nem publicar tabelas Electric nesta task.

## Plano de implementação

- [ ] Inventariar as versões instaladas de TanStack DB/Electric e consultar documentação oficial na execução. Demonstrar persistência real de coleção e comandos; avaliar adaptadores suportados e IndexedDB/SQLite sem presumir suporte pelo nome do pacote. Registrar escolha, alternativas e limites em arquitetura/database.
- [ ] Provar transação local atômica entre intenção/comando e projeção visível, recuperação após fechar processo, esquema versionado, quota/storage indisponível e duas abas. Se o adaptador não garantir atomicidade conjunta, definir journal durável como fonte e reconstrução determinística da projeção.
- [ ] Definir esquema local por conta/workspace: réplica confirmada, intenções locais, comandos/dependências, revisão base, estado de envio, tentativas, resposta confirmada, cursores e versão do schema. Separar salvo no aparelho, confirmado no servidor e incorporado à réplica.
- [ ] Definir comandos de criar/editar/iniciar/devolver/concluir; UUIDs estáveis, sequência por issue, revisão esperada e hash/payload imutáveis após primeira tentativa. Não copiar cookies, OTPs ou credenciais para armazenamento JavaScript.
- [ ] Registrar a regra aprovada na I09: autor inicia após uma hora do created_at do servidor; outro membro inicia imediatamente. Para criação originalmente offline, documentar a diferença entre instante local e criação no servidor. Manter a regra atual como base; qualquer uso de horário local para antecipar elegibilidade exige decisão explícita do proprietário antes de alterar o domínio. Comando dependente fica aguardando elegibilidade e não perde conteúdo.
- [ ] Definir edição de relato de conclusão somente local/offline, pelo autor, antes de qualquer tentativa de envio. Congelar payload na primeira tentativa inclusive se a resposta se perder. Não reutilizar commandId com relato alterado.
- [ ] Definir conjunto sincronizado e estratégia comprovável para logs de issues ativas, localização histórica, nomes públicos de atores, concluídas retidas e registros com dependências pendentes; não supor joins/filtros de shapes suportados sem prova.
- [ ] Registrar política de logout, troca de conta, revogação conhecida, exportação e retenção; revisões do protocolo, limites de fila e tamanho, comandos órfãos e migração de dados locais.
- [ ] Planejar/provar retomada em Chrome/Android e Safari/iPhone com build e contexto seguro. Registrar navegador, modo instalado, versão e aparelho realmente usados; ausência de dispositivo mantém suporte correspondente não comprovado.
- [ ] Consolidar matriz de ordenação segundo a solicitação do proprietário: issues mais recentes acima; Histórico por conclusão decrescente e logs por evento decrescente, sempre com desempate estável. Registrar diferença frente à Home atual crescente para alinhar na S07.

## Contratos e dados afetados

Contratos Zod em packages/contracts; decisão do modelo local em .agent/database.md; interfaces públicas de sync/issues/audit/parks preservadas. Qualquer alteração de contrato servidor deve manter clientes online existentes compatíveis.

## Testes e aceite

- [ ] Reabrir a prova com processo novo e recuperar comando, texto, dependências e revisão; nenhum sucesso durável baseado apenas em memória.
- [ ] Injetar falha entre gravações, quota insuficiente e migração interrompida; duas abas não podem perder comandos nem confirmar gravação incompleta.
- [ ] Registrar decisão e limites reproduzíveis; S02 depende de prova técnica aprovada. Se houver alteração de regra temporal, deixar esse ponto bloqueado até decisão do proprietário, mantendo trabalhos independentes executáveis.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

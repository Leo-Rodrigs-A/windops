# I01 — Modelo, regras e contratos

## Status

Concluída em 26/10/2026.

- [x] Task concluída

## Objetivo

Definir os contratos de chamados e as decisões de domínio necessárias antes de criar tabelas ou endpoints.

## Estado atual

Slice 03 concluída. No início da I01, issues e audit tinham somente entrypoints vazios e sync retornava 503. Esta task entrega contratos compartilhados e decisões de modelo; endpoints e persistência permanecem para I02–I06.

## Dependências

Slices 01–03 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Contratos compartilhados e documentação; sem SQL aplicado, endpoints ou layout final.

## Plano de implementação

- [x] Registrar em `.agent/database.md` issues, eventos pertencentes a audit e recibos de comandos pertencentes a sync; definir serviços públicos e composição transacional sem imports de schema/repositórios entre módulos.
- [x] Definir UUID gerado no cliente, texto obrigatório aparado (limite explícito), parque/turbina, criador imutável, responsável pelo atendimento, timestamps do servidor e revision positiva. Sem título, anexos ou entidade elevador.
- [x] Fixar matriz: ambos os cargos criam/consultam/iniciam; somente criador edita aberta; somente responsável devolve; admin pode liberar atendimento alheio. Sem atribuição a terceiros ou exceção admin para editar conteúdo alheio.
- [x] Definir estados Pendente e Em andamento neste recorte; conclusão, espera de uma hora, reabertura e arquivamento de issues ficam na etapa 08. Reservar evolução sem expor comandos não implementados.
- [x] Definir endpoints sob `/api/workspaces/:workspaceId/issues`: lista, detalhe, eventos, criação, edição e ações explícitas iniciar/devolver/liberar. Zod estrito; ator/estado/revisão final derivados pelo servidor; expectedRevision obrigatório em mutações existentes.
- [x] Definir envelope de comando, chave por tenant/ator/comando, hash canônico do payload, resposta persistida e conflito para mesma chave com payload diferente. Reautorizar antes de devolver recibo; erro transiente não pode consumir definitivamente o comando. Recibos de sucesso não expiram neste recorte.
- [x] Definir lista de abertas por criação crescente e UUID como desempate, paginação limitada e filtros parque/turbina; confirmar a interpretação de ordenação ao revisar o design. Erros estruturados sem revelar IDs de outro tenant.
- [x] Resolver com o proprietário o efeito do arquivo/restauração do parque e as issues existentes: decisão em 26/10/2026, turbinas arquivadas individualmente continuam arquivadas ao restaurar o parque; qualquer issue aberta em uma turbina impede arquivar a turbina ou seu parque. Issues preservadas seguem sem alteração; novas issues são bloqueadas em equipamento inativo.
- [x] Definir retenção de associação histórica: edição de localização não libera equipamento antigo para exclusão se houver referência em evento. Exclusão de parque considera todas as turbinas e todo histórico; com histórico fechado preserva o agregado inteiro. Arquivamento de parque é negado se qualquer descendente tiver issue aberta.
- [x] Documentar ordem global de locks compatível com workspace→membership existente, equipamentos em ordem determinística e issue; incluir mudança de localização entre parques, criação de turbina versus arquivo de parque e revogação concorrente.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [x] Testar contratos válidos/inválidos, campos extras, limites, revisão, cursores e formato de chave de comando; executar checagens diretas do pacote de contratos. `pnpm check` foi iniciado e ficou sem saída, interrompido; equivalentes da alteração foram executados.
- [x] Registrar matriz de permissões/transições e decisões de lifecycle sem dúvidas bloqueantes para o schema; se faltar decisão, manter I01 aberta e dependentes bloqueadas.
- [x] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: contratos compartilhados Zod de issues/eventos, consulta paginada, criação, edição e ações adicionados em `packages/contracts`; modelo de transação, endpoints, autorização, recibo, histórico, referências de localização e locks documentados em `.agent/database.md`. Proprietário confirmou que turbinas arquivadas individualmente permanecem arquivadas ao restaurar o parque e que parque/turbina com issue aberta atualmente associada não pode ser arquivado. Issues existentes não são alteradas pelo arquivo. Biome, typecheck de contracts, boundaries e Vitest do pacote passaram diretamente (10 testes). `pnpm check` permaneceu sem saída e foi interrompido (exit 130); não declarar check integral aprovado. Nenhuma migration, endpoint ou escrita no banco executada.

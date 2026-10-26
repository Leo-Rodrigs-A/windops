# I01 — Modelo, regras e contratos

## Status

Planejada

- [ ] Task concluída

## Objetivo

Definir os contratos de chamados e as decisões de domínio necessárias antes de criar tabelas ou endpoints.

## Estado atual

Planejamento em 26/10/2026. Slice 03 concluída; issues e audit têm somente entrypoints vazios e sync retorna 503. As entregas desta slice ainda não existem. As dependências abaixo precisam ser executadas e verificadas; este documento não comprova implementação.

## Dependências

Slices 01–03 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Contratos compartilhados e documentação; sem SQL aplicado, endpoints ou layout final.

## Plano de implementação

- [ ] Registrar em `.agent/database.md` issues, eventos pertencentes a audit e recibos de comandos pertencentes a sync; definir serviços públicos e composição transacional sem imports de schema/repositórios entre módulos.
- [ ] Definir UUID gerado no cliente, texto obrigatório aparado (limite explícito), parque/turbina, criador imutável, responsável pelo atendimento, timestamps do servidor e revision positiva. Sem título, anexos ou entidade elevador.
- [ ] Fixar matriz: ambos os cargos criam/consultam/iniciam; somente criador edita aberta; somente responsável devolve; admin pode liberar atendimento alheio. Sem atribuição a terceiros ou exceção admin para editar conteúdo alheio.
- [ ] Definir estados Pendente e Em andamento neste recorte; conclusão, espera de uma hora, reabertura e arquivamento de issues ficam na etapa 08. Reservar evolução sem expor comandos não implementados.
- [ ] Definir endpoints sob `/api/workspaces/:workspaceId/issues`: lista, detalhe, eventos, criação, edição e ações explícitas iniciar/devolver/liberar. Zod estrito; ator/estado/revisão final derivados pelo servidor; expectedRevision obrigatório em mutações existentes.
- [ ] Definir envelope de comando, chave por tenant/ator/comando, hash canônico do payload, resposta persistida e conflito para mesma chave com payload diferente. Reautorizar antes de devolver recibo; erro transiente não pode consumir definitivamente o comando. Recibos de sucesso não expiram neste recorte.
- [ ] Definir lista de abertas por criação crescente e UUID como desempate, paginação limitada e filtros parque/turbina; confirmar a interpretação de ordenação ao revisar o design. Erros estruturados sem revelar IDs de outro tenant.
- [ ] Resolver com o proprietário o efeito do arquivo/restauração do parque e o atendimento de issues existentes em equipamento arquivado. Proposta para avaliação: inatividade efetiva herdada do parque sem apagar a desativação individual da turbina; restauração do parque preserva turbinas individualmente arquivadas; issues existentes continuam atendíveis. Registrar decisão antes da I02, sem tratá-la como aprovada neste plano.
- [ ] Definir retenção de associação histórica: edição de localização não libera equipamento antigo para exclusão se houver referência em evento. Exclusão de parque considera todas as turbinas e todo histórico; com histórico preserva o agregado inteiro.
- [ ] Documentar ordem global de locks compatível com workspace→membership existente, equipamentos em ordem determinística e issue; incluir mudança de localização entre parques, criação de turbina versus arquivo de parque e revogação concorrente.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Testar contratos válidos/inválidos, campos extras, limites, revisão, cursores e chaves de comando; executar pnpm check para mudanças de fonte.
- [ ] Registrar matriz de permissões/transições e decisões de lifecycle sem dúvidas bloqueantes para o schema; se faltar decisão, manter I01 aberta e dependentes bloqueadas.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: task planejada; nenhuma implementação, migração, teste de aplicação ou validação funcional executada nesta preparação. Preencher evidência da execução futura com data e resultados reais.

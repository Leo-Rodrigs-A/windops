# 06-issues: Registro e atendimento

## Status

Em andamento — recorte online implementado e aprovado pelo proprietário na slice 04; persistência offline, reabertura e arquivo de issues continuam em etapas futuras.

## Objetivo e escopo

Texto obrigatório, parque/turbina, status Pendente, edição pelo criador, iniciar próprio atendimento após uma hora e devolver para Pendente. Outros membros ativos podem iniciar imediatamente. UUID cliente e versionamento; eventos transacionais.

## Dependências

04, 05; 02 para visual

A slice executável 03 prepara cadastro/consulta/edição de equipamentos; lifecycle implementado na I06 da slice 04. Admin exclui parque/turbina somente quando não há referências atuais ou históricas; com referências e sem issue aberta atualmente localizada, arquiva preservando os registros e permitindo restauração; issue aberta associada bloqueia arquivamento da turbina ou do parque que a contenha. Arquivar parque torna turbinas efetivamente inativas sem alterar estado individual; restaurar parque não reativa turbinas antes arquivadas individualmente. Operações são serializadas com criação/edição/atendimento por serviços públicos entre módulos.

I08 revalidou em 26/10/2026 os fluxos de tenant/ator/revisão, idempotência, histórico, conflitos e corridas em PostgreSQL descartável. O proprietário confirmou todas as funcionalidades implementadas e aprovou a slice; a aprovação não certifica operação offline ou teste independente em dispositivos.

## Critérios de aceite

Sem atribuição a terceiros; somente responsável ativo conclui/devolve; admin libera atendimento; criador edita pendente com antes/depois; contrato preparado para comandos idempotentes.

## Testes

Permissões por ator, edições concorrentes, transições inválidas, parque/turbina de outro workspace, repetição de comando.

Execução online concluída na [slice 04 — Registro e atendimento](../04-registro-atendimento/README.md), incluindo conclusão pela I09. A [slice 05](../05-offline-sincronizacao/README.md) planeja persistência/fila local para os comandos existentes; reabertura e arquivo de issues permanecem na etapa 08. Planejamento não comprova operação offline.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

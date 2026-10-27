# 06-issues: Registro e atendimento

## Status

Em andamento — I01–I05 da slice 04 concluídas em 26/10/2026; I06 é a próxima task executável.

## Objetivo e escopo

Texto obrigatório, parque/turbina, status Pendente, edição pelo criador, iniciar próprio atendimento e devolver para Pendente. UUID cliente e versionamento; eventos transacionais.

## Dependências

04, 05; 02 para visual

A slice executável 03 prepara cadastro/consulta/edição de equipamentos, mas não habilita exclusão/arquivamento. Por decisão do proprietário em 26/10/2026: admin exclui parque/turbina somente quando não há referências atuais ou históricas; com histórico e sem issues abertas, arquiva preservando todos os registros e permitindo restauração; qualquer issue aberta bloqueia arquivamento da turbina ou do parque que a contenha. Arquivar parque torna turbinas efetivamente inativas sem alterar estado individual; restaurar parque não reativa turbinas antes arquivadas individualmente. Serializar com criação/edição/atendimento por serviços públicos entre módulos.

## Critérios de aceite

Sem atribuição a terceiros; somente ator ativo conclui/devolve; admin libera atendimento; criador edita aberta com antes/depois; contrato preparado para comandos idempotentes.

## Testes

Permissões por ator, edições concorrentes, transições inválidas, parque/turbina de outro workspace, repetição de comando.

Execução detalhada na [slice 04 — Registro e atendimento](../04-registro-atendimento/README.md), I01–I08. I01 concluída em 26/10/2026; recorte online inclui histórico básico e recibos idempotentes; conclusão permanece na etapa 08.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

# 06-issues: Registro e atendimento

## Status

Planejada

## Objetivo e escopo

Texto obrigatório, parque/turbina, status Pendente, edição pelo criador, iniciar próprio atendimento e devolver para Pendente. UUID cliente e versionamento; eventos transacionais.

## Dependências

04, 05; 02 para visual

A slice executável 03 prepara cadastro/consulta/edição de equipamentos, mas não habilita exclusão/arquivamento. Por decisão do proprietário em 26/10/2026: admin exclui parque/turbina definitivamente quando não há issues associadas; se existir qualquer issue/histórico, arquiva o equipamento preservando todos os registros e permitindo restauração. Ao detalhar issues, modelar esse lifecycle no mesmo limite transacional que protege a criação concorrente de issues. Usar serviços públicos entre módulos. Definir como um parque arquivado afeta suas turbinas e como a restauração preserva o estado anterior delas. Não considerar a etapa 05 integralmente concluída antes dessa validação.

## Critérios de aceite

Sem atribuição a terceiros; somente ator ativo conclui/devolve; admin libera atendimento; criador edita aberta com antes/depois; contrato preparado para comandos idempotentes.

## Testes

Permissões por ator, edições concorrentes, transições inválidas, parque/turbina de outro workspace, repetição de comando.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

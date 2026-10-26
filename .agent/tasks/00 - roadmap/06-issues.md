# 06-issues: Registro e atendimento

## Status

Planejada

## Objetivo e escopo

Texto obrigatório, parque/turbina, status Pendente, edição pelo criador, iniciar próprio atendimento e devolver para Pendente. UUID cliente e versionamento; eventos transacionais.

## Dependências

04, 05; 02 para visual

A slice executável 03 prepara cadastro/consulta/edição de equipamentos, mas não habilita desativação. Ao detalhar issues, incluir a integração de desativação de parques/turbinas: bloqueio com Pendentes/Em andamento, rejeição de novas issues em equipamentos desativados e teste concorrente criação/desativação sob protocolo transacional comum. Usar serviços públicos entre módulos; não considerar a etapa 05 integralmente concluída antes dessa validação.

## Critérios de aceite

Sem atribuição a terceiros; somente ator ativo conclui/devolve; admin libera atendimento; criador edita aberta com antes/depois; contrato preparado para comandos idempotentes.

## Testes

Permissões por ator, edições concorrentes, transições inválidas, parque/turbina de outro workspace, repetição de comando.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

# 04-workspaces: Workspace, membros e convites

## Status

Planejada

## Objetivo e escopo

Membership N:N, cargos, tenant guards, bootstrap manual do primeiro admin, listagem de membros/órfãos, convites por e-mail e administração.

## Dependências

03

## Critérios de aceite

Um workspace no piloto; convite 48h/uso único/e-mail correto/cargo default técnico; admin não remove/rebaixa admin; último admin transfere cargo antes de autoexclusão; histórico anonimizado.

## Testes

Isolamento por workspace em toda API; convites vencidos/reenvio; remoção concorrente; sucessão do último admin sem corrida; conta órfã sem acesso.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

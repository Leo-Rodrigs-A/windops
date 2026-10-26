# 04-workspaces: Workspace, membros e convites

## Status

Parcialmente implementada. Membership N:N, autorização tenant, contexto, bootstrap, convites, diretório e cargos/revogação têm evidências em F05 e E01–E07. Integrações, desktop, convite/aceite, Android e ações entre cargos foram confirmados. Problemas de layout mobile foram adiados por decisão do proprietário. Exclusão global de conta, anonimização e sucessão na autoexclusão continuam fora da slice 02.

A [slice 02 — Equipe e acesso](../02-equipe-acesso/README.md) detalha a entrega em E01–E07: conta admin dev, diretório administrativo, convites, promoção/revogação e interfaces. Backend e migrações passaram em bancos descartáveis; o proprietário confirmou os fluxos desktop/Android e ações entre cargos. Exclusão global, anonimização e sucessão na autoexclusão continuam fora dessa slice.

## Objetivo e escopo

Membership N:N, cargos, tenant guards, bootstrap manual do primeiro admin, listagem de membros/órfãos, convites por e-mail e administração.

## Dependências

03

## Critérios de aceite

Um workspace no piloto; convite 48h/uso único/e-mail correto/cargo default técnico; admin não remove/rebaixa outro admin; pode sair ou se rebaixar se outro admin ativo permanecer; último admin promove técnico antes de sair/rebaixar; histórico anonimizado.

## Testes

Isolamento por workspace em toda API; convites vencidos/reenvio; remoção concorrente; sucessão do último admin sem corrida; conta órfã sem acesso.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

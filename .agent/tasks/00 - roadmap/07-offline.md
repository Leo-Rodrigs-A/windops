# 07-offline: Persistência e sincronização

## Status

Planejada — execução detalhada na [slice 05](../05-offline-sincronizacao/README.md), S01–S09; iniciar pela prova de persistência e contratos.

## Objetivo e escopo

Prova em Safari/Chrome, persistência durável TanStack DB, outbox, PWA/app shell, proxy Electric autorizado e reconciliação. Escolher persistência suportada após prova de compatibilidade.

## Dependências

03–06

## Critérios de aceite

Salvar antes de feedback; reinício preserva comandos; idempotência; tenant/account cache separado; primeiro atendimento aceito vence; conflito explícito; membro removido exporta pendências; login renovado antes de upload.

## Testes

Modo avião, fechar/reabrir, reiniciar aparelho, perda de resposta após commit, concorrência, sessão expirada, revogação, storage cheio, update service worker, isolamento de shapes.

## Recorte executável

A slice 05 prepara armazenamento local e outbox, proxy autorizado, réplica/reconciliação, envio ordenado, acesso offline/conflitos/exportação, interface e PWA. Gestão administrativa de catálogo/equipe continua online. Preservar a regra da I09: autor inicia após uma hora de criação no servidor. A S01 deve resolver a experiência temporal de chamadas criadas offline antes de modificar essa regra; nenhuma alteração foi aprovada pelo planejamento.

A conclusão online já existe; a fila inclui sua extensão local e relato editável apenas antes de qualquer tentativa de envio. Não habilitar reabertura/arquivo de issues nem notificações. Só declarar suporte de plataforma depois de evidência correspondente; todas as tasks permanecem planejadas.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

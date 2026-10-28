# 07-offline: Persistência e sincronização

## Status

Em andamento — execução detalhada na [slice 05](../05-offline-sincronizacao/README.md), S01–S09. S01–S08 concluídas; S09 validação integrada permanece. S08 comprovou app shell, reabertura, fila e upgrade em desktop via Preview; Cache Storage não contém rotas `/api` ou `/auth/`. Validação instalada em Android/iPhone e HTTPS no aparelho foi transferida para S09/produção por decisão do proprietário; não declarar suporte móvel antes da evidência.

## Objetivo e escopo

Prova em Safari/Chrome, persistência durável TanStack DB, outbox, PWA/app shell, proxy Electric autorizado e reconciliação. Escolher persistência suportada após prova de compatibilidade.

## Dependências

03–06

## Critérios de aceite

Salvar antes de feedback; reinício preserva comandos; idempotência; tenant/account cache separado; primeiro atendimento aceito vence; conflito explícito; membro removido exporta pendências; login renovado antes de upload.

## Testes

Modo avião, fechar/reabrir, reiniciar aparelho, perda de resposta após commit, concorrência, sessão expirada, revogação, storage cheio, update service worker, isolamento de shapes.

## Recorte executável

A slice 05 prepara armazenamento local e outbox, proxy autorizado, réplica/reconciliação, envio ordenado, acesso offline/conflitos/exportação, interface e PWA. S01–S08 estão concluídas; S09 valida o fluxo de campo integrado, incluindo aparelhos em produção. Gestão administrativa de catálogo/equipe continua online. Preservar a regra da I09: autor inicia após uma hora de criação no servidor. A S01 definiu que issue criada offline recebe `created_at` ao sincronizar e o autor espera uma hora desse instante; relógio local não antecipa elegibilidade.

A conclusão online já existe; a fila inclui sua extensão local e relato editável apenas antes de qualquer tentativa de envio. Não habilitar reabertura/arquivo de issues nem notificações. Só declarar suporte de plataforma depois de evidência correspondente; validação móvel continua pendente na S09.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

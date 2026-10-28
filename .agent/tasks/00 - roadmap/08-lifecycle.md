# 08-lifecycle: Conclusão, reabertura, arquivos e logs

## Status

Parcialmente implementada: conclusão online na I09 e relato offline na slice 05. Reabertura e arquivo/reativação planejados na [slice 06](../06-ciclo-vida-issues/README.md).

## Objetivo e escopo

Tela de conclusão com relato opcional e confirmação; espera do criador; edição do relato local offline; reabertura/arquivamento/reativação conforme memory.md.

## Dependências

06, 07

## Critérios de aceite

Criador espera 1h desde criação; reabrir limpa relato sem apagar log; concluída não pode ser arquivada; reativação só admin.

## Testes

Limite de 1h, relógio incoerente, voltar sem salvar, relato opcional, edição após sync negada, todas as permissões de arquivamento.

A [slice 04](../04-registro-atendimento/README.md) entregou eventos/consultas e conclusão online. O autor espera uma hora desde created_at do servidor para iniciar atendimento. A [slice 05](../05-offline-sincronizacao/README.md) entregou conclusão offline durável e edição do relato antes da primeira tentativa de envio, com validação browser/desktop. Criação offline recebe created_at ao ser aceita pelo servidor. A [slice 06](../06-ciclo-vida-issues/README.md) detalha o restante; implementação ainda não iniciada.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

# 08-lifecycle: Conclusão, reabertura, arquivos e logs

## Status

Parcialmente antecipada em 26/10/2026 pela I09; reabertura, arquivos/restauração e relato offline continuam planejados.

## Objetivo e escopo

Tela de conclusão com relato opcional e confirmação; espera do criador; edição do relato local offline; reabertura/arquivamento/reativação/restauração conforme memory.md.

## Dependências

06, 07

## Critérios de aceite

Criador espera 1h desde criação; reabrir limpa relato sem apagar log; restauração admin online confirmada não conclui; concluída não pode ser arquivada; reativação só admin.

## Testes

Limite de 1h, relógio incoerente, voltar sem salvar, relato opcional, edição após sync negada, restauração auditada, todas as permissões de arquivamento.

A [slice 04](../04-registro-atendimento/README.md) entregou eventos/consultas e conclusão online com relato opcional. A regra atual exige uma hora para o autor iniciar atendimento, usando relógio do banco. A [slice 05](../05-offline-sincronizacao/README.md) planeja persistência da conclusão offline e edição do relato local antes da primeira tentativa de envio; S01 deve resolver a semântica temporal de criação offline sem alterar silenciosamente a regra. Reabertura, arquivo/reativação e restauração de relatos continuam futuras.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

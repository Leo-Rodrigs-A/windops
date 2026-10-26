# 08-lifecycle: Conclusão, reabertura, arquivos e logs

## Status

Planejada

## Objetivo e escopo

Tela de conclusão com relato opcional e confirmação; espera do criador; edição do relato local offline; reabertura/arquivamento/reativação/restauração conforme memory.md.

## Dependências

06, 07

## Critérios de aceite

Criador espera 1h desde criação; reabrir limpa relato sem apagar log; restauração admin online confirmada não conclui; concluída não pode ser arquivada; reativação só admin.

## Testes

Limite de 1h, relógio incoerente, voltar sem salvar, relato opcional, edição após sync negada, restauração auditada, todas as permissões de arquivamento.

A [slice 04](../04-registro-atendimento/README.md) planeja antecipar o núcleo append-only e consulta de eventos necessário a registro/atendimento online. Conclusão, espera de uma hora, relato, reabertura, arquivos/reativação de issues e restauração continuam nesta etapa; nenhuma entrega foi concluída apenas por esse plano.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

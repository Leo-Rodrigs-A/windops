# N05 — Campainha e integração PWA

## Status

Planejada

- [ ] Task concluída

## Objetivo

Conectar avisos e permissão de push ao front existente.

## Escopo e exclusões

Recorte da [slice 07](README.md), respeitando seus limites. Sem deploy ou e-mails de eventos.

## Estado atual

Planejamento; nenhuma implementação desta task executada. Diagnóstico da base no índice da slice.

## Dependências

N03/N04; referência visual confirmada.

## Plano

- [ ] Confirmar documento Pencil pelo MCP e referências de campainha/configurações; registrar ausência e conciliar composição antes de definir layout final. Não editar nem copiar .pen.
- [ ] Ativar Bell com contagem, lista paginada, leitura e navegação; usar Shadcn/tokens e largura interna padrão. Cobrir vazio, loading, erro, offline e revogação.
- [ ] Oferecer ativação de push por ação explícita, com estados permitido/negado/não suportado e opção de desativar neste aparelho; não pedir permissão automaticamente.
- [ ] Integrar push e notificationclick ao service worker existente sem substituir cache/update; validar URL same-origin, reutilização de janela e retorno autenticado à issue.
- [ ] Preservar partição por conta/workspace e limpar/desvincular recursos de push na troca de conta/logout sem apagar comandos locais pendentes.
- [ ] Validar teclado/foco/leitor de tela, temas e viewports; provar que atualização do worker mantém fila offline e que aviso não revela dados da conta anterior.

## Contratos e dados afetados

Interface da campainha, configuração de push e service worker existente.

## Testes e aceite

Comprovar os itens do plano com evidências reproduzíveis e isolamento tenant; pnpm check para mudanças de fonte, integrações/container conforme alteração. Registrar validação indisponível sem marcar aceite como concluído.

## Evidências

28/10/2026: task planejada; implementação e testes de aplicação não executados.

# I07 — Interfaces de chamados e lifecycle do catálogo

## Status

Planejada

- [ ] Task concluída

## Objetivo

Conectar o fluxo online de chamados e as ações administrativas do catálogo às APIs reais.

## Estado atual

Planejamento em 26/10/2026. Slice 03 concluída; issues e audit têm somente entrypoints vazios e sync retorna 503. As entregas desta slice ainda não existem. As dependências abaixo precisam ser executadas e verificadas; este documento não comprova implementação.

## Dependências

I03–I06 concluídas. Ver [índice da slice](README.md).

## Escopo e exclusões

Lista, formulário, detalhe/histórico e ações do recorte; sem concluir, fila offline, push, filtros avançados ou layout definitivo inventado.

## Plano de implementação

- [ ] Reconfirmar com proprietário o documento Pencil ativo antes da consulta pelo MCP Windows; registrar referências em design-reference.md sem copiar/editar .pen. Se faltarem telas, solicitar referência ou autorização de composição antes do visual definitivo.
- [ ] Conciliar rótulos do desenho com Pendente/Em andamento/Concluída da memória e ordenação antigas primeiro; não mudar regras de negócio apenas pelo desenho.
- [ ] Usar Shadcn, tokens, temas e navegação existentes para lista por parque/turbina, criação sem título, edição do criador e detalhe com histórico paginado.
- [ ] Mostrar iniciar/devolver/liberar conforme ator e estado; API continua autoridade. Não exibir concluir como ação funcional antes da etapa 08.
- [ ] Adicionar exclusão/arquivo/restauração admin no catálogo com confirmação e consequência explícita; tratar resultado real do servidor quando surgir associação concorrente. Separar catálogo inativo e seleção ativa para novo chamado.
- [ ] Implementar carregamento, vazio, erro, sessão expirada, revogação e conflitos preservando texto digitado; evitar duplicação usando a mesma chave no retry de resultado incerto. Se a página recarregar e perder estado em memória, não prometer recuperação durável.
- [ ] Comunicar indisponibilidade de gravação sem rede; sem confirmação de sucesso antes do commit. Garantia de trabalho offline pertence à próxima etapa.
- [ ] Validar teclado, foco/diálogos, leitor de tela, temas e desktop/mobile; documentar limitações conhecidas sem reabrir ajustes antigos da slice 02 automaticamente.

## Contratos e dados afetados

Contratos de issues, audit, sync e/ou parks conforme o escopo acima e decisões da [I01](01-modelo-contratos.md). Serviços públicos via index.ts e transação compartilhada; tenant obrigatório em dados, consultas e comandos. Atualizar `.agent/database.md` antes de alterar o modelo; preservar APIs existentes ou documentar sua evolução compatível.

## Testes e aceite

- [ ] Exercitar duas contas reais de teste com cargos distintos: criar, editar própria, iniciar, devolver/liberar e ler eventos; confirmar controles ocultos e negativas da API.
- [ ] Validar conflitos/retry com rede interrompida, parque sem turbina, equipamento arquivado e confirmação destrutiva; comparar com referências aprovadas.
- [ ] Executar pnpm check e registrar evidência visual e limitações de dispositivo; não alterar dados reais sem combinar o percurso com o proprietário.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: task planejada; nenhuma implementação, migração, teste de aplicação ou validação funcional executada nesta preparação. Preencher evidência da execução futura com data e resultados reais.

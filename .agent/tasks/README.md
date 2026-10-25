# Tasks de implementação

## Roadmap e slices

[00 - roadmap](<00 - roadmap/README.md>) preserva as 11 etapas de produto originais. Elas orientam a evolução do sistema, mas não substituem planos executáveis. Os números dessas etapas são independentes dos números das novas slices: `00 - roadmap/01-base` não é `01-fundacao`.

Cada nova slice fica em uma pasta `NN-nome/`, com um `README.md` que define resultado, limites, dependências e ordem de execução. Cada task ganha seu próprio arquivo `NN-nome.md`, criado quando houver contexto suficiente para detalhar a implementação. Criar apenas as tasks da slice em preparação; não decompor todo o roadmap antecipadamente.

## Slice atual

- [ ] [01 — Fundação](01-fundacao/README.md): F01–F05 concluídas; referências visuais e interfaces iniciais seguem em andamento.

Task atual: [F06 — Referências e componentes visuais](01-fundacao/06-design-system.md). F05 concluiu os guards de workspace e o bootstrap administrativo; o schema está em [`.agent/database.md`](../database.md), e F03 aplicou as migrações de identidade, desafios e memberships no banco local.

## Convenção de execução

1. Ler [arquitetura](../architeture.md), [memória](../memory.md), índice da slice e task escolhida. Respeitar dependências antes de começar.
2. Usar status `Planejada`, `Em andamento`, `Bloqueada` ou `Concluída`, acompanhado de `- [ ] Task concluída`. Registrar o motivo de bloqueio e o que falta, sem marcar o item como pronto.
3. Escrever em cada task: objetivo, escopo e exclusões, estado atual, dependências, plano com checkboxes, contratos/dados afetados, testes/aceite e evidências. Detalhar falhas, segurança e compatibilidade quando aplicáveis.
4. Marcar cada checkbox somente após realizar e validar a entrega descrita. Código existente e testes antigos são contexto, não comprovação automática de uma nova task.
5. Ao concluir, preencher evidência com data, mudanças, comandos/resultados e limitações; marcar `Task concluída` e o item correspondente no índice. Atualizar memória e etapas do roadmap afetadas, sem declarar uma etapa inteira concluída por cobertura parcial.
6. Rodar `pnpm check` para mudanças de fonte e validações de integração/contêiner para infraestrutura. Em mudanças só documentais, conferir caminhos, links e consistência; registrar que os testes da aplicação não foram executados.
7. Após concluir uma task ou slice, sugerir no resumo uma mensagem de commit curta e coerente com as mudanças entregues.

Mudanças de produto descobertas no design devem ser conciliadas com o proprietário e registradas na memória antes de alterar regras de negócio. Referências `.pen` continuam externas ao Git.

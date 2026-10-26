# E07 — Validação integrada da equipe e acesso

## Status e dependências

Concluída em 26/10/2026. Depende de E01–E06, todas concluídas. Integrações automatizadas, percurso autenticado desktop/Android e ações entre cargos foram confirmados pelo proprietário. Inconsistências de layout mobile ficaram registradas como melhoria posterior, conforme decisão do proprietário.

- [x] Task concluída.

## Objetivo e escopo

Comprovar o percurso administrador → convite → técnico → promoção/revogação usando banco, API, e-mail e interface, preservando o ambiente dev do proprietário.

## Plano de implementação

- [x] Revisar evidências de E01–E06 e executar cenários destrutivos/concorrentes somente em bancos descartáveis com dados sintéticos.
- [x] Exercitar migração vazia, upgrade preservando workspace, reaplicação, grants e exclusão de tabelas privadas da replicação.
- [x] Exercitar emissão e entrega no Mailpit com conta sintética preexistente, OTP e aceite; o fluxo de cadastro/login/OTP também passou na integração de identidade.
- [x] Validar e-mail divergente, expiração de 48 horas, token inválido/usado, reenvio, tentativa por técnico e sessão pré-código.
- [x] Exercitar concorrência de aceite/reenvio/remoção/promoção e retry após reintegração; não houve duplicação nem restauração por token/revisão antigos.
- [x] Confirmar isolamento entre workspaces e que o diretório retorna apenas contas sem vínculo ativo.
- [x] Conferir em desktop, com a conta admin, carregamento de `/equipe`, membros, diretório, formulário de convite e lista de convites; captura fornecida pelo proprietário em 25/10/2026 mostra o admin ativo e estados vazios sem erros visíveis.
- [x] Corrigir incompatibilidade descoberta no link do convite: o e-mail apontava para `/invite/accept`, rota que não existia, enquanto a tela estava em `/convite/aceitar`. Novos convites usam a rota existente e a rota anterior foi mantida para links já emitidos.
- [x] Corrigir ciclo de navegação para sessão órfã com convite pendente: as duas rotas de aceite agora são permitidas pelo guard de workspace.
- [x] Exercitar o convite e o aceite pela segunda conta; o proprietário confirmou que o fluxo passou a funcionar como esperado e que a conta convidada entrou no workspace.
- [x] Conferir a membership no painel admin; captura do proprietário mostra a conta secundária ativa com cargo Administrador.
- [x] Validar visualmente promoção/revogação e perda de acesso entre contas; proprietário confirmou que todos os cargos e ações funcionaram como esperado.
- [x] Confirmar no Android que o fluxo móvel funciona; inconsistências visuais registradas como melhoria posterior. iPhone não disponível.
- [x] Testar falha de e-mail, recuperação, OTP expirado e rejeição de origem indevida; as rotas não reportam sucesso quando a entrega falha.
- [x] Executar lint/boundaries, TypeScript, Vitest, builds e integrações diretamente; confirmar que os workflows do CI já executam `pnpm check`, `db:empty-check`, `db:restore-check` e as três integrações.
- [x] Tentar `pnpm check`; o shim não produziu saída e ficou pendurado. Executar diretamente lint, boundaries, typechecks, Vitest e builds; todos passaram.
- [x] Remover bancos e mensagens sintéticas temporários; preservar o banco dev e o workspace existentes. O container PostgreSQL foi reiniciado para o teste de persistência e voltou saudável.
- [x] Atualizar índice, memória e roadmap 04 com cobertura e limitações; manter exclusão global de conta, sucessão, offline e produção fora do escopo entregue.

## Aceite de encerramento

- [x] Tasks anteriores concluídas com evidências.
- [x] Percurso visual de convite e gestão exercitado com admin e técnico; proprietário confirmou convite/aceite, acesso, ações entre cargos e fluxo Android.
- [x] Tokens antigos e retries não concedem acesso depois de revogação; corridas têm resultado definido.
- [x] Segredos de backend ausentes do bundle web; tabela de convites negada ao papel de replicação e ausente da publicação Electric.
- [x] Banco dev preservado e recursos temporários removidos; desktop e Android foram validados pelo proprietário.
- [x] Slice marcada concluída após implementação e validação; sugerir commit Conventional Commits em português.

## Evidências

Integrações executadas em 25/10/2026. `node --import tsx apps/api/scripts/workspaces-flow.mjs` passou: migrations E02/E03 reaplicadas em banco sintético atualizado de schema preconvites, Mailpit/OTP, listagem de convites sem token, falha de entrega, expiração, reenvio, permissões, isolamento tenant e concorrência. `node --import tsx apps/api/scripts/auth-flow.mjs` passou: cadastro, login, OAuth simulado, OTP, expiração, recuperação, lockout e proteção de Origin. `node apps/api/scripts/empty-database.mjs` inicialmente revelou uma asserção obsoleta que esperava duas migrações; o script agora compara a contagem persistida com o journal atual (quatro), e a repetição passou instalação vazia, upgrade preservando workspace, reaplicação, persistência após restart, grants e exclusões de replicação. Todos os scripts encerraram com sucesso e seus finally removeram os bancos e mensagens temporários. A captura desktop inicial do proprietário mostrou `/equipe` autenticada, com lista de membros, diretório, formulário e convites carregados. Depois, o proprietário confirmou o aceite da conta secundária, ações com todos os cargos e fluxo funcional no Android.

Biome (125 arquivos), boundaries, Vitest (16), TypeScript contracts/API/web e builds API/web passaram; `node --import tsx apps/api/scripts/workspaces-flow.mjs` passou em banco sintético com auto rebaixamento/saída, perda de acesso e proteção do último administrador. `pnpm check` ficou pendurado sem saída; os equivalentes foram executados diretamente e passaram. O proprietário confirmou `/equipe` autenticado em desktop, convite/aceite, membership secundária e ações com os cargos; também confirmou o fluxo funcional no Android. Pequenos problemas de layout mobile foram aceitos para correção posterior e não bloqueiam esta validação integrada. As instâncias temporárias de API/Vite e as regras de firewall/portproxy foram encerradas e removidas; a API existente na porta 3000 permaneceu ativa. iPhone não foi testado.

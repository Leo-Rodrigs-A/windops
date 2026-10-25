# E06 — Interfaces de equipe e convite

## Status e dependências

Planejada. Depende de E01 e E03–E05.

- [ ] Task concluída.

## Objetivo e escopo

Integrar as funções administrativas à sidebar e permitir que o convidado conclua o vínculo pela interface. Usar componentes Shadcn e API real.

## Plano de implementação

- [ ] Reconfirmar pelo MCP Windows o documento Pencil pretendido e inspecionar referências relevantes; registrar inventário sem editar/copiar arquivos .pen.
- [ ] Se faltarem telas de equipe/convite, obter orientação para a composição a partir dos componentes existentes antes de fechar o layout final.
- [ ] Implementar navegação administrativa e tela de equipe com membros, cargo, busca/paginação, estados vazios, carregamento e erro recuperável.
- [ ] Implementar consulta de órfãos e formulário de convite: e-mail, cargo com Técnico padrão, validação, progresso e resultado de entrega.
- [ ] Exibir estado dos convites e ação de reenvio; diferenciar emitido, entregue quando comprovado, expirado, consumido e falha de envio.
- [ ] Implementar promoção e remoção com confirmação, usuário alvo claro e proteção contra submissão repetida; atualizar dados após confirmação da API.
- [ ] Implementar página de convite com continuidade segura por cadastro/login/código; informar conta incompatível sem consumir o token e permitir trocar de conta.
- [ ] Após aceite, atualizar `/api/me` e contexto para sair do estado sem vínculo; após remoção, tratar 403 e redirecionar sem loops.
- [ ] Garantir que URLs diretas sejam protegidas pelo servidor; esconder controle na UI não substitui autorização.
- [ ] Usar Shadcn para formulários, diálogos, feedback, navegação e listagem; adaptar desktop com sidebar e mobile com alvos táteis.
- [ ] Validar teclado, foco, mensagens acessíveis, leitor de tela, layout responsivo e ausência de ações de domínio ainda indisponíveis.

## Validação e aceite

- [ ] Admin consegue consultar equipe, convidar, reenviar, promover e remover técnico pela interface.
- [ ] Convidado aceita com conta correta e passa a ver o workspace; conta incorreta não recebe vínculo.
- [ ] Técnico não tem acesso à gestão por menu ou URL direta.
- [ ] Falhas da API, expiração do convite e revogação durante navegação têm saída compreensível.
- [ ] Comparação com referência autorizada, teclado e leitor de tela registrados; `pnpm check` passa.

## Evidências

Pendente. Referências não foram consultadas nesta preparação e nenhuma tela nova foi implementada.

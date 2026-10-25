# F08 — Validação integrada da fundação

## Status e dependências

Planejada. Depende de F01–F07 do [índice](README.md).

- [ ] Task concluída.

## Objetivo e escopo

Comprovar que banco, autenticação, autorização e interfaces funcionam juntos em ambiente reproduzível. Encerrar a slice com evidências; não liberar produção nem declarar offline/sync de negócio pronto.

## Plano de implementação

- [ ] Preparar execução isolada de testes com banco/volumes próprios, usuários e e-mails sintéticos. Não limpar volume de desenvolvimento do proprietário para obter resultado verde.
- [ ] Automatizar no CI criação/provisionamento, migração dupla e upgrade a partir da base inicial, testes de grants, integração com Electric permitido e execução do migrador na imagem da API. Injetar segredos efêmeros de teste sem publicar credenciais reais.
- [ ] Integrar testes de auth/tenancy com PostgreSQL e Mailpit: cenários negativos do Google usam provedor simulado controlado; fluxo real Google é validado separadamente com credenciais de desenvolvimento.
- [ ] Exercitar jornada ponta a ponta: cadastro, verificação de titularidade, bootstrap manual, senha + código, acesso à home, logout, Google + código para a mesma identidade verificada, recuperação e conta órfã. Conferir persistência de usuários/memberships após reinício da API e banco.
- [ ] Exercitar falhas: banco/e-mail indisponível, código expirado/reutilizado, reenvio concorrente, rede perdida após confirmação, sessão revogada, tenant forjado e membership removida. Registrar comportamento esperado e resultado sem vazar códigos/tokens.
- [ ] Testar segregação: runtime não faz DDL; replicação não lê auth; endpoints só retornam dados autorizados; docs não são servidas em produção; Electric não ganha rota pública; sync permanece fechado.
- [ ] Validar a configuração de produção com variáveis fictícias, cookies/TLS/origens e build de imagens. Registrar separadamente Neon, Resend real, domínio e deploy não exercitados; manter deploy desabilitado.
- [ ] Comparar UI com as referências confirmadas, validar mobile Android/iPhone e desktop, teclado e leitor de tela. Emulação não substitui evidência de aparelho real; registrar indisponibilidade sem marcar esse aceite como concluído.
- [ ] Rodar `pnpm check`, `pnpm test:integration`, validações Compose, build/checagens das imagens e testes de fluxo adicionados. Conferir que build/CI não exigem MCP, drive Windows nem `.pen`.
- [ ] Atualizar README, memória, modelo de dados e status das tasks/roadmap com comportamento realmente entregue e pendências. O roadmap 04 continua parcial enquanto convites/gestão de membros não existirem; etapas 05–11 não são concluídas por esta slice.

## Aceite de encerramento

- [ ] Todas as tasks anteriores possuem evidências e checkboxes coerentes; nenhum teste crítico está apenas escrito ou pulado.
- [ ] Configuração do zero e atualização preservando dados reproduzíveis; sem privilégios administrativos na API e sem segredos em arquivos versionados, logs ou bundle frontend.
- [ ] Rotas auth só foram habilitadas após testes de segunda etapa e vínculo verificado passarem; não há caminho de negócio antes do código.
- [ ] Google real e fluxos móveis validados, ou slice continua com bloqueio explicitamente registrado. Aprovação visual das telas faltantes documentada.
- [ ] Evidências distinguem fundação local concluída de produção/offline/funcionalidades ainda planejadas.

## Evidências

Pendente. Registrar data, ambiente/versões, comandos com resultados, dispositivos, migrações e matriz de cenários. Não usar a existência de workflow como evidência de CI executado.

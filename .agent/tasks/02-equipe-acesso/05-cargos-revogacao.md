# E05 — Promoção e revogação de membros

## Status e dependências

Planejada. Depende de E02 e E04.

- [ ] Task concluída.

## Objetivo e escopo

Permitir que admin promova técnico e revogue membership técnica sem excluir identidade, dados históricos ou acesso do usuário a outro workspace.

## Plano de implementação

- [ ] Implementar comandos pelo serviço público de workspaces, validando sessão completa e cargo admin no servidor.
- [ ] Promover técnico ativo do mesmo workspace; tratar repetição com resultado estável sem duplicar efeitos.
- [ ] Revogar membership por `revoked_at`, preservando a linha para referências históricas. Não apagar conta, sessões globais ou registros de outros tenants.
- [ ] Rejeitar remoção/rebaixamento de administrador, inclusive tentativa de usar esta rota para autoexclusão. Exclusão global e sucessão continuam fora desta slice.
- [ ] Definir bloqueios/versões para promoção concorrente com remoção e para perda do cargo do ator; autorização e escrita devem respeitar uma ordem transacional consistente.
- [ ] Invalidar convites pendentes anteriores à remoção de modo atômico; integrar a reintegração por convite novo definida em E02/E04.
- [ ] Comprovar revogação na próxima requisição autorizada; atualizar frontend/contexto ao receber perda de acesso. Contratos não prometem exclusão de cache offline ainda não implementado.
- [ ] Preservar resultados para retries: requisição antiga de remoção não deve revogar silenciosamente um vínculo reativado por convite posterior.
- [ ] Documentar erros de permissão/conflito e limitações da administração no OpenAPI.

## Validação e aceite

- [ ] Admin promove/remove técnico do próprio workspace; técnico e admin de outro workspace são negados.
- [ ] Admin alvo não pode ser removido/rebaixado; singleton não substitui checks tenant.
- [ ] Corridas promoção/remoção, aceite/remoção e replay após reintegração preservam os invariantes.
- [ ] Conta removida continua autenticável, porém sem acesso ao workspace; histórico e identidade preservados.
- [ ] Convite antigo não reativa membership revogada.
- [ ] `pnpm check` e integração workspaces passam, com evidências registradas.

## Evidências

Pendente. Nenhuma promoção/revogação por API implementada.

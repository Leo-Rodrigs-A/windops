# E04 — Emissão, reenvio e aceite de convites

## Status e dependências

Planejada. Depende de E02.

- [ ] Task concluída.

## Objetivo e escopo

Convidar por e-mail e permitir aceite apenas pela identidade correspondente, verificada e com segunda etapa concluída. Prazo de 48 horas, uso único e reenvio invalidante.

## Plano de implementação

- [ ] Implementar emissão somente por admin ativo do workspace, com e-mail normalizado e cargo permitido; Técnico é o padrão.
- [ ] Gerar token aleatório de alta entropia, armazenar hash e limitar tentativas/emissões/reenvios; definir respostas sem expor tokens em logs.
- [ ] Implementar reenvio com invalidação atômica do token anterior; concorrência entre reenvios deixa apenas um convite utilizável.
- [ ] Integrar o adaptador de e-mail existente, com Mailpit em dev. URL usa origem confiável configurada, sem Host ou destino arbitrário do cliente.
- [ ] Implementar entrega/erro/retry conforme E02. Falha de e-mail não pode ser apresentada como entrega concluída nem revalidar token antigo.
- [ ] Preparar fluxo de continuidade após cadastro/login/código; token sozinho não concede membership e GET no link não consome o convite.
- [ ] Aceitar em transação: validar hash, prazo, estado, e-mail verificado da sessão, segunda etapa e workspace; inserir/reativar membership e consumir convite juntos.
- [ ] Definir e implementar comportamento se a conta já for membro: não alterar cargo implicitamente e retornar resultado consistente com o contrato.
- [ ] Serializar aceite/reenvio/revogação com a membership afetada; retries não duplicam vínculo e convite consumido não reativa acesso depois de removido.
- [ ] Rejeitar conta de e-mail diferente, sessão incompleta, convite expirado/revogado e parâmetros de workspace/cargo forjados.
- [ ] Proteger o segredo do link contra logs, analytics e referrer; não expor convites pelo Electric. Envio a pessoas reais só quando solicitado no fluxo pelo proprietário.

## Validação e aceite

- [ ] Percurso Mailpit com cadastro e conta preexistente, incluindo retomada após segunda etapa.
- [ ] 48 horas verificadas no limite; token antigo falha após reenvio.
- [ ] Aceites simultâneos resultam em um único vínculo/consumo; replay após revogação não recupera acesso.
- [ ] E-mail errado, usuário não verificado, sessão pré-código, cargo forjado e técnico emissor rejeitados.
- [ ] Falha/retry de e-mail produz feedback honesto e mantém os invariantes.
- [ ] `pnpm check`, integração auth/workspaces e documentação dos contratos passam.

## Evidências

Pendente. Nenhum convite real enviado; Resend real permanece sem validação até configuração e execução próprias.

# E07 — Validação integrada da equipe e acesso

## Status e dependências

Planejada. Depende de E01–E06.

- [ ] Task concluída.

## Objetivo e escopo

Comprovar o percurso administrador → convite → técnico → promoção/revogação usando banco, API, e-mail e interface, preservando o ambiente dev do proprietário.

## Plano de implementação

- [ ] Revisar evidências de E01–E06 e executar cenários destrutivos/concorrentes somente em databases descartáveis com dados sintéticos.
- [ ] Exercitar migração do zero, upgrade preservando a fundação, reaplicação, grants e exclusão das tabelas privadas da replicação.
- [ ] Exercitar convite por admin, entrega no Mailpit, cadastro/login/código e aceite da conta correta; registrar variante com conta preexistente.
- [ ] Validar e-mail divergente, expiração de 48 horas, token inválido/usado, reenvio, tentativa por técnico e sessão pré-código.
- [ ] Exercitar concorrência aceite/reenvio/remoção/promoção e retry após reintegração, comprovando ausência de duplicação e restauração indevida de acesso.
- [ ] Confirmar que admin de A não lista nem altera membros exclusivos de B; apenas órfãos reais aparecem no diretório permitido.
- [ ] Conferir na UI desktop e Android convite, entrada no workspace, ações administrativas e perda de acesso após remoção; registrar iPhone somente se disponível e efetivamente testado.
- [ ] Testar falha de e-mail/API, recuperação, sessão expirada e rejeição de origem indevida nas mutações; nenhuma mensagem de sucesso sem confirmação.
- [ ] Executar `pnpm check` e integrações pertinentes, incorporar cobertura necessária ao CI e distinguir resultado local de execução remota.
- [ ] Remover fixtures, servidores e regras temporários; preservar conta admin dev e workspace criados intencionalmente em E01.
- [ ] Atualizar índices, memória, modelo e cobertura do roadmap 04; não declarar exclusão global de conta, offline ou produção entregues.

## Aceite de encerramento

- [ ] Tasks anteriores concluídas com evidências.
- [ ] Percurso de convite e gestão funciona com duas contas e permissões verificadas no servidor.
- [ ] Tokens antigos e retries não concedem acesso depois de revogação; corridas têm resultado definido.
- [ ] Dados pessoais/segredos ausentes de logs, bundle e publicação Electric.
- [ ] Banco dev preservado, temporários removidos, validação móvel e limitações registradas.
- [ ] Slice marcada concluída somente após implementação e validação; sugerir commit Conventional Commits em português.

## Evidências

Pendente. Planejamento não equivale a testes executados nem a funcionalidades entregues.

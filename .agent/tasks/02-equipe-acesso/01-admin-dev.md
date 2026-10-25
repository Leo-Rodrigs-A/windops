# E01 — Conta administradora no banco de desenvolvimento

## Status e dependências

Planejada. Depende da fundação concluída.

- [ ] Task concluída.

## Objetivo e escopo

Permitir ao proprietário conferir a área interna com uma conta real de desenvolvimento. Ele cria a conta pela interface; depois o agente executa o bootstrap administrativo já existente. A solicitação desta task autoriza essa execução futura em dev para a conta que o proprietário identificar; é necessário obter o e-mail/UUID correto, não renovar a autorização sem motivo.

## Estado atual e dados afetados

Existe [bootstrap-workspace.sql](../../../apps/api/scripts/bootstrap-workspace.sql), documentado e testado em [F05](../01-fundacao/05-autorizacao-bootstrap.md). Ele exige usuário verificado e UUIDs explícitos, cria o workspace piloto quando ausente e insere membership admin em transação. Não altera credenciais e não promove automaticamente uma membership de técnico ou revogada.

## Plano de execução

- [ ] Confirmar o alvo local de desenvolvimento, serviços disponíveis e origem da interface; preservar volume e contas existentes.
- [ ] Disponibilizar cadastro/login com autenticação habilitada somente para o ambiente necessário e orientar acesso ao Mailpit para verificação e código.
- [ ] Proprietário cria/verifica a conta e completa o login pela interface. Pode indicar explicitamente uma conta dev já criada; não solicitar senha ou códigos no chat.
- [ ] Obter do proprietário o e-mail ou UUID da conta escolhida. Consultar somente essa conta e confirmar UUID, e-mail normalizado e `email_verified = true`; não escolher por ordem de cadastro.
- [ ] Consultar workspace e membership existentes. Se houver workspace, reutilizar UUID/nome reais; se ausente, gerar UUID e usar nome de desenvolvimento “Wind Ops”, salvo indicação diferente do proprietário.
- [ ] Se houver membership técnica/revogada, outra conta ambígua ou conflito no workspace, explicar o estado e definir a correção específica antes de escrever; não contornar as validações do bootstrap.
- [ ] Executar o script abaixo com papel administrativo local, valores explícitos e `ON_ERROR_STOP`. Não fornecer privilégios administrativos ao runtime.
- [ ] Conferir por SQL a membership ativa `admin` para o usuário selecionado; verificar `/api/me` e contexto do próprio workspace após atualizar a sessão/interface.
- [ ] Proprietário confere home interna, sidebar, nome da conta e logout. Diferenciar controles já implementados dos que chegarão em E06.
- [ ] Registrar resultado sem segredos ou dados pessoais desnecessários; encerrar servidores/regras temporários que forem criados somente para essa validação.

## Procedimento SQL

Executar da raiz do repositório, substituindo os parâmetros pelos valores conferidos:

```sh
docker compose -f infra/compose.dev.yml exec -T postgres \
  psql -X -v ON_ERROR_STOP=1 \
    -v workspace_id='<uuid-do-workspace>' \
    -v workspace_name='Wind Ops' \
    -v user_id='<uuid-do-usuario-verificado>' \
    -U windops -d windops -f - \
    < apps/api/scripts/bootstrap-workspace.sql
```

Se o workspace já existir, passar seu nome exato. Repetir os mesmos parâmetros é no-op; conflitos abortam. Não criar novo SQL que marque e-mail como verificado ou ignore uma membership conflitante. O escopo é o PostgreSQL local, sem executar contra Neon/produção.

## Validação e aceite

- [ ] Conta identificada pelo proprietário, verificada pelo fluxo normal e com segunda etapa funcional.
- [ ] Bootstrap concluído sem alterar outros usuários ou apagar dados.
- [ ] Membership admin e acesso interno comprovados por SQL, API e conferência do proprietário.
- [ ] Nenhuma senha, token ou chave registrada em código/log/documentação.
- [ ] Evidências e índice atualizados; eventuais alterações de fonte passam por `pnpm check`.

## Evidências

Pendente. A criação/seleção da conta pelo proprietário e a execução do SQL ainda não ocorreram nesta task.

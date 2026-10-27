# S06 — Acesso offline, conflitos e recuperação

## Status

Planejada

- [ ] Task concluída

## Objetivo

Permitir continuidade local com sessão expirada e resolver pendências sem expor dados entre contas.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

## Dependências

S02, S03 e S05 concluídas.

## Escopo e exclusões

Retomada local, autenticação renovada, isolamento e conflitos; sem login inicial offline, bypass da segunda etapa ou atribuição de atendimento a terceiros.

## Plano de implementação

- [ ] Evoluir AuthProvider/guards para diferenciar sessão online válida, sessão expirada, indisponibilidade de rede e workspace local previamente preparado. Primeira autenticação e inclusão de novo workspace exigem internet e segunda etapa.
- [ ] Permitir consulta/registro local pelo usuário previamente autenticado quando sessão expirar; renovar autenticação antes de upload. Bloqueio/revogação explicitamente recebidos não podem cair no caminho de mera falta de rede.
- [ ] Tratar reintegração por convite e mudança de cargo como nova validação do vínculo: não retomar automaticamente comandos de um período revogado nem usar role persistida para conceder ações. Preservar pendências para revisão/exportação conforme identidade e membership autoritativas.
- [ ] Na revogação conhecida, encerrar streams/envios, impedir novas operações do workspace e manter pendências exportáveis para o dono. Documentar que revogação durante desconexão só pode ser conhecida na próxima comunicação.
- [ ] Isolar troca de conta/logout em todas as abas; parar workers, fechar coleções, descartar respostas tardias da sessão anterior e impedir que a próxima conta leia/envie sua fila. Resolver saída offline sem alegar revogação da sessão remota que não ocorreu.
- [ ] Antes de limpar dados ou sair com pendências, oferecer preservação protegida para a mesma conta ou exportação/descarte explícito. Não exigir apagar a fila para concluir logout; não permitir retomada automática de conta explicitamente desconectada.
- [ ] Apresentar conflito com versão base, local e remota; criador decide conteúdo, admin intervém por ações autorizadas de status. Primeiro atendimento válido confirmado no servidor vence. Nunca oferecer sobrescrita privilegiada que não exista na API.
- [ ] Definir correção/recriação de comandos rejeitados com nova identidade quando houver mudança de intenção; preservar trilha local e descendentes. Comando de resultado desconhecido deve ser reconciliado antes de substituição.
- [ ] Exportar pacote local legível/versionado de pendências e motivos sem dados de outra conta nem segredos; download deve funcionar sem rede. Não transferir autoria para outra conta nem importar/enviar automaticamente.

## Contratos e dados afetados

Estado de autenticação local mínimo e fila particionada; guards online/serviços públicos continuam autoritativos. Diálogos usando componentes Shadcn existentes.

## Testes e aceite

- [ ] Sessão expira em modo avião; reabrir, salvar, autenticar novamente com código e enviar uma vez.
- [ ] Revogar enquanto desconectado e em long poll, trocar de conta com request em voo e duas abas; confirmar bloqueio e ausência de vazamento.
- [ ] Dois técnicos iniciam a mesma issue e criador edita versão obsoleta: um estado remoto vence, texto local continua recuperável/exportável.
- [ ] Logout offline/online e descarte explícito não removem pendências por acidente; exportação pertence somente à conta de origem.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

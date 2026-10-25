# F04 — Autenticação completa e segunda etapa obrigatória

## Status e dependências

Planejada. Depende de [F03](03-schema-migracoes.md) e das decisões de provedor/desafio de F01.

- [ ] Task concluída.

## Objetivo e limites

Entregar cadastro, login e-mail/senha e Google, verificação de titularidade, segunda etapa obrigatória por e-mail, recuperação e logout. Nenhuma autenticação parcial pode acessar dados de negócio. Não implementar convites, exclusão de conta ou funções administrativas de membros.

## Plano de implementação

- [ ] Configurar Better Auth, integração Fastify e adaptador de dados conforme a prova de F01. Manter as rotas desabilitadas no app normal enquanto a suíte de segunda etapa/vinculação não passar; usar montagem isolada em testes para validar o fluxo completo antes de habilitar.
- [ ] Implementar cadastro e senha com hash gerenciado pelo provedor, normalização/unicidade de e-mail e verificação de titularidade. Não retornar senha/hash/segredos em DTOs, logs ou respostas de erro.
- [ ] Configurar Google com callback/base URL/origens explícitos. Vincular métodos somente após prova de titularidade de e-mail; não confiar em e-mail não verificado nem permitir que o simples conhecimento de um endereço vincule contas. Cobrir as duas ordens de criação: senha seguida de Google e Google seguido de senha.
- [ ] Executar a máquina de estados de F01 para toda nova sessão online, inclusive OAuth e login após recuperação: primeira etapa válida → desafio persistido → confirmação única → sessão liberada. Não oferecer dispositivo confiável, opção de pular código ou sessão de negócio emitida antes da confirmação.
- [ ] Aplicar validade de 15 minutos pelo relógio do servidor; reenvio invalida código anterior e renova prazo. Persistir tentativas/limites, vincular desafio à tentativa correta e consumir de modo atômico para evitar dois sucessos concorrentes. Não manter esse estado apenas em memória.
- [ ] Definir e documentar limites numéricos de tentativas, cooldown e envio por conta/IP, duração de sessão e política de renovação conforme a análise de segurança de F01. Provar limites no backend; contagem regressiva da UI é apenas informativa.
- [ ] Usar `EmailSender` para SMTP/Mailpit local e Resend em produção, com código/links sensíveis fora dos logs. Falha de envio deixa estado recuperável e nunca autentica o usuário. Tratar reenvio, indisponibilidade e limitação do provedor sem enumerar contas em respostas públicas.
- [ ] Implementar recuperação com token efêmero de uso único e política explícita de revogação das sessões após mudança de senha. Recuperação não equivale a sessão autenticada; o próximo login continua exigindo o código.
- [ ] Implementar sessão/cookies HttpOnly e Secure em produção, SameSite/origem/CSRF e proteção de callback OAuth conforme suporte validado do provedor. Reabrir sessão válida não solicita código novamente; logout revoga a sessão no servidor, sem copiar token para localStorage/IndexedDB.
- [ ] Exportar pelo serviço público de `identity` a identidade autenticada com segunda etapa concluída, sem expor registros internos. Definir contratos de cliente para os estados anônimo, aguardando código e autenticado; endpoints do provedor seguem sua API validada, sem aliases fictícios.
- [ ] Validar env obrigatória quando auth estiver habilitada; sem credenciais Google, manter a opção indisponível com limitação documentada. Isso não conclui o aceite Google. Montar `/api/auth/*` somente após os testes críticos passarem e manter sync fechado.

## Testes e aceite

- [ ] Senha e Google chegam ao desafio; acesso direto, cookies provisórios, callback OAuth, refresh ou endpoint alternativo não contornam a segunda etapa.
- [ ] Código incorreto, expirado, consumido, de outra tentativa e anterior ao reenvio é rejeitado; confirmar/reemitir em paralelo não gera duas sessões liberadas.
- [ ] Reiniciar API entre emissão e confirmação preserva desafio, expiração e limites. Falha de e-mail/rede permite retry controlado sem liberar sessão.
- [ ] E-mails não verificados não vinculam contas; duas autenticações concorrentes não criam identidades duplicadas. Sessão de conta órfã autentica identidade sem conceder workspace.
- [ ] Recuperação, logout, expiração, cookies, CSRF, origem não confiável e respostas sem segredos/enumeration leaks exercitados com PostgreSQL real e Mailpit; OAuth simulado cobre negativos em CI.
- [ ] Login Google real com credenciais de desenvolvimento e entrega de e-mail local comprovados; `pnpm check` e integração passam antes de habilitar rotas no app normal.

## Evidências

Pendente. Registrar decisões do provedor, matriz de testes e transição que libera sessão, limites escolhidos, ensaio Google real e limitações Resend. Nunca registrar códigos, cookies, tokens ou credenciais.

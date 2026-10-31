# O03 — Interface de cadastro em etapas

## Status

Concluída em 31/10/2026 para implementação; ensaio funcional fica em O04.

- [x] Task concluída

## Plano

- [x] Mostrar Google como primeira opção e e-mail como alternativa com apenas campo de e-mail.
- [x] Mostrar confirmação de envio sem revelar se o endereço já existe.
- [x] Abrir tela de nome/senha após link com token no fragmento da URL.
- [x] Abrir tela de nome/senha após callback Google e seguir para segundo passo obrigatório.
- [x] Manter login existente Google/e-mail e senha; oferecer vínculo somente conforme e-mail verificado.
- [x] Preservar acessibilidade/tokens/componentes atuais sem inventar novo layout.

## Evidências

31/10/2026 — `/cadastro` agora oferece ação Google e campo e-mail; `/cadastro/confirmar` conclui cadastro email; `/cadastro/perfil` trata onboarding Google em sessão pendente. Cliente same-origin valida respostas sem persistir o token; link o carrega no fragmento. `pnpm check` passou. Interface segue pendente de ensaio manual no browser em O04.

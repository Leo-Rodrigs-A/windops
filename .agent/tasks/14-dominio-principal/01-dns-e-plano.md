# DOM01 — Novo DNS e plano de transição

## Status

Planejada

- [ ] Task concluída

## Responsável

Proprietário fornece o hostname e administra a zona DNS; Codex inspeciona artefatos e registra plano/valores não secretos.

## Objetivo

Definir com precisão o novo domínio canônico, o comportamento desejado para o hostname antigo e a janela de mudança, sem alterar ainda produção.

## Escopo e exclusões

Inclui inventário read-only de DNS/configuração, hostname novo, provedores responsáveis e plano de cutover/rollback. Não altera DNS, ambiente privado, provedor de email, remetente ou configuração remota.

## Dependências

Nenhuma. DOM01 precisa preceder qualquer edição de configuração de produção ou mudança de DNS.

## Plano

- [ ] Registrar o hostname completo novo (sem esquema/caminho) e confirmar quem administra a zona DNS e o domínio registrável.
- [ ] Confirmar que o proprietário tem acesso ao painel DNS e ao Google Cloud OAuth; nunca solicitar ou armazenar credenciais em arquivo.
- [ ] Registrar o hostname atual `windops.devleonardo.com.br` como legado e confirmar que deve redirecionar permanentemente para o novo.
- [ ] Consultar os registros atuais e TTL de ambos os hosts (A/AAAA/CNAME aplicáveis); confirmar IP de destino e se IPv6 está operacional antes de publicar AAAA.
- [ ] Definir janela, sequência e responsáveis; combinar retenção prolongada de DNS antigo, Caddy e certificado enquanto links/bookmarks antigos puderem ser usados.
- [ ] Registrar rollback: restaurar `APP_ORIGIN`/Google/configuração canônica anterior e release anterior; conservar os registros/certificados de ambos os domínios.
- [ ] Capturar baseline HTTPS atual sem registrar cookies/tokens: homepage, `/api/health/live`, `/api/health/ready`, login, callback configurado, convite/recuperação e sync quando a conta de validação estiver disponível.
- [ ] Registrar status conhecido de D05/D06/D08 e confirmar SHA e digests ativos via fontes disponíveis antes do cutover; se não houver release rastreável ou rollback praticável, não avançar DOM04.

## Contratos e dados afetados

Nenhum. Somente inventário de hostname, TTL, resultados de resolução/HTTP e plano operacional não secreto.

## Testes e aceite

- Novo host determinado e sob controle do proprietário.
- Destino, DNS, TTL e janela registrados com segurança quanto a dados.
- Baseline do domínio atual e plano de rollback disponíveis; nenhuma mudança de produção feita nesta task.

## Evidências

Planejamento em 05/11/2026; execução pendente. Ao concluir, registrar hostnames, tipos/TTL e resultados observados, sem credenciais ou dados pessoais. Registrar explicitamente se DNS atual não puder ser inspecionado.

# D04 — Criar ambientes, contas e fornecer acessos

## Status

Planejada

- [ ] Task concluída

## Responsável

Proprietário; Codex fornece instruções e confere.

## Objetivo

Disponibilizar recursos externos e permissões mínimas para preparar o ambiente escolhido.

## Escopo e exclusões

Contas e metadados de operação; credenciais persistem apenas no local apropriado. Sem copiar dados dev para produção.

## Estado atual

Estado atual das contas de produção deve ser confirmado. Google funciona em desenvolvimento por aceite do proprietário; isso não configura automaticamente o domínio de produção.

## Dependências

D02; pode ocorrer junto de D03.

## Plano

- [ ] Proprietário criar/confirmar conta e projeto da hospedagem, cobrança/limites e máquina ou serviços previstos em D02; criar projeto/banco de produção separado do dev e ambiente descartável de ensaio quando necessário.
- [ ] Proprietário disponibilizar domínio e gestão DNS; criar/verificar remetente no Resend e configurar domínio, origem e redirect URI exatos do Google OAuth de produção conforme roteiro preparado pelo Codex.
- [ ] Proprietário criar/confirmar repositório, GHCR e GitHub Environment production, acesso administrativo para proteção da main e permissões para Actions/deploy.
- [ ] Codex preparar inventário com nome de cada variável, finalidade, onde cadastrar e responsável; proprietário cadastrar segredos no host/secret store/Environment, ou conceder acesso temporário restrito. Não colar segredos em chat, commits ou evidências.
- [ ] Proprietário fornecer apenas metadados não secretos: domínio, região, IDs dos projetos/repositório, hostname, usuário operacional e identificação explícita do futuro primeiro admin/workspace. Para VPS validar fingerprint SSH por canal confiável e chave dedicada; para PaaS usar escopo de projeto.
- [ ] Codex conferir conectividade e permissões sem exibir credenciais, registrar itens disponíveis/pendentes e método de revogação. Contratação e criação de contas pertencem ao proprietário; não presumir autorização para despesas.

## Contratos e dados afetados

Contas e metadados de operação; credenciais persistem apenas no local apropriado. Sem copiar dados dev para produção.

## Testes e aceite

Checklist de recursos e acessos conferido item a item. Acesso disponível não significa serviço configurado nem produção validada.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

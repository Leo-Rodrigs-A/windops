# S08 — PWA, reabertura e atualizações seguras

## Status

Planejada

- [ ] Task concluída

## Objetivo

Reabrir o app instalado sem rede e atualizar o app shell sem perder a fila.

## Estado atual

Planejada em 26/10/2026. O plano não comprova implementação nem validação. Ver a base existente e os limites no [índice da slice](README.md).

## Dependências

S02, S06 e S07 concluídas.

## Escopo e exclusões

Service worker, cache de app shell, instalação e atualização; background sync opcional e sem garantia de envio com app fechado.

## Plano de implementação

- [ ] Implementar registro/versão do service worker e estratégia de cache do app shell/rotas/assets locais compatível com o build. Reutilizar manifest/ícones da torre existentes e verificar escopo/start_url.
- [ ] Não armazenar respostas de auth, OTP, tokens, diretório/equipe ou API genérica no Cache Storage; dados operacionais pertencem à base local particionada. Não cachear respostas tenant sob URLs compartilhadas sem isolamento.
- [ ] Carregar rotas protegidas offline com o contexto local autorizado da S06, inclusive deep link após encerramento. Sem autenticação/preparação anterior, orientar primeira conexão.
- [ ] Coordenar atualização do shell, migração local e múltiplas abas. Não aplicar reload que perca formulário; preservar fila e oferecer recuperação se versão nova não ler schema antigo. Não usar limpeza global como estratégia de upgrade.
- [ ] Garantir envio ao abrir/retomar conectado; tratar suspensão/background como interrupção comum do executor. Se usar background sync, manter como melhoria facultativa com a mesma autorização/idempotência.
- [ ] Validar contexto seguro em dev para aparelhos reais; documentar exposição temporária, configuração de origem/cookies e limpeza de portproxy/firewall/servidores usados.
- [ ] Definir comportamento ao recusar instalação/permissão de persistência e em navegador sem suporte escolhido; apresentar limites reais sem prometer proteção contra remoção do app/dados.

## Contratos e dados afetados

Configuração web/build, manifest e service worker; modelo de versões local/shell acordado na S01. Nenhuma credencial Electric ou auth em assets precacheados.

## Testes e aceite

- [ ] Instalar, preparar, ativar modo avião, encerrar e reabrir pelo ícone e por rota interna; recuperar UI e pendências.
- [ ] Atualizar com fila pendente, formulário aberto e duas abas em versões diferentes; crash durante upgrade não apaga trabalho.
- [ ] Inspecionar caches por conta e requests de auth; verificar retomada em Android/iPhone e registrar plataforma indisponível sem declarar suporte testado.
- [ ] Registrar arquivos alterados, comandos/resultados e limitações antes de marcar conclusão.

## Evidências

26/10/2026: planejamento documental baseado no código e nas slices anteriores. Nenhuma implementação, migration, prova de persistência ou teste de aplicação executado nesta preparação. Preencher evidências reais durante a execução.

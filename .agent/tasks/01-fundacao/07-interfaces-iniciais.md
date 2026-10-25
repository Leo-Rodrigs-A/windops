# F07 — Telas e navegação autenticada

## Status e dependências

Planejada. Depende de [F04](04-autenticacao.md), [F05](05-autorizacao-bootstrap.md) e [F06](06-design-system.md).

- [ ] Task concluída.

## Objetivo e escopo

Entregar um fluxo real da entrada pública até a home autorizada, com estados claros de login e conta sem vínculo. Usar referências confirmadas em F06; não inventar telas definitivas para preencher lacunas do `.pen`.

## Plano de implementação

- [ ] Organizar rotas TanStack Router e componentes por responsabilidade, substituindo a landing técnica sem concentrar todos os fluxos em `main.tsx`. Rotas de UI: `/`, `/entrar`, `/cadastro`, `/verificar-email`, `/confirmar-acesso`, `/recuperar-senha`, `/redefinir-senha`, `/sem-workspace` e `/app`; callbacks seguem a configuração real do provedor.
- [ ] Conectar formulários e cliente de auth aos contratos validados em F04: cadastro/senha, entrada Google, verificação, código, reenvio e recuperação. Não simular sucesso nem usar usuário hardcoded. Evitar token de sessão em armazenamento JavaScript; tokens efêmeros de links são consumidos conforme API do provedor, sem logging.
- [ ] Implementar resolução inicial de sessão e consulta `GET /api/me` com estados separados de carregamento, anônimo, desafio pendente, autenticado sem vínculo, autenticado com vínculo e erro de rede. Não redirecionar para login só porque a API ficou indisponível.
- [ ] Renderizar `/confirmar-acesso` com validade/reenvio informados pelo servidor, erros acessíveis e recuperação após refresh. O countdown não determina validade; nunca saltar a segunda etapa por flag local.
- [ ] Proteger `/app` no router para experiência de navegação e sempre chamar `GET /api/workspaces/:workspaceId/context` no servidor. Conta sem membership vai para `/sem-workspace`, com explicação e saída, sem ações de negócio. No piloto, usar o único vínculo permitido, sem construir seleção multi-workspace agora.
- [ ] Implementar a estrutura da home baseada em `FGvyG`: cabeçalho, área principal e navegação disponível, com identidade/workspace reais. Como issues ainda não existem, apresentar estado explícito de módulo em preparação; não mostrar chamados de exemplo como dados persistidos nem afirmar que a consulta retornou vazia.
- [ ] Omitir ações sem backend (criação/status/filtros de chamados, sino e sincronização); não mostrar “sincronizado” ou “offline pronto”. A aparência dos estados do design poderá ser reaproveitada em slices futuras, sem ativar agora seus fluxos.
- [ ] Tratar logout, expiração e membership removida: revogar sessão quando aplicável, limpar estado de identidade em memória e impedir renderização de dados da conta anterior. Não criar estratégia genérica de apagar outbox futura; persistência offline permanece fora do escopo.
- [ ] Cobrir estados de envio, botão ocupado, duplo clique, erro recuperável, link de recuperação inválido/expirado e callback cancelado. Mensagens em pt-BR sem revelar existência de conta ou detalhes internos.
- [ ] Ajustar responsividade e acessibilidade com componentes de F06, incluindo teclado móvel, foco após erros/navegação, leitura de mensagens e retorno seguro apenas a destinos internos.

## Testes e aceite

- [ ] Fluxo de cadastro/verificação, login senha + código, Google + código, recuperação, refresh de sessão e logout contra API/PostgreSQL reais; Mailpit permite conferir envio local.
- [ ] Acesso direto a `/app`, sessão incompleta, conta órfã, sessão expirada e vínculo revogado produzem estados corretos, com proteção também comprovada no backend.
- [ ] Falha de rede não vira mensagem falsa de credenciais inválidas nem promessa de trabalho offline; reenvio e retomada obedecem aos limites reais.
- [ ] Comparação visual com os frames/referências aprovados de F06, mobile/desktop, teclado e leitor de tela. Não concluir fidelidade de uma tela sem referência aprovada.
- [ ] `pnpm check` e testes de fluxo passam; links/controles visíveis executam apenas funcionalidades reais desta slice.

## Evidências

Pendente. Registrar rotas entregues, fluxos e dispositivos/viewports exercitados, referência visual de cada tela e qualquer bloqueio externo. Interfaces simuladas não atendem o aceite.

# F07 — Telas e navegação autenticada

## Status e dependências

Concluída em 25/10/2026. Dependências F04, F05 e F06 concluídas; API de auth e autorização já disponíveis, com rotas montadas apenas quando `AUTH_ENABLED=true`.

- [x] Task concluída.

## Objetivo e escopo

Entregar um fluxo real da entrada pública até a home autorizada, com estados claros de login e conta sem vínculo. Usar referências confirmadas em F06; não inventar telas definitivas para preencher lacunas do `.pen`.

## Plano de implementação

- [x] Organizar rotas TanStack Router e componentes por responsabilidade, substituindo a landing técnica sem concentrar todos os fluxos em `main.tsx`. Rotas de UI: `/`, `/entrar`, `/cadastro`, `/verificar-email`, `/confirmar-acesso`, `/recuperar-senha`, `/redefinir-senha`, `/sem-workspace` e `/app`; callbacks seguem a configuração real do provedor.
- [x] Conectar formulários e cliente de auth aos contratos validados em F04: cadastro/senha, entrada Google, verificação, código, reenvio e recuperação. Não simular sucesso nem usar usuário hardcoded. Evitar token de sessão em armazenamento JavaScript; tokens efêmeros de links são consumidos conforme API do provedor, sem logging.
- [x] Implementar resolução inicial de sessão e consulta `GET /api/me` com estados separados de carregamento, anônimo, desafio pendente, autenticado sem vínculo, autenticado com vínculo e erro de rede. Não redirecionar para login só porque a API ficou indisponível.
- [x] Renderizar `/confirmar-acesso` com validade/reenvio informados pelo servidor, erros acessíveis e recuperação após refresh. O countdown não determina validade; nunca saltar a segunda etapa por flag local.
- [x] Proteger `/app` no router para experiência de navegação e sempre chamar `GET /api/workspaces/:workspaceId/context` no servidor. Conta sem membership vai para `/sem-workspace`, com explicação e saída, sem ações de negócio. No piloto, usar o único vínculo permitido, sem construir seleção multi-workspace agora.
- [x] Permitir que a conta sem workspace retorne à home pública preservando a sessão, com acesso de volta ao estado de vínculo e saída explícita; impedir que o guard entre em redirecionamento circular.
- [x] Implementar a estrutura da home baseada em `FGvyG`: cabeçalho, área principal e navegação disponível, com identidade/workspace reais. Como issues ainda não existem, apresentar estado explícito de módulo em preparação; não mostrar chamados de exemplo como dados persistidos nem afirmar que a consulta retornou vazia.
- [x] Omitir ações sem backend (criação/status/filtros de chamados, sino e sincronização); não mostrar “sincronizado” ou “offline pronto”. A aparência dos estados do design poderá ser reaproveitada em slices futuras, sem ativar agora seus fluxos.
- [x] Tratar logout, expiração e membership removida: revogar sessão quando aplicável, limpar estado de identidade em memória e impedir renderização de dados da conta anterior. Não criar estratégia genérica de apagar outbox futura; persistência offline permanece fora do escopo.
- [x] Cobrir estados de envio, botão ocupado, duplo clique, erro recuperável, link de recuperação inválido/expirado e callback cancelado. Mensagens em pt-BR sem revelar existência de conta ou detalhes internos.
- [x] Ajustar responsividade e acessibilidade com componentes de F06, incluindo teclado móvel, foco após erros/navegação, leitura de mensagens e retorno seguro apenas a destinos internos.

## Testes e aceite

- [x] Fluxo de cadastro/verificação, login senha + código, Google + código, recuperação, refresh de sessão e logout contra API/PostgreSQL reais; Mailpit permite conferir envio local.
- [x] Acesso direto a `/app`, sessão incompleta, conta órfã, sessão expirada e vínculo revogado produzem estados corretos, com proteção também comprovada no backend.
- [x] Falha de rede não vira mensagem falsa de credenciais inválidas nem promessa de trabalho offline; reenvio e retomada obedecem aos limites reais.
- [x] Comparação visual com os frames/referências aprovados de F06 em mobile e desktop; navegação por teclado e árvore de acessibilidade do Chromium inspecionadas.
- [x] Validação manual com leitor de tela real: proprietário confirmou leitura correta com Narrador do Windows.
- [x] `pnpm check` e testes de fluxo passam; links/controles visíveis executam apenas funcionalidades reais desta slice.

## Evidências

Implementação concluída em 25/10/2026. Foram adicionadas as nove rotas, cliente de auth HTTP same-origin, sessão protegida por `/api/me` e contexto autorizado pelo servidor, formulários reais Better Auth e home/sidebar responsivas com Shadcn e dados reais de identidade/workspace. Conta sem membership recebe estado próprio e pode voltar à home pública sem perder a sessão ou encerrar a sessão por um botão explícito; na top bar, o nome autenticado aparece ao lado do logout. Ações de negócio sem backend foram omitidas. Erros, carregamento, rate limit, callbacks e links expirados têm estados explícitos; tokens de sessão não são guardados em storage JavaScript.

Validação concluída em 25/10/2026: `pnpm check` passou (Biome, boundaries, typechecks, 11 testes e build); `pnpm test:auth-integration` passou para verificação, senha/Google + vínculo, segunda etapa, OTP atômico, restart, recuperação e lockout; `pnpm test:workspaces-integration` passou para bootstrap, identidade (incluindo nome em `/api/me`), órfão, isolamento por tenant, roles e revogação. O proprietário concluiu cadastro pela interface, percorreu o fluxo até a conta sem workspace, identificou a ausência de retorno e confirmou a correção com home mantendo sessão e logout. Referências F06 comparadas em desktop 1440×900 e mobile 402×874; sete rotas públicas verificadas sem overflow horizontal. Navegação por teclado e árvore AX do Chromium inspecionadas; o proprietário confirmou que o Narrador do Windows anunciou os controles corretamente. Sem bloqueios de validação conhecidos.

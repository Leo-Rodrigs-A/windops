# Memória do projeto

## Contexto e prioridades

Engenheiros visitam parques sem internet, encontram problemas nos elevadores e frequentemente não têm materiais para resolver. Hoje dependem de lembrar de transcrever para planilhas. Wind Ops deve salvar na visita e sincronizar depois, sem transcrição. Piloto texto apenas, PWA Android/iPhone, offline por algumas horas. Aproximadamente 12 usuários, 8 parques e 8 turbinas por parque; quantidades configuráveis.

Idioma inicial pt-BR. Layout mobile e design system são referências do proprietário em arquivos `.pen` do Pencil/pen.dev, mantidos em uma pasta local do Windows fora do repositório. Não copiar nem commitar esses arquivos; usá-los somente como guia para implementar o frontend. Não inventar telas definitivas. Não criar site com serviços externos. Repositório alvo /home/leodevanda/proj-pessoais/windops, Ubuntu-24.04.

## Fluxo de referência visual — 24/10/2026

- Pencil/pen.dev executa no Windows; Codex CLI executa no WSL2 e consulta os designs pelo MCP do aplicativo Windows. Confirmar o documento ativo antes de usá-lo e não editar designs sem solicitação explícita.
- Em consulta posterior nesta sessão, o documento ativo passou a `G:\Meu Drive\01 - TRABALHO\08 - PENCIL WORKSPACES\WindOps.pen`. Tratar esse caminho como referência local observada, reconfirmando o documento ativo antes de trabalhar. Não criar uma pasta `.pencil` no repositório para armazenar as referências.
- Conexão MCP validada nesta sessão por `initialize`, `tools/list` e `get_app_state`. O documento ativo na consulta foi `C:\Users\leo-a\Downloads\WindOps.pen`, com “Guia de Estilo”, “Componentes” e “Home Screen Actions - dark mode”. Essa consulta confirma acesso, não revisão completa nem aprovação das telas.
- Código, tokens, componentes e decisões de implementação ficam versionados; os documentos de design externos não integram build, CI ou runtime. Referências indisponíveis ou incompletas devem ser sinalizadas, sem inventar o visual final.
- Documentação do fluxo atualizada; implementação visual da etapa 02 do roadmap permanece planejada, com entrega inicial agora detalhada em F06/F07 da fundação. Mudança somente documental, sem execução de `pnpm check`.

## Organização das tasks — 24/10/2026

- As 11 slices originais foram movidas para [tasks/00 - roadmap](tasks/00%20-%20roadmap/README.md), preservando números e objetivos como visão geral. Novas slices executáveis terão pastas próprias e arquivos de tasks detalhados com status, checkboxes, dependências, plano, testes e evidências, criados progressivamente.
- Primeira slice: [01 — Fundação](tasks/01-fundacao/README.md), com oito tasks. F01–F05 concluídas; F06 referências visuais é a próxima. O schema e estado aplicado estão em [`.agent/database.md`](database.md).
- Escopo da fundação: PostgreSQL com privilégios mínimos, schema de identidade/memberships, autenticação senha/Google com código obrigatório por e-mail, autorização e bootstrap explícito, componentes e telas iniciais. Convites, administração completa de membros, parques/issues, offline e push continuam para slices futuras; implantação de produção continua no roadmap 11.
- Leitura estrutural via MCP confirmou guia claro/escuro, Inter, componentes e home escura com variantes. `GetVariables()` retornou vazio; nenhum componente reutilizável formal foi listado. Login/cadastro/código/recuperação não foram identificados como telas explícitas; F06 deve conferir screenshots e obter referências/composições aprovadas para o que faltar.
- Rótulos “Aberto/Resolvendo/Concluído” e filtro por data aparecem no desenho; não alteram automaticamente os estados e filtros da memória. Conciliar antes de implementar esses fluxos de produto.
- A reorganização e os planos foram concluídos em etapa anterior; esta task implementou e validou schema/migrações da fundação, sem alterar os designs externos.
- Validação documental conferiu 26 arquivos Markdown, os 11 arquivos movidos, oito tasks com checkboxes e links locais sem destinos inexistentes. `pnpm check` não executado nesta atualização documental.

## Identidade e empresa

- Landing pública descreve projeto e permite login quando a slice estiver pronta.
- Google e e-mail/senha abrem a mesma conta para o mesmo e-mail verificado.
- Código por e-mail obrigatório em todo novo login online; 15 minutos; reenvio invalida anterior e reinicia validade. Reabrir sessão existente não exige código.
- Conta pode existir órfã; sem membership não acessa dados operacionais.
- Contas com múltiplos vínculos são suportadas conceitualmente; limite atual de um workspace na instalação.
- Primeiro administrador configurado manualmente no banco. Demais promoções pela interface.
- Admin vê membros da própria empresa e órfãos, nunca membros exclusivos de outra empresa.
- Convite vinculado ao e-mail selecionado, login da mesma conta, uso único, Resend, 48 horas, cargo selecionado (Técnico por padrão). Reenvio invalida convite anterior.
- Cargos: Administrador e Técnico. Ambos podem trabalhar em issues.
- Somente admin cria/altera/desativa parques/turbinas, convida/remove membros e promove técnicos.
- Admin não rebaixa nem remove outro admin. Pode excluir a própria conta; último admin precisa promover sucessor antes. Preservar histórico exibindo Usuário excluído.
- Remoção de membro não é exclusão da conta global.
- Resend inicialmente só convites, códigos e recuperação de senha; plano gratuito de testes. Nenhum e-mail de evento de issue.

## Equipamentos e formulário

- Parques P01…PX; turbinas T01…TX, código único por parque. Cada turbina possui um elevador; não criar gestão separada de elevadores no piloto.
- Nova issue seleciona parque, turbina e texto livre obrigatório descrevendo o problema. Sem título separado, fotos ou lista de materiais nesta versão.
- Equipamento desativado não recebe novas issues. Bloquear desativação de parque/turbina com issue Pendente ou Em andamento.
- Filtros por parque/turbina. Concluídas e desativadas têm listas separadas.
- Ordenação original dizia “cronológica invertida” mas esclarecia recentes abaixo: adotar criação crescente (antigas primeiro) como interpretação documentada; confirmar no layout.

## Ciclo e permissões

- Estados Pendente -> Em andamento -> Concluída. Iniciar atendimento é obrigatório antes de concluir.
- Não existe atribuição a terceiros. A transição registra quem iniciou, que passa a controlar conclusão/devolução; histórico preserva atores anteriores.
- Somente técnico que iniciou devolve para Pendente ou conclui. Admin pode liberar atendimento com problema, retornando para Pendente.
- Criador pode atender sua issue, mas só concluir uma hora após criação. Outro técnico não precisa esperar. Horário do aparelho conta offline; banco local não fornece relógio independente confiável. Validação de coerência no servidor sem prometer proteção contra manipulação.
- Qualquer cargo cria issues; cada usuário edita somente as próprias, enquanto abertas. Campos editáveis: texto, parque, turbina. Toda mudança registra antes/depois e autor. Admin não recebe exceção geral para editar conteúdo alheio.
- Tocar Concluir abre tela semelhante ao detalhe, relato opcional; só confirma estado ao salvar nessa tela. Voltar mantém Em andamento.
- Conclusão criada offline continua acessível localmente; autor da conclusão pode editar o relato somente enquanto offline e ainda não sincronizado. Após envio, bloqueado ao técnico.
- Só admin reabre: volta Pendente, sem atendimento ativo, relato atual vazio, histórico anterior preservado.
- Todos com acesso à issue veem logs. Somente admin restaura relato anterior por botão, online, com confirmação explícita de substituição. Não altera status e gera novo evento; não restaura texto/localização pelo histórico no piloto.
- Criador desativa somente suas Pendentes. Admin desativa Pendentes/Em andamento, inclusive alheias; ninguém desativa Concluídas.
- Desativadas ficam em Arquivadas; somente admin reativa, sempre Pendente sem atendimento ativo. Preservar logs; não exclusão física.

## Offline e conflitos

- Primeira autenticação exige internet. Dispositivo autenticado continua consultando e registrando offline mesmo se sessão expirar; precisa reautenticar para sincronizar.
- Persistir issues abertas/em andamento, logs e catálogos necessários. Concluídas exigem rede salvo cache existente ou conclusão local pendente. Não descartar dados não enviados.
- Envio automático com app aberto/retomado; aceito abrir PWA para garantir envio. Segundo plano é oportunista e não garantido no iPhone.
- Fechar app, reiniciar aparelho, falhar rede ou atualizar PWA não pode apagar fila.
- Conflitos explícitos. Primeiro atendimento válido aceito no servidor vence; preservar alteração do segundo para revisão. Criador resolve texto; admin intervém em status.
- Membro removido tem upload bloqueado; manter pendências no aparelho e permitir exportação.
- Históricos e notificações não duplicam em reenvios idempotentes.

## Notificações

- Cada evento do histórico gera notificação interna individual, sem agrupamento.
- Criação gera um push por issue para demais membros do workspace; autor da ação não recebe sua notificação.
- Edição, início, devolução, conclusão, reabertura, arquivamento, reativação e restauração ficam na campainha.
- Se criação e conclusão chegarem juntas de um aparelho offline: preservar todos os logs, suprimir aviso de criação e enviar somente notificação interna da conclusão. Nenhum push nesse caso.
- Se criação já foi enviada/notificada, não tentar desfazer o push; seguir com aviso interno de conclusão.

## Infra e escopo

Frontend/backend/Electric na mesma VPS Hostinger, Postgres local dev e Neon produção. GitHub Actions após main; Docker Compose; Caddy; Resend externo. Sem homologação inicialmente, mas configuração por ambiente. Dashboards e métricas individuais adiados.

RNFs originais: carregamento <2s e SLA 99,5% são metas ainda sem medição/SLO operacional; não declarar atendidos no bootstrap. Registrar protocolo de medição e manutenção na [etapa 11 do roadmap](tasks/00%20-%20roadmap/11-production.md).

## Situação da entrega

Base criada com apps, contratos, configuração ShadcnUI, health checks, schema inicial, Compose e CI/CD bloqueado por variável. Autenticação Better Auth/Fastify e autorização/bootstrap de workspace estão implementadas e validadas; auth permanece opt-in. PWA, persistência, sync autorizada, issues e notificações continuam planejados.

F04 concluída — 25/10/2026: implementado Better Auth/Fastify e fluxos de senha e OAuth com verificação de e-mail, desafio persistido de 8 dígitos, barreira para sessão pendente, rotação/limites, recuperação, logout e vinculação nas duas ordens. `pnpm check`, integração PostgreSQL/Mailpit com OAuth simulado e login Google real em banco descartável passaram. Banco e página temporários foram removidos. Rotas permanecem desativadas por padrão (`AUTH_ENABLED=false`).

F05 concluída — 25/10/2026: implementada autorização por tenant consumindo identidade validada pelo serviço público de `identity`; `/api/me` retorna perfil mínimo e memberships ativas, e `/api/workspaces/:workspaceId/context` exige segunda etapa concluída e membership ativa consultada a cada requisição. Guard aceita restrição por cargo para handlers futuros. Bootstrap transacional explícito em `apps/api/scripts/bootstrap-workspace.sql`, idempotente e com falha segura para conflitos; instruções operacionais na task. `pnpm check`, `pnpm test:workspaces-integration` (PostgreSQL descartável: isolamento entre tenants, papéis, órfão, sessão pendente, revogação e bootstrap) e `pnpm test:integration` passaram. Nenhum bootstrap foi aplicado a uma conta real; auth permanece desligada por padrão.

F02 — PostgreSQL e privilégios — 25/10/2026: provisionador idempotente aplicado no volume WSL existente; `windops_app`, `windops_migrator` e `windops_replication` separados, migração exige URL própria e publicação manual do Electric inclui somente `workspaces`. Instalação vazia, grants, restart/restore e shape passaram. `.env` local foi atualizado sem commit. Neon/VPS não provisionados.

F03 — Schema e migrações — 25/10/2026: adicionada migração `0001_auth_core` com tabelas Better Auth, challenges e memberships. Migração local aplicada; testes descartáveis cobrem instalação vazia, concorrência/reaplicação, upgrade preservando workspace, constraints, timestamps, grants, restart e membership em múltiplos workspaces com singleton removido apenas na fixture. Imagem de runtime executou migrador. `pnpm check` (9 testes e builds) e `drizzle-kit check` passaram. Rotas auth continuam desativadas; F04 é a próxima task.

Validação em 24/10/2026:
- 9 testes em 3 arquivos passaram (contratos, configuração e API).
- TypeScript de contratos/API/frontend passou; API e frontend compilados; bundle Vite gerado.
- Biome e verificador de limites dos módulos passaram.
- Lockfile gerado e resolução frozen/lockfile-only confirmada. Instalação completa no Windows interrompida por proibição de junctions; validação usou pacotes baixados e cópia local do pacote contracts. node_modules do Windows NÃO foi copiado para WSL.
- Compose dev e produção validados pelo Docker Compose oficial v5.6.1, sem daemon.
- Workflows validados com actionlint v1.7.12; shellcheck/pyflakes não disponíveis.
- API compilada iniciada de verdade: live 200, ready 503 sem dependências, docs 200 e auth 404.
- Migração SQL gerada, mas execução em PostgreSQL vazio e teste Electric NÃO realizados localmente.
- Build/execução Docker e deploy NÃO realizados; CI contém esses passos para execução no GitHub.
- Git inicializado em main, sem commit, remoto ou publicação. Fontes copiadas e conferidas por hash no WSL. Ambiente da sessão permite acesso a arquivos WSL via UNC, mas wsl.exe retorna E_ACCESSDENIED e Docker não está disponível no Windows. Verificações de contêineres precisam de runner Linux/WSL com Docker; não confundir arquivos CI com execução confirmada.

## Pendências externas

Criar repositório GitHub, VPS, domínio/DNS, Neon, conta/domínio Resend, aplicação OAuth Google e chaves VAPID quando as slices exigirem. Nenhum desses serviços foi provisionado nesta entrega. Para F06/F07, reconfirmar o documento externo no Windows e resolver as referências faltantes de autenticação com o proprietário; o acesso ao documento consultado já foi validado, sem incorporá-lo ao repositório.

## Verificação local posterior — 24/10/2026

Esta observação de 24/10 atualizou o bloqueio de Docker do registro histórico: `docker compose -f infra/compose.dev.yml ps` mostrou PostgreSQL, Electric e Mailpit ativos/saudáveis no WSL. Naquele momento, migração do zero/reaplicação, shape, grants, restauração e build ainda não tinham sido executados; F02 agora cobre as validações de privilégios locais. Containers saudáveis não comprovam autenticação funcionando.

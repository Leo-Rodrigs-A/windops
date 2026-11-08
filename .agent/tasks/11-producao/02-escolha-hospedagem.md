# D02 — Escolher hospedagem e parâmetros do piloto

## Status

Concluída em 02/11/2026

- [x] Task concluída

## Responsável

Proprietário decide; Codex prepara comparação.

## Objetivo

Escolher um destino executável e fixar os parâmetros que orientam o provisionamento.

## Escopo e exclusões

Decisão de infraestrutura; preserva monólito modular e uma origem pública. Não exige múltiplos provedores funcionando simultaneamente.

## Estado atual

Destino escolhido e provisionado pelo proprietário: VPS Hostinger KVM1 no Brasil, Ubuntu 24.04.5 LTS, 1 vCPU/4 GB, com Docker Engine 29.9.2 e Compose 5.6.1 instalados; Neon Free em São Paulo. Proprietário confirma pagamento à vista de R$625 por 24 meses; renovação/condições após o prazo não informadas. Não haverá homologação permanente nem despesas adicionais planejadas. O hostname `windops.devleonardo.com.br` tem registro A criado na Vercel e o proprietário confirmou que resolve para o IPv4 da VPS. KVM2 continua como opção de upgrade após medir carga, sujeito a preço/condições então vigentes. A tentativa anterior de criar Oracle A1 em São Paulo/AD-1 falhou por falta de capacidade; não foi criada VM.

## Dependências

D01.

## Plano

- [x] Codex comparar VPS (Hetzner/Hostinger) e um PaaS candidato (Render), consultando documentação/preços oficiais atuais; registrar custo total estimado de compute, banco, storage, backups e tráfego sem pressupor gratuidade.
- [x] Avaliar a viabilidade por documentação do provedor e inspeção da topologia existente: VPS Linux com Docker/Compose; Caddy como única entrada pública; API/worker e Electric em rede interna, com volume persistente para Electric; long polling configurado; migração em job separado e deploy por SHA com health check. Neon oferece logical replication. As condições ainda não comprovadas no destino — privilégios/publicação/TLS/slots, comportamento scale-to-zero, carga no KVM1, firewall/HTTPS e execução do primeiro deploy — foram transferidas explicitamente para D03/D05/D06/D08. Não declarar aptidão de carga nem operação validada por esta análise.
- [x] Proprietário escolher e pagar Hostinger KVM1 Brasil (Ubuntu 24.04, 24 meses pré-pagos, R$625 segundo proprietário) e confirmar Neon Free; não quer despesas adicionais e não haverá homologação permanente. Registro A `windops.devleonardo.com.br` criado na Vercel e resolução ao IPv4 da VPS confirmada pelo proprietário. Renovação após o período não informada. Não substituir o banco silenciosamente.
- [x] Definir política sem custo adicional: manter backup automático semanal Hostinger e usar a janela de restauração instantânea de 6 horas do Neon Free (PITR, não backup semanal separado). Limites/RPO operacional e meta de RTO aceitos pelo proprietário em 02/11/2026 e detalhados abaixo; não são SLA nem restore exercitado.
- [x] Registrar decisão, topologia, parâmetros, limites e recursos/acessos de D04 nos documentos de operação, arquitetura e memória. Nenhuma contratação adicional.

## Contratos e dados afetados

Decisão de infraestrutura; preserva monólito modular e uma origem pública. Não exige múltiplos provedores funcionando simultaneamente.

## Testes e aceite

Destino e orçamento escolhidos pelo proprietário, adequação condicional documentada e inventário de recursos/acessos definido. Runtime, carga, configuração do Neon e recuperação permanecem gates das tasks seguintes; a conclusão desta decisão não declara produção pronta.

## Política de recuperação aceita — 02/11/2026

- **Neon Free:** console informa janela de histórico/PITR de até 6 horas; registrar como capacidade, não garantia de RPO nem backup semanal programado. Proprietário retirou teste de recuperação Neon do escopo; não restaurar `production` nem criar branch para esse aceite. A recuperação permanece capacidade não ensaiada.
- **VPS Hostinger:** manter o backup automático semanal incluído. O estado do servidor poderá estar até aproximadamente 7 dias atrás; a Hostinger informa que mantém dois backups semanais e que a restauração pode levar de 10 minutos a algumas horas. Esse backup captura o servidor, não substitui backup do Neon. O domínio/DNS e recursos externos exigem reconciliação após recuperação.
- **RTO:** meta operacional aceita de até 1 dia útil para recuperar serviço e validar o ambiente. É objetivo não ensaiado, sem SLA; depende da restauração do host, recuperação do banco quando necessária e reativação/validação da aplicação.
- **Dados locais:** registros ainda não sincronizados que existam apenas no aparelho não são cobertos por backups da VPS ou do Neon; devem permanecer preservados nos dispositivos.
- **Custo:** sem backup diário pago, VPS adicional, ou homologação permanente. O valor de renovação Hostinger após o período contratado não foi conferido.

## Evidências — 02/11/2026

O proprietário confirmou a VPS ativa e acessível por SSH como root, Ubuntu 24.04.5 LTS, Docker 29.9.2 e Docker Compose 5.6.1. Confirmou DNS A de `windops.devleonardo.com.br` na Vercel resolvendo para o IPv4 da VPS. Confirmou backup semanal Hostinger ativo e aceitou a política acima. O Neon Free e PostgreSQL 18 em São Paulo, roles separados e URLs pooled/direct foram configurados pelo proprietário. O custo foi atualizado pelo proprietário para R$625 por 24 meses; renovação não informada. Resend está totalmente configurado e as variáveis foram inseridas no arquivo root-owned da VPS (modo 0600); envio real ainda não foi testado.

Inspeção da configuração versionada confirmou Caddy na entrada pública, API/Electric internos, volume Electric, serviço de migração, long polling e entrega por SHA. Os seguintes itens continuam para execução em D03/D05/D06/D08: confirmação do `wal_level`, grants efetivos, publicação/slots e TLS no Neon; HTTPS/certificado, firewall e portas externos; ordem segura da instalação inicial (migrações/grants antes de iniciar Electric); ensaio de containers, carga/folga do KVM1, escala noturna, deploy e recuperação. Nenhum runtime da aplicação foi implantado ou testado nesta task.

Comparação de provedores e alternativas permanece registrada acima. Custos exatos e renovação não foram conferidos de forma independente. A conclusão da D02 fecha a decisão e a análise de adequação condicional; não certifica operação, dimensionamento, recuperação ou serviço pronto para uso.

## Comparação inicial — 01/11/2026

Pesquisa documental; nenhum serviço contratado ou runtime remoto testado. Recomendação inicial: VPS + Neon, aproveitando Compose, Caddy e deploy SSH existentes. Provedor e região dependem do orçamento e dos acessos do proprietário.

| Candidato                   | Estimativa mensal inicial                                                                                         | Limites e adaptação                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Hetzner CX23 europeu        | €5,49 compute + €0,50 IPv4, antes de backup/impostos; acrescentar banco abaixo                                    | Preço não garante disponibilidade. Confirmar backup/tráfego no checkout e latência Brasil–Europa.                                      |
| Hostinger KVM 2             | R$42,99 equivalentes/mês em contratação de 24 meses (R$1.031,76); renovação R$77,99/mês; acrescentar banco abaixo | 2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB de tráfego. Confirmar região, backup e condições no checkout.                                      |
| Render, três serviços pagos | Piso de compute 3 × US$7 = US$21; disco Electric de 10 GB × US$0,25 = US$2,50; acrescentar banco abaixo           | 512 MB por serviço é apenas piso comercial, não dimensionamento validado. Pode exigir plano maior, workspace pago e tráfego adicional. |

Banco comum proposto: Neon Launch. Cenário conservador de 730 horas ligado, 0,25 CU, 1 GB de dados e 1 GB-mês de histórico: 730 × 0,25 × US$0,106 + US$0,35 + US$0,20 = **US$19,90/mês** aproximadamente. Carga/replicação contínua pode impedir economia por suspensão; não usar a estimativa comercial de uso intermitente como teto. A 1 CU contínua, o mesmo cenário custa aproximadamente US$77,93. Histórico é volume de mudanças, não tamanho fixo do banco.

Subtotal ilustrativo com banco mínimo: Hetzner **€5,99 + US$19,90**, Hostinger **R$42,99 + US$19,90** (renovação **R$77,99 + US$19,90**), Render **US$43,40**. Não são totais fechados: dependem de backup, domínio, e-mail, tráfego excedente, tarifas de workspace/build/registry, impostos e câmbio. O proprietário escolheu Hostinger KVM1 pré-paga (~R$600 e pouco por 24 meses, valor declarado) + Neon Free e não autoriza gastos extras planejados. Total exato, renovação e qualquer cobrança por uso excedente não foram verificados; essa incerteza é limite registrado da escolha, não uma promessa de custo zero.

### Viabilidade e gates

- VPS: Compose inspecionado mantém API/worker e Electric duradouros, volume Electric, API/Electric sem portas publicadas e Caddy como entrada única. Migração usa job separado. Operação do SO, firewall e recuperação ficam com o responsável operacional.
- Render: serviços privados e discos pagos permitem a topologia proposta. Disco restringe escala e interrompe serviço no redeploy. Precisa variante Caddy HTTP atrás do TLS do provedor, DNS privado real e pipeline com migração única; roteiro em `docs/producao.md`. Timeout do proxy e long polling ainda precisam de confirmação/ensaio; não declarar compatibilidade aprovada.
- Neon: documentação oferece logical replication; D05 ainda precisa provar roles/grants, publicação restrita, conexão direta de replicação, TLS verificado e recuperação. Não substituir por banco Render sem nova avaliação.
- Compose fixa long polling Electric em 10 segundos; D05/D08 devem medir requests através de toda a cadeia HTTPS. Dimensionamento exige ensaio de memória/disco/carga e região próxima entre runtime e banco.

### Decisões registradas do proprietário

1. Hostinger KVM1 no Brasil, pré-paga por 24 meses por R$625 segundo o proprietário. Sem novas despesas planejadas; Neon Free. Renovação não informada.
2. Domínio `windops.devleonardo.com.br`, DNS na Vercel; proprietário confirmou que resolve para o IPv4 da VPS. O proprietário é responsável operacional. Acesso SSH administrativo está funcionando; usuário/chave restritos para GitHub Actions permanecem em D05/D06.
3. Neon Free e ausência de homologação permanente confirmados. KVM2 só será considerado após medir carga e custo.
4. Backup automático Hostinger confirmado; proprietário esclareceu em 08/11/2026 que a configuração prevê dois snapshots semanais. A captura dessa data mostrava exatamente um ponto disponível (06:20, 4,15 GB, Brasil, restauração estimada em 30 min); não foi feita restauração para testar o segundo ponto. Console Neon mostra janela PITR de 6 horas na branch `production`; nenhum restore Hostinger/Neon foi feito e o proprietário retirou o ensaio Neon do escopo. Proprietário aceitou meta de RTO até 1 dia útil, sem SLA. D05 comprovou reboot da VPS; D06 comprovou rollback de imagens. D07 documenta a capacidade sem tocar em dados de produção. Para limites e exclusões, veja “Política de recuperação aceita”. A fila local não está nesses backups.

### Inventário operacional para D04

Este inventário resume a topologia escolhida e orienta a próxima etapa; não exige compras adicionais:

- **Hostinger:** VPS KVM1 ativa no Brasil, Ubuntu 24.04.5, Docker Engine 29.9.2/Compose 5.6.1; 1 vCPU/4 GB; backup automático semanal ativo. SSH administrativo do proprietário funciona. D05 deve restringir firewall, instalar usuário/chave do pipeline e validar que só 80/443 e SSH autorizado ficam acessíveis; API/Electric/Postgres não devem ser expostos.
- **DNS:** zona gerenciada pela Vercel; registro A de `windops.devleonardo.com.br` criado e resolução ao IPv4 confirmada pelo proprietário. HTTPS/certificado ainda não validados.
- **Neon:** projeto de produção Free, branch `production`, PostgreSQL 18; proprietário criou `windops_app`, `windops_migrator` e `windops_replication`. Runtime usa URL pooled; migração e replicação usam URLs diretas. Segredos ficam somente no host/secret store. D05 deve confirmar grants efetivos, `wal_level`, logical replication/publicação/slots e TLS antes de iniciar Electric.
- **Aplicação na VPS:** Docker Compose com Caddy como entrada HTTPS, web estática, API/worker e Electric privado com volume persistente. PostgreSQL permanece gerenciado pelo Neon.
- **Operação:** sem homologação permanente; proprietário confirmou janela diária 06h–18h em `America/Sao_Paulo`, mantendo API/Caddy disponíveis e pausando somente Electric. Código/timer preparados em D03; instalar em D05 e medir scale-to-zero/cold-start, carga e retomada em D08. Outbox push aguarda atividade posterior da API.
- **Acessos restantes:** usuário/chave restritos e GHCR read-only para GitHub Actions; vars/secrets do Environment `production`; configuração OAuth e teste real de e-mail; nenhum segredo deve ser enviado ao chat.

Este inventário é o resumo operacional mencionado na conversa. Não substitui a validação no servidor real, que ficará para D05/D06/D08.

### Fontes oficiais consultadas

- [Hetzner: tabela vigente](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) e [IPv4](https://docs.hetzner.com/cloud/servers/overview/).
- [Hostinger: KVM e condições](https://www.hostinger.com/br/servidor-vps).
- [Render: preços](https://render.com/pricing), [discos](https://render.com/docs/disks) e roteiro já pesquisado na D01 em `docs/producao.md`.
- [Neon: preços](https://neon.com/pricing), [detalhamento oficial](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md) e [logical replication](https://neon.com/docs/guides/logical-replication-guide).

Somente documentação alterada. Checkboxes de conclusão preservados abertos: comparação total, validação e decisão ainda incompletas. Sem execução de pnpm check ou testes da aplicação nesta etapa documental.

## Decisão anterior — Oracle + Neon Free — 01/11/2026 (substituída)

Destino escolhido: Oracle Cloud Always Free, VM Ampere A1 com 2 OCPUs e 12 GB RAM, e Neon Free. Substitui a recomendação inicial VPS paga + Neon Launch; não autoriza contratação paga. Região, domínio, acessos e metas de recuperação continuam pendentes.

A [documentação Oracle](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm) atualmente informa 2 OCPUs/12 GB como limite total Always Free A1, não metade. Confirmar elegibilidade e quota no console da conta. A1 é ARM64: D03/D06 precisam validar imagens API/web/Electric 1.8.1 nessa arquitetura e publicar linux/arm64; workflow atual usa ubuntu-latest sem platforms explícito. Não há evidência de build ARM remoto.

O [Neon Free atual](https://neon.com/blog/neon-free-plan-1-gb-per-project) oferece 100 CU-horas por projeto/mês, 1 GB de dados e janela de restore de 6 horas. A 0,25 CU: 400 horas = 16,7 dias contínuos; mês de 30 dias consome 180 CU-horas. A 0,5 CU a franquia dura 8,3 dias. Outros computes/branches e escalonamento consomem margem.

[Replicação no Neon](https://neon.com/docs/guides/logical-replication-neon): subscriber conectado mantém compute ativo; slot sem avanço pode ser removido após aproximadamente 40 horas. Paradas prolongadas exigem testar recriação/resnapshot, sem descartar comandos locais pendentes.

Inspeção do projeto: Compose chama readiness a cada 15 segundos; server.ts executa SELECT 1 nessa rota. Worker de notificações habilitado consulta a cada 5 segundos. Parar apenas Electric não permite suspensão confiável. Long polling HTTP e redução de conexões não eliminam a conexão de replicação. Configuração de suspensão de consumidores de shapes economiza memória, não comprova suspensão do Postgres.

Opções, ainda não implementadas nem escolhidas:

- Janela de operação: exemplo 10 horas/dia × 30 dias × 0,25 CU = 75 CU-horas, antes das margens. Exige pausar replicação e consultas periódicas fora da janela; acesso fora dela desperta compute e gasta cota. Sync/push podem atrasar. Não cabe prometer disponibilidade integral e consumo fixo.
- Ativação sob demanda: coordenar Electric, readiness e worker conforme atividade autenticada, com tempo de inatividade, retomada concorrente segura e processamento durável de notificações. Mais complexo; medir suspensão real e consumo. Não expor Docker socket à API nem usar endpoint público de controle do host.
- Neon pago de baixo consumo: fallback somente se proprietário mudar sua escolha. Preserva operação contínua com cobrança; não aprovado.
- PostgreSQL na Oracle: alternativa apenas para discussão, exige assumir backups/restore e muda o banco escolhido; não executar sem decisão.

Proposta: avaliar janela ou ativação sob demanda conforme horário real dos técnicos; reservar margem dentro das 100 CU-horas e medir um ensaio. D03 deve cobrir cold start, indisponibilidade transitória, retry, preservação de outbox, push e resnapshot após perda de slot. Não anunciar viabilidade gratuita 24/7 com topologia atual.

D04: a preparação Oracle descrita neste bloco foi substituída pela escolha Hostinger. A análise de custos e Neon Free permanece contexto útil; RPO/retencão desejados não são atendidos automaticamente pela janela gratuita de restore.

Registro histórico de 01/11/2026, anterior à contratação/provisionamento Hostinger e ao aceite de recuperação em 02/11. O estado atual e os gates restantes estão descritos nas evidências da D02 acima.

## Janela informada — 01/11/2026

Proprietário informou operação aproximadamente entre 06h e 18h. Premissa de planejamento: America/Sao_Paulo e todos os dias; fuso/dias ainda não confirmados. Janela operacional não equivale, por si só, a aceite de bloquear todo acesso online fora dela.

Cálculo com compute fixo em 0,25 CU: 12 h/dia × 30 dias = 90 CU-horas; 31 dias = 93 CU-horas. Incluindo apenas 5 minutos diários até suspensão, cerca de 90,63 e 93,65 CU-horas respectivamente. Em 31 dias sobram aproximadamente 6,35 CU-horas para preparação, drenagem, manutenção, backups e outros computes. Aumentos de compute ou despertares extras reduzem essa margem; não garantir gratuidade antes de medir. Fontes: [franquia](https://neon.com/pricing) e [suspensão](https://neon.com/docs/introduction/scale-to-zero).

Proposta para D03: manter Caddy/frontend disponíveis; agendar API/worker/Electric com controle do host, preparando a abertura às 06h e encerrando graciosamente às 18h. Durante pausa, devolver indisponibilidade temporária explícita nas rotas dependentes do banco, sem iniciar consultas ou apagar sessão/journal. Login novo, consultas online, envio e notificações dependem da janela; aparelho previamente autenticado continua apenas nas capacidades offline já existentes e deve preservar pendências. Não implementar bloqueio definitivo sem alinhar essa consequência com o proprietário. Retomada da fila exige app aberto/retomado, não promessa de envio com app fechado. A escolha Hostinger mantém a hipótese de janela e seus gates de consumo Neon; ela não foi automaticamente implementada.

### Revisão de preferência — API noturna

O proprietário prefere manter a API disponível durante a noite e pausar somente Electric. Aceita que entregas push/outbox pendentes aguardem falha do provedor e sejam retomadas em evento/acesso posterior, sem polling contínuo. Essa revisão substitui a proposta anterior de parar API/worker junto do Electric. Janela confirmada: diariamente, 06h–18h ativa e 18h–06h pausada, em `America/Sao_Paulo`.

Viabilidade técnica condicional: parar Electric elimina o logical replication WAL sender e permite scale-to-zero somente quando também não houver queries ativas. A API pode permanecer em execução e acordar o Neon na próxima requisição; porém a configuração atual consulta o banco no readiness a cada 15 s e o worker de push faz polling a cada 5 s, o que mantém atividade. D03 precisa separar healthcheck de liveness, tratar reconexão do pool após suspensão e tirar o worker do polling contínuo sem perder a outbox. A réplica local ficará sem atualizações enquanto Electric estiver parado; requests REST e gravações diretas continuam dependendo do Neon e da sua latência de cold-start. Não declarar economia de compute antes de medir no plano Free.

Critérios adicionais: schedule recupera estado correto após reboot; encerramento drena operações em andamento; probes externos não acordam Neon; não apagar volumes/slots como rotina; testes de corte durante commit, retry idempotente e retomada de push/replicação; medir suspensão e consumo no Neon. Units estão preparadas localmente em D03; instalar e provar o comportamento real segue pendente em D05/D08.

D02 continua em andamento; registro documental validado por git diff --check, sem mudança de código/infra ou testes da aplicação.

## Escolha Hostinger e falha de capacidade Oracle — 01/11/2026

O proprietário mudou a VPS pretendida para Hostinger, mantendo Neon Free. O job OCI Resource Manager consultado (`ocid1.ormjob.oc1.sa-saopaulo-1...`) falhou ao criar `VM.Standard.A1.Flex` com 2 OCPUs/12 GB no único domínio disponível (AD-1), em `sa-saopaulo-1`, com `500 InternalError: Out of host capacity`. Nenhuma VM foi criada; a VCN já havia sido criada. Essa evidência confirma indisponibilidade de capacidade para aquela tentativa/região/AD, não indisponibilidade geral da Oracle.

A especificação falada inicialmente de 2 CPUs/4 GB não coincide com os perfis KVM listados na página oficial da Hostinger consultada em 01/11/2026: KVM 1 tem 1 vCPU/4 GB; KVM 2 tem 2 vCPUs/8 GB. O proprietário está fechando o pedido do KVM1 com datacenter no Brasil e Ubuntu 24.04, com intenção de testar inicialmente e possibilidade de upgrade para KVM2. KVM1 reduz o custo inicial, mas tem menos margem para API, worker, Electric, Caddy e SO; não declarar capacidade suficiente sem medir RAM/CPU sob carga representativa. A página oficial consultada informa KVM1 por R$29,99/mês e renovação R$59,99/mês na modalidade anunciada de 24 meses; o valor, o prazo total e as condições mostradas na conta/checkout prevalecem. A contratação final aguarda confirmação do proprietário.

Consequência técnica: a VPS passa de ARM64/12 GB pretendidos para x86_64 esperado, Ubuntu 24.04, inicialmente 1 vCPU/4 GB. D03/D06 devem remover a exigência de build ARM64 e medir consumo/CPU do Compose nesse plano, incluindo API, worker, Electric, Caddy e folga do SO. Definir limites de memória e sinais de upgrade para KVM2 após o ensaio inicial. Neon Free, janela aproximada 06h–18h e necessidade de comprovar escala a zero permanecem decisões/limites separados da troca de VPS.

Pendências D02 após decisões mais recentes: confirmar pedido/provisionamento, preço total exato e renovação, hostname e DNS para o IP definitivo, acesso SSH, se janela 06h–18h é diária no fuso America/Sao_Paulo, política de pausa fora dela e aceite dos limites dos backups incluídos/RPO. Definir RTO após exercício. Validar desempenho da VPS é D03/D05, não exige homologação; para D02 basta registrar como gate pendente das tasks seguintes.

Fontes oficiais para a nova decisão: [planos VPS Hostinger Brasil](https://www.hostinger.com/br/servidor-vps), [parâmetros e limites dos planos Hostinger](https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans). Evidência OCI permanece em arquivo local do proprietário; o caminho não é portável ao repositório e o log não foi copiado.

Somente documentação alterada. `git diff --check` passou; sem validação de runtime, contratação ou testes da aplicação.

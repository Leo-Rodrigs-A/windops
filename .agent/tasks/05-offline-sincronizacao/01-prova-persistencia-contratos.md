# S01 — Prova de persistência e contratos offline

## Status

Concluída em 27/10/2026 por orientação do proprietário

- [x] Task concluída

## Objetivo

Escolher uma base de armazenamento comprovada e fechar o protocolo antes de integrar gravações offline.

## Estado atual

Prova automatizada inicial aprovada para o `@tanstack/db` já instalado (0.15.2): IndexedDB restaura dados após reabertura, preserva-os numa atualização de versão, propaga mudanças a outra instância e aborta um lote que não pode ser serializado. O proprietário também confirmou teste manual no webapp instalado em Samsung Galaxy A12/Android 12 com Brave 1.98.60 (Chromium 156.0.8078.48): criou uma issue com internet, fechou e reabriu o app, depois repetiu a reabertura sem internet; a issue e a navegação permaneceram disponíveis. Foi escolhido como base provisória para S02 um journal em uma única Collection/store. A evidência não certifica Chrome/Android ou Safari/iPhone por plataforma.

## Dependências

Slices 01–04 concluídas. Primeira task desta slice.

## Escopo e exclusões

Prova isolada, decisões e contratos. Não habilitar offline na aplicação nem publicar tabelas Electric nesta task.

## Plano de implementação

- [x] Inventariar versões instaladas e comparar API/código de TanStack DB 0.15.2/Electric 0.6.3 com a documentação oficial. A prova usa IndexedDB existente; não adicionar persistência de SQLite ou outbox separado antes de resolver atomicidade. Referências: [IndexedDB Collection](https://tanstack.com/db/latest/docs/collections/indexed-db-collection), [Offline Transactions](https://tanstack.com/db/latest/docs/guides/offline-transactions), [Electric Collection](https://tanstack.com/db/latest/docs/collections/electric-collection).
- [x] Provar transação atômica de comando+projeção na mesma Collection/store, recuperação após reabrir, atualização de versão e comunicação entre duas instâncias. Falha de serialização aborta todo o lote. Quota cheia e aborto nativo de migration ficam para ensaio em navegador na S09.
- [x] Definir journal local por conta/workspace com registros discriminados de réplica confirmada, intenções locais e comandos/dependências, revisão-base, estado de envio, tentativas e ACK; checkpoint e versão do schema ficam identificados separadamente. Separar salvo localmente, confirmado no servidor e incorporado à réplica.
- [x] Definir operações criar/editar/iniciar/devolver/concluir com IDs estáveis, dependências por issue, revisão do servidor separada de revisão local e payload imutável após primeira tentativa. Cookies, OTP e segredos não entram na base local.
- [x] Preservar regra I09: elegibilidade do autor usa `created_at` do servidor, e membros ativos não autores podem iniciar logo após a criação remota. Issue criada offline recebe `created_at` quando o servidor a aceita; a cadeia do autor aguarda esse instante + uma hora. Horário do aparelho nunca antecipa a autorização.
- [x] Relato de conclusão pode mudar localmente pelo responsável somente offline e antes da primeira tentativa. Ao enviar, congela hash/payload; resposta perdida é resolvida por replay do mesmo comando, sem editar a intenção incerta.
- [x] Definir conjunto sincronizado como catálogo necessário, issues ativas e logs/dependências que as referenciam. Concluídas são online salvo cache local existente ou conclusão pendente; S03 prova projeções e metadados antes de publicar. Shapes e joins não são presumidos.
- [x] Definir nomes de banco separados por usuário/workspace, sem tokens/cookies; troca/logout não mistura coleções. Revogação conhecida pausa uso/envio e mantém exportação local. A S02 prova partições, retenção, migração e recuperação de fila.
- [x] Confirmar persistência e retomada no webapp instalado após fechar/reabrir com internet e depois sem internet; o proprietário reportou issue e navegação disponíveis nos dois casos.
- [x] Registrar o navegador informado: Brave 1.98.60 (64 bits), Chromium 156.0.8078.48.
- [x] Registrar aparelho e sistema informados: Samsung Galaxy A12, Android 12; ambiente testado com Brave 1.98.60 (Chromium 156.0.8078.48).
- [x] O proprietário encerrou para a S01 a exigência de testes separados em Chrome/Android e Safari/iPhone. A evidência factual disponível é Galaxy A12/Android 12 com Brave; não declarar Chrome ou Safari como testados. Validação integrada mais ampla permanece para a S09.
- [x] Consolidar ordenação pedida: issues mais recentes acima; conclusões por momento de conclusão decrescente e logs por evento decrescente, desempate estável. A Home atual está crescente e deve ser alinhada na S07 sem inverter só a página carregada.

## Contratos e dados afetados

Contratos Zod em packages/contracts; decisão do modelo local em .agent/database.md; interfaces públicas de sync/issues/audit/parks preservadas. Qualquer alteração de contrato servidor deve manter clientes online existentes compatíveis.

## Testes e aceite

- [x] Reabrir a prova com uma Collection nova e recuperar comando/projeção; nenhuma confirmação é baseada apenas em memória.
- [x] Injetar falha de serialização em lote misto e gravar em paralelo por duas instâncias; nenhum item do lote falho sobrevive e as gravações independentes são preservadas. Quota e falha nativa de upgrade permanecem para S09 em navegador real.
- [x] Registrar escolha provisória e regra temporal sem mudar o domínio; S02 pode usar o journal/teste. Não antecipar início com relógio local.
- [x] Registrar arquivos, comandos/resultados e limites antes do encerramento parcial.

## Evidências

27/10/2026: `apps/web/src/offline/indexed-db-proof.test.ts` valida o adaptador IndexedDB do `@tanstack/db` 0.15.2 com `fake-indexeddb` 6.0.0 (somente devDependency): persistência de projeção+comando no mesmo lote e após reabertura; comunicação e gravações concorrentes com duas instâncias; upgrade de schema preservando rows; rejeição de valor não serializável sem gravar parcialmente. `./node_modules/.bin/vitest run apps/web/src/offline/indexed-db-proof.test.ts` passou (2 testes). Typecheck web, Biome e diff-check passaram.

Decisão técnica para S02: adotar uma Collection/store de journal em IndexedDB para os registros versionados de comando e projeção local, submetendo ambos pela mesma transação TanStack. Não usar LocalStorage (sem transação/CAS entre abas) nem adicionar um executor que duplique fila em store separada antes de provar a coordenação. TanStack DB notifica outras instâncias via BroadcastChannel, mas isso não resolve conflito de gravações simultâneas na mesma issue; S02/S05 devem serializar por workspace/issue e resolver conflito no servidor.

Validação manual reportada pelo proprietário: webapp instalado em Samsung Galaxy A12 com Android 12; issue criada com internet, app fechado/reaberto e issue presente; rede desligada, navegação mantida, app fechado/reaberto novamente e issue/navegação ainda disponíveis. Navegador informado: Brave 1.98.60 (versão oficial, 64 bits), Chromium 156.0.8078.48. Essa evidência cobre a combinação Galaxy A12/Android 12/Brave; não foi testado Chrome ou Safari/iPhone.

27/10/2026: por orientação explícita do proprietário, testes separados em Chrome/Android e Safari/iPhone deixam de bloquear a conclusão da S01. Essa aceitação de escopo não altera o registro factual: somente Galaxy A12/Android 12 com Brave foi testado manualmente. A validação integrada da S09 continua responsável por registrar cobertura adicional e limitações de plataforma.

Limites: `fake-indexeddb` exercita a API real do adaptador mas não é navegador; não comprova quota, fechamento/upgrade bloqueado, OPFS ou proteção contra limpeza/desinstalação. O teste manual reportado cobre apenas Galaxy A12/Android 12 com Brave; a S09 ainda deve validar as plataformas/navegadores alvo e esses limites técnicos. O esquema/protocolo é decisão inicial para S02, sujeito aos ensaios integrados antes de persistir trabalho real.

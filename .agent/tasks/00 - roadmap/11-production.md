# 11-production: Validação móvel e produção

## Status

Concluída em 08/11/2026; execução detalhada na [slice 11 — Preparação e entrada em produção](../11-producao/README.md). D01–D10 entregues com evidências e limitações registradas.

Follow-up registrado em 28/10/2026: a S09 foi concluída para browser/desktop. O proprietário transferiu validação Android/iPhone, restart físico e HTTPS em aparelho para esta etapa. Não declarar suporte móvel antes dessas evidências.

## Objetivo e escopo

Validar aparelhos reais, limites storage, OAuth/Resend/push reais, Neon replication, VPS, domínio, backups, migrations/rollback, proteção main e monitoramento. Habilitar deploy somente após checklist aprovado.

## Dependências

01–10

## Critérios de aceite

Fluxo completo campo-equipe testado; plano operacional para meta 99,5%; backups disponíveis/retention registrados e procedimento de recuperação documentado. O proprietário retirou da D09 o gate de medição numérica <2s; não afirmar que a meta foi atingida. Por decisão do proprietário, nenhum restore destrutivo da VPS ou teste PITR Neon é gate desta etapa; registrar essa limitação sem prometer recuperação ainda não ensaiada. Sem promessa de background sync garantido.

## Testes

Android/iPhone, suspensão/retomada, expiração, conflito e remoção; deploy com falha, migration idempotente, restauração e rollback compatível; verificar que Electric não está público.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

30/10/2026 — Slice executável preparada: README/manual primeiro, escolha de VPS ou PaaS pelo proprietário, contas/acessos, preparação do app/runtime/banco, CI/CD, recuperação/alertas, deploy candidato, aparelhos e abertura do piloto. A escolha reavalia a referência anterior Hostinger + Neon; não há contratação ou deploy nesta etapa. Aceite do Google em desenvolvimento confirmado pelo proprietário; demais itens O04 e integração real no domínio final continuam como dependências.

31/10/2026 — O04 e slice 10 encerradas por aceite do proprietário. Dependência de cadastro satisfeita; integração real no domínio final continua na slice 11.

31/10/2026 — D01 entregou README/manual e guia VPS/Render com validação local isolada. Produção, recuperação no destino e aparelhos continuam sem validação nesta task. Próxima execução: D02.

08/11/2026 — Auditoria da evolução registrou política semanal Hostinger/RTO aceitos e ensaios D05/D06 de retomada, saúde, rollback de imagem e fila offline preservada. Em D08 foram associados os SHA/runs atuais e reconhecidos os ensaios da janela/reboot. D09 recebeu baseline anterior de desenvolvimento/desktop/Preview; D10 recebeu consolidação parcial do release. Restore real, alertas, login/bootstrap/tenant em produção, matriz de aparelhos em produção e aceite do piloto continuam pendentes; veja os checklists D07–D10 para o detalhe e as limitações.

Conclusão 08/11/2026: D07–D10 concluídas. O proprietário confirmou política de monitoramento, bootstrap e fluxos funcionais em Android, iPhone e PWA desktop. O piloto abriu na quarta-feira, 04/11/2026; um cliente usa Android, sem incidentes reportados desde a abertura. Novos deploys seguem CI aprovado e deploy; suporte é por WhatsApp diretamente com o proprietário. Simulação de quota/evicção, restore Hostinger/Neon, rollback compatível com schema e medição numérica de <2s foram retirados do escopo ou não validados; não se declara que foram testados nem se promete SLA.

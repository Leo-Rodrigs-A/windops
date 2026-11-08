# D09 — Validar aparelhos e fluxo de campo

## Status

Concluída — 08/11/2026. O proprietário decidiu prosseguir sem simulação de quota/evicção.

- [x] Task concluída

## Responsável

Proprietário executa em aparelhos; Codex prepara roteiro, acompanha e corrige.

## Objetivo

Comprovar o uso pretendido em Android/iPhone e completar as pendências móveis transferidas das slices anteriores.

## Escopo e exclusões

Compatibilidade e experiência do piloto; correções preservam journal, tenancy, APIs e identidade. Sem mudanças visuais sem referência autorizada.

## Estado atual

O proprietário confirmou testes funcionais em produção no Android, iPhone e PWA desktop; todos funcionaram. Informou que usou as versões mais atuais disponíveis nos ambientes, sem ter os números exatos. A consulta somente de leitura do perfil de produção retornou 12,7 MiB usados de 2048 MiB (0,6%) e `persisted=true`. Simulação de `QuotaExceededError`/evicção foi retirada do escopo por decisão do proprietário e não foi executada. A medição numérica de p95 também foi retirada do escopo D09; não afirmar que o alvo <2s foi atingido.

## Dependências

D08.

## Plano

- [x] Registrar evidências anteriores que servem como baseline: Android físico em desenvolvimento (login/OTP, home e logout, [F08](../01-fundacao/08-validacao-integrada.md)), fluxos offline/restart/update em browser/desktop ([S09](../05-offline-sincronizacao/09-validacao-integrada.md)), push real em Preview ([N06](../07-notificacoes/06-validacao-integrada.md)) e fila offline preservada no rollback de produção ([D06](06-ci-cd.md)). Elas não substituem a matriz de aparelhos/fluxos em produção desta task.

- [x] Proprietário confirmou testes funcionais em produção em Android, iPhone e PWA desktop.
- [x] Registrar que o proprietário usou as versões mais atuais disponíveis de cada ambiente; números exatos de OS/navegador não foram preservados. Resultado funcional relatado como aprovado nos três ambientes.
- [x] Proprietário confirmou login/Google/e-mail/OTP, convite, permissões, catálogo e issues funcionando em produção.
- [x] Proprietário confirma que cenários offline em modo avião, operações, fechar/reabrir e restart foram testados e funcionaram; relato geral cobre os três ambientes, sem detalhamento por cenário.
- [x] Proprietário confirmou sync entre contas e reconexão funcionando em produção.
- [x] Proprietário confirma que retry/ACK sem duplicação, conflitos entre aparelhos, reauth/revogação e preservação/exportação de pendências foram testados e funcionaram; sem evidência por caso individual.
- [x] Proprietário confirma atualização PWA com pendências, múltiplas abas, push/campainha e retomada funcionando; não se promete sync com app fechado no iPhone.
- [x] Consultar estimativa de storage do perfil de produção sem escrita/remoção: `usage=12.7 MiB`, `quota=2048 MiB`, `0.6%`, `persisted=true` (saída enviada pelo proprietário em 08/11/2026). Isso não testa `QuotaExceededError` nem evicção.
- [x] Decisão do proprietário: prosseguir sem simular limite/quota ou evicção; manter registrado que esse comportamento não foi validado.
- [x] Proprietário relata que os testes de desempenho/cold-start em produção foram realizados e funcionaram nos aparelhos informados; valores não disponíveis.
- [x] Decisão do proprietário: descartar mediana/p95 como gate de D09. Não afirmar que o objetivo quantitativo <2s foi comprovado.
- [x] Contingência de aparelho indisponível não acionada: o proprietário confirma Android e iPhone disponíveis/testados; não houve redução de plataformas.

## Contratos e dados afetados

Compatibilidade e experiência do piloto; correções preservam journal, tenancy, APIs e identidade. Sem mudanças visuais sem referência autorizada.

## Testes e aceite

Matriz por plataforma preenchida com resultado, versão e origem da evidência; falhas bloqueantes resolvidas. Fonte alterada exige pnpm check e integrações pertinentes.

## Evidências

Planejamento em 30/10/2026. Auditoria em 08/11/2026: foram localizadas as evidências anteriores listadas acima em F08, S09, N06 e D06. Proprietário confirmou que os testes funcionais em produção passaram em Android, iPhone e PWA desktop, usando as versões mais atuais disponíveis em cada ambiente, sem ter os números exatos. Relatou como funcionando auth/convite/permissões/catalog/issues, offline e restart, reconexão/ACK, conflitos/reauth/revogação/exportação, update/multiaba/push e desempenho/cold-start; não há evidência por caso individual. Proprietário pediu para registrar só esse relato e retirou os números p95 do escopo D09; o alvo quantitativo <2s permanece não comprovado. Em 08/11/2026, a consulta `navigator.storage.estimate()`/`persisted()` do perfil de produção retornou uso 12,7 MiB, quota 2048 MiB, 0,6%, `persisted=true`; é uma estimativa, não teste de limite/evicção. Na mesma data, o proprietário decidiu prosseguir sem simulação de quota/evicção; essa limitação fica registrada e não bloqueia a conclusão de D09.

## Matriz a preencher

Registrar somente o relato disponível; não incluir e-mails, tokens, conteúdo de issues ou dados pessoais.

- **Android:** proprietário reporta testes funcionais em produção aprovados, usando versões mais atuais disponíveis; números de modelo/OS/navegador e data não informados.
- **iPhone:** proprietário reporta testes funcionais em produção aprovados, usando versões mais atuais disponíveis; números de modelo/iOS/Safari e data não informados.
- **Desktop PWA:** proprietário reporta testes funcionais em produção aprovados, usando versões mais atuais disponíveis; números de sistema/navegador e data não informados.
- **Carga:** proprietário relata teste de CPU/RAM e cold-start aprovado, sem números. A medição de mediana/p95 foi retirada do escopo D09; não afirmar que o alvo quantitativo <2s foi atendido.
- **Quota:** estimativa somente de leitura reportada acima; comportamento sob limite/evicção não foi validado e foi retirado do escopo desta task por decisão do proprietário.

Os resultados funcionais acima vêm do relato do proprietário; não há observação direta ou matriz por caso. Quota/evicção não foi ensaiada e está fora do aceite D09 por decisão do proprietário. A estimativa registrada é apenas informativa.

### Checagem de quota sem alterar dados

No desktop, abra o Wind Ops em HTTPS e o DevTools do mesmo navegador. Em **Console**, execute a consulta abaixo. Ela só lê a estimativa do navegador e informa se o site recebeu persistência; não grava nem apaga dados:

```js
(async () => {
  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage;
  const quota = estimate.quota;
  const persisted = navigator.storage.persisted
    ? await navigator.storage.persisted()
    : 'indisponível';

  console.table({
    usoMiB: usage == null ? 'indisponível' : (usage / 1024 / 1024).toFixed(1),
    quotaMiB: quota == null ? 'indisponível' : (quota / 1024 / 1024).toFixed(1),
    percentual: usage == null || !quota ? 'indisponível' : `${((usage / quota) * 100).toFixed(1)}%`,
    persistente: persisted,
  });
})();
```

O valor é aproximado, varia por navegador/dispositivo e não garante quanto espaço será concedido. Também é possível ver a divisão de IndexedDB/cache/service worker em **DevTools → Application → Storage**. Não clique em **Clear site data** ou em controles para remover IndexedDB.

Referências da consulta informativa: [StorageManager.estimate](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate) e [critérios de quota e evicção](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). O resultado reportado não comprova recuperação de dados sob pressão de armazenamento.

# D09 — Validar aparelhos e fluxo de campo

## Status

Em andamento

- [ ] Task concluída

## Responsável

Proprietário executa em aparelhos; Codex prepara roteiro, acompanha e corrige.

## Objetivo

Comprovar o uso pretendido em Android/iPhone e completar as pendências móveis transferidas das slices anteriores.

## Escopo e exclusões

Compatibilidade e experiência do piloto; correções preservam journal, tenancy, APIs e identidade. Sem mudanças visuais sem referência autorizada.

## Estado atual

Chrome/Edge desktop têm aceite funcional; quota/evicção real, aparelhos e HTTPS de produção não estão comprovados.

## Dependências

D08.

## Plano

- [x] Registrar evidências anteriores que servem como baseline: Android físico em desenvolvimento (login/OTP, home e logout, [F08](../01-fundacao/08-validacao-integrada.md)), fluxos offline/restart/update em browser/desktop ([S09](../05-offline-sincronizacao/09-validacao-integrada.md)), push real em Preview ([N06](../07-notificacoes/06-validacao-integrada.md)) e fila offline preservada no rollback de produção ([D06](06-ci-cd.md)). Elas não substituem a matriz de aparelhos/fluxos em produção desta task.

- [ ] Proprietário disponibilizar Android e iPhone, informar versões/navegadores e instalar PWA por HTTPS; Codex preparar roteiro com contas admin/técnico e dados de teste.
- [ ] Testar login/Google/e-mail/OTP, convite, permissões, catálogo e issues; em modo avião criar/editar/iniciar/concluir dentro das regras, fechar/reabrir app e reiniciar aparelho verificando fila durável.
- [ ] Reconectar, repetir requests/ACK e verificar ausência de duplicação; testar conflito entre aparelhos, expiração/reauth e revogação com exportação das pendências preservadas.
- [ ] Atualizar PWA com formulário/fila pendentes e múltiplas abas, validar push e campainha com permissões concedidas/negadas e retomada; não prometer sync com app fechado no iPhone.
- [ ] Ensaiar pressão de storage/quota/evicção de forma controlada em dados descartáveis; documentar limites da plataforma e exportação. Não chamar simulação unitária de prova física.
- [ ] Medir carregamento no cenário de D07; registrar evidência por dispositivo e distinguir observação do Codex de relato do proprietário. Corrigir falhas bloqueantes e repetir o percurso afetado.
- [ ] Se aparelho estiver indisponível, manter o item pendente. Qualquer redução explícita de plataformas do piloto exige decisão registrada, sem declarar suporte nem encerrar a validação ausente como sucesso.

## Contratos e dados afetados

Compatibilidade e experiência do piloto; correções preservam journal, tenancy, APIs e identidade. Sem mudanças visuais sem referência autorizada.

## Testes e aceite

Matriz por plataforma preenchida com resultado, versão e origem da evidência; falhas bloqueantes resolvidas. Fonte alterada exige pnpm check e integrações pertinentes.

## Evidências

Planejamento em 30/10/2026. Auditoria em 08/11/2026: foram localizadas as evidências anteriores listadas acima em F08, S09, N06 e D06. Android/iPhone em produção, restart físico em produção, autenticação/invites, quota física, conflitos interaparelhos e medição de carregamento seguem pendentes; iPhone não foi disponibilizado nas validações anteriores.

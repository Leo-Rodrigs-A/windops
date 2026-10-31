# D01 — README como manual do desenvolvedor

## Status

Planejada

- [ ] Task concluída

## Responsável

Codex.

## Objetivo

Transformar o README na entrada única para entender, desenvolver e operar o Wind Ops.

## Escopo e exclusões

README e eventuais guias em docs/; nenhuma alteração de contrato público ou design. Não embutir segredos nem dados pessoais.

## Estado atual

README tem setup parcial, referências históricas e afirmações desatualizadas (por exemplo, proxy sync 503 e etapa atual). Compose, scripts e workflows já existem, mas não comprovam deploy real.

## Dependências

Nenhuma; primeira tarefa da slice.

## Plano

- [ ] Explicar o problema de registro em campo sem internet, público, fluxo visita→registro→sincronização→equipe, recursos entregues e limites reais do piloto.
- [ ] Organizar o manual na ordem solicitada: projeto/problema; ambiente do zero; rotina diária; produção. Incluir sumário e links para detalhes operacionais sem obrigar a leitura da memória do agente.
- [ ] Descrever instalação em Linux/WSL2 desde Git, Node da .node-version, Corepack/pnpm e Docker/Compose; clone sem caminho pessoal fixo, dependências frozen, .env de exemplo, banco/roles/migrations, Mailpit, API/web e resultados esperados.
- [ ] Ensinar configuração de auth, teste de cadastro/OTP, Google opcional no dev, bootstrap explícito do workspace/admin e VAPID; diferenciar configuração local de produção e apontar os testes obrigatórios antes de habilitar auth.
- [ ] Ensinar rotina: atualizar código/dependências/migrations quando necessário, subir serviços, iniciar dev, encerrar preservando volumes, executar checks/integrações e Preview com origem/porta correta; explicar recuperação de erros comuns e impacto dos comandos de banco.
- [ ] Escrever passo a passo VPS com Docker Compose/Caddy e alternativa PaaS concreta a avaliar em D02: pré-requisitos, serviços, banco, rede privada, storage, segredos, domínio/TLS, migração, deploy, bootstrap, atualização e recuperação. Identificar adaptações ainda pendentes, sem apresentar comandos inexistentes como prontos.
- [ ] Distinguir VPS Hetzner/Hostinger de PaaS gerenciado; explicar responsabilidades operacionais e requisitos de compatibilidade. Manter ambos os caminhos documentados e marcar qual foi efetivamente testado.
- [ ] Conferir cada comando contra scripts/configuração reais e ensaiar setup em ambiente descartável. Registrar passos externos não executados. Revisar manual novamente nas tasks que alterarem o fluxo.

## Contratos e dados afetados

README e eventuais guias em docs/; nenhuma alteração de contrato público ou design. Não embutir segredos nem dados pessoais.

## Testes e aceite

Leitor consegue entender o produto, preparar dev e seguir o roteiro operacional sem conhecimento prévio do repositório. Links/comandos conferidos; setup isolado registrado. Produção ainda não executada fica explicitamente identificada.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

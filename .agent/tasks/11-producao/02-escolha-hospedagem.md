# D02 — Escolher hospedagem e parâmetros do piloto

## Status

Planejada

- [ ] Task concluída

## Responsável

Proprietário decide; Codex prepara comparação.

## Objetivo

Escolher um destino executável e fixar os parâmetros que orientam o provisionamento.

## Escopo e exclusões

Decisão de infraestrutura; preserva monólito modular e uma origem pública. Não exige múltiplos provedores funcionando simultaneamente.

## Estado atual

Arquitetura anterior prevê VPS Hostinger + Neon, sem homologação permanente. O pedido atual abre escolha de VPS ou PaaS; nenhum provedor novo está aprovado.

## Dependências

D01.

## Plano

- [ ] Codex comparar VPS (Hetzner/Hostinger) e um PaaS candidato (Render ou outro), consultando documentação/preços oficiais atuais; registrar custo total estimado de compute, banco, storage, backups e tráfego sem pressupor gratuidade.
- [ ] Validar no candidato containers duradouros, Electric privado com disco persistente, long polling/timeouts, worker de notificações, banco com logical replication/TLS e deploy/migração controlados. Incompatibilidade elimina o candidato ou exige adaptação explícita.
- [ ] Proprietário escolher provedor, região, orçamento, domínio, responsável operacional e quem terá acesso. Confirmar Neon ou alternativa compatível; não substituir o banco silenciosamente.
- [ ] Proprietário definir se haverá homologação permanente; padrão anterior é não haver, usando ensaio descartável isolado antes do primeiro uso real. Definir retenção de backups, RPO (perda máxima de dados) e RTO (tempo de recuperação) desejados.
- [ ] Registrar decisão, topologia, parâmetros e limites em docs de operação, arquitetura e memória; listar recursos e permissões exatos que D04 precisa criar. Nenhuma contratação automática.

## Contratos e dados afetados

Decisão de infraestrutura; preserva monólito modular e uma origem pública. Não exige múltiplos provedores funcionando simultaneamente.

## Testes e aceite

Destino escolhido pelo proprietário, viabilidade documentada e lista concreta de recursos/acessos pronta. Se não houver escolha, tarefas independentes podem avançar; provisionamento aguarda.

## Evidências

Planejamento em 30/10/2026. Execução pendente; preencher data, mudanças, comandos/resultados, links ou identificadores não secretos e limitações ao executar.

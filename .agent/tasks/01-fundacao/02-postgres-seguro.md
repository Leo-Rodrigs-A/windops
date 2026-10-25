# F02 — PostgreSQL e privilégios mínimos

## Status e dependências

Planejada. Depende de [F01](01-modelagem-banco.md).

- [ ] Task concluída.

## Objetivo e escopo

Tornar a configuração local reproduzível e persistente sem usar a conta administrativa no runtime. Preparar o mesmo contrato de papéis para produção, sem provisionar Neon/VPS nem alterar dados existentes de forma destrutiva.

## Estado atual

Compose usa PostgreSQL 17 com volume, portas loopback e replicação lógica. API, migração local e Electric compartilham a credencial de desenvolvimento. Produção já prevê URLs separadas no exemplo e no serviço de migração, mas não comprova grants nem papéis reais.

## Plano de implementação

- [ ] Implementar provisionamento explícito e repetível dos papéis administrativos, de migração, runtime e replicação definidos em F01. Runtime sem superuser, criação de papéis, criação de banco ou DDL; migrador com privilégios de DDL necessários; replicação apenas com requisitos documentados do Electric e acesso às tabelas publicadas.
- [ ] Cobrir tanto instalação vazia quanto volume já inicializado: scripts de init da imagem não rodam novamente em volumes existentes. Fornecer procedimento administrativo de atualização que preserve `workspaces` e journal; nunca exigir `down -v` para desenvolvimento normal.
- [ ] Separar `DATABASE_URL`, `MIGRATION_DATABASE_URL` e `ELECTRIC_DATABASE_URL` no ambiente dev e nos comandos. O migrador deve selecionar a credencial de migração explicitamente; em produção não aceitar fallback silencioso para runtime.
- [ ] Configurar grants presentes e default privileges para objetos futuros, ownership e permissões no schema/journal. Restringir criação no schema público e validar que autenticação não é acessível ao papel de replicação. Documentar operações de provisionamento que não pertencem a migrações da aplicação.
- [ ] Manter volumes PostgreSQL/Electric e portas locais em loopback. Garantir que a API pública/Caddy não exponha Electric; a rota de sync da aplicação segue bloqueada enquanto seu proxy autorizado não for implementado.
- [ ] Atualizar parsing e exemplos de ambiente sem segredos reais; validar TLS com certificado para Neon em produção e documentar URLs diretas de migração/replicação. Evitar dependências de SMTP/OAuth apenas para executar tarefas administrativas de banco.
- [ ] Atualizar health/readiness, shutdown do pool, Compose, comandos de desenvolvimento e CI para as credenciais separadas. Credenciais administrativas não entram no container de runtime.
- [ ] Documentar backup/restauração local e requisitos futuros do Neon. Exercitar restauração em banco/volume descartável, sem sobrescrever o banco do proprietário.

## Testes e aceite

- [ ] Em ambiente descartável, subir stack vazia e aplicar provisionamento duas vezes sem erro nem escalada de privilégios.
- [ ] Runtime consegue DML autorizado e não consegue `CREATE TABLE`, alterar schema, gerenciar roles ou ler dados fora das concessões. Replicação não lê tabelas de autenticação e continua atendendo um shape permitido.
- [ ] Reiniciar PostgreSQL mantém registros de teste e journal; restaurar backup descartável preserva os dados esperados. Não confundir restart de contêiner com teste de persistência offline do navegador.
- [ ] Falha de conexão devolve readiness 503 sem URL/credenciais; configuração inválida falha antes de servir tráfego.
- [ ] Executar `pnpm check`, validação Compose e integração/container checks afetados. Não declarar produção segura a partir apenas dos testes locais.

## Evidências

Pendente. Registrar matriz efetiva de grants, comandos/resultados sem senhas, teste de reinício/restauração, compatibilidade com volume existente e limites de validação Neon.

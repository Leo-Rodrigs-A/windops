# E02 — Modelo, contratos e migração de equipe

## Status e dependências

Planejada. Depende da fundação; pode ser preparada enquanto E01 aguarda cadastro.

- [ ] Task concluída.

## Objetivo e escopo

Fechar o modelo de convites, a matriz de permissões e os contratos de equipe antes dos endpoints e telas. Reutilizar memberships e guards existentes.

## Plano de implementação

- [ ] Revisar `.agent/database.md`, schema e serviços públicos de identity/workspaces; registrar o estado aplicado e as novas entidades propostas.
- [ ] Detalhar convites: UUID, workspace, e-mail normalizado, cargo, autor, hash do token aleatório, criação/expiração, consumo, revogação e relação de substituição no reenvio. Nunca persistir token de convite em claro na tabela de convites.
- [ ] Definir invariantes, FKs tenant, índices de busca/paginação e unicidade de convite vigente por workspace/e-mail; não usar o avanço do relógio como premissa de índice de validade. Definir substituição de expirados e manutenção sem perder evidência de consumo.
- [ ] Fechar estados de entrega e política de retry: distinguir convite emitido de e-mail entregue, sem manter transação PostgreSQL aberta durante envio. Se houver armazenamento necessário para entrega durável, especificar proteção, retenção e acesso restrito do payload.
- [ ] Definir reintegração por convite novo: reativar vínculo revogado em transação, invalidar convites anteriores à remoção e impedir que retry antigo restaure acesso revogado.
- [ ] Definir matriz: admin lista/convida/promove/remove técnico; técnico consulta apenas seu contexto; ninguém remove/rebaixa admin pela gestão de membros.
- [ ] Propor contratos de listagem, emissão/reenvio, aceite, promoção e revogação sob namespace do workspace; aceite resolve o workspace pelo convite validado. Definir paginação, DTOs mínimos, erros recuperáveis e conflito de versão.
- [ ] Definir como identity fornece dados mínimos de usuários por serviço público. Não importar schema/repositório de identity em workspaces; verificações cruzadas precisam ter consistência transacional definida.
- [ ] Gerar/revisar migração Drizzle preservando a fundação, atualizar grants e comprovar exclusão dos convites da publicação Electric.
- [ ] Documentar contratos, regras de concorrência, limites de envio e decisões no modelo/arquitetura.

## Dados e limites

Convites pertencem a workspaces. Não adicionar roles globais, tabelas de parques/issues ou exclusão de conta nesta migração. Datas de validade usam relógio do servidor/banco; e-mail é aparado/minúsculo, sem regras especiais de provedor.

## Validação e aceite

- [ ] Migração em banco vazio, upgrade com dados existentes e reaplicação segura.
- [ ] Constraints e índices sustentam tenant, unicidade e estados escolhidos.
- [ ] API mantém DML mínimo; replicação não lê convites nem dados de identidade.
- [ ] Contratos cobrem resultados de corrida, expiração, reenvio e erro de entrega.
- [ ] `pnpm check`, validações de migração/permissões e documentação atualizados.

## Evidências

Pendente. Modelo detalhado, migração e contratos ainda não implementados.

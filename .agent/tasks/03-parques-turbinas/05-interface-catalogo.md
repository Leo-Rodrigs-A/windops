# P05 — Interface de parques e turbinas

## Status

Planejada

- [ ] Task concluída

## Objetivo

Entregar catálogo navegável para técnicos e gestão online para administradores.

## Estado atual

Slices 01 e 02 concluídas. O módulo parks contém somente um entrypoint vazio; não há catálogo implementado. Este plano não comprova execução das dependências.

## Dependências

P03 e P04 concluídas; acesso admin dev existente. Ver [índice da slice](README.md).

## Escopo e exclusões

Rotas web, cliente API e componentes Shadcn para catálogo; sem telas de chamados, PWA ou persistência offline.

## Plano de implementação

- [ ] Reconfirmar documento aberto no Pencil Windows antes de consultar referências. Registrar referência e eventuais lacunas; compor telas ausentes com modelos existentes conforme autorização anterior, sem editar/copiar .pen.
- [ ] Adicionar navegação de Parques à sidebar desktop e navegação mobile; lista de parques e detalhe com suas turbinas, com acesso para ambos os cargos.
- [ ] Implementar formulários de criação/edição para admin com componentes Shadcn, rótulos e validação acessíveis; ocultar controles administrativos do técnico sem substituir segurança da API.
- [ ] Reutilizar campos, espaçamentos, bordas, tema claro/escuro persistido, dropdown com largura do gatilho e scrollbar global. Conferir viewport estreito e evitar rolagem horizontal indevida.
- [ ] Tratar carregamento, vazio, busca/paginação, falha de rede, sessão expirada e perda de membership; não exibir gravação como concluída antes da confirmação do servidor.
- [ ] Em conflito de revisão, preservar texto digitado e oferecer atualização/revisão explícita; não reenviar sobrescrevendo silenciosamente. Em timeout de criação, permitir conferir catálogo antes de nova tentativa.
- [ ] Preservar retorno à home, nome na top bar, logout e alternância de tema. Não apresentar botões de desativação ou funcionalidades futuras como disponíveis.

## Contratos e dados afetados

Rotas web, cliente API e componentes Shadcn para catálogo; sem telas de chamados, PWA ou persistência offline. Seguir decisões da P01 e registrar mudanças de contrato antes da implementação dependente.

## Testes e aceite

- [ ] Rodar pnpm check; validar admin/técnico, teclado/foco/leitor, temas e viewport mobile/desktop, incluindo mensagens de erro e formulário em conflito. Evidência de navegador deve distinguir viewport simulado de aparelho real.
- [ ] Registrar comandos, resultados, limitações e arquivos alterados antes de marcar conclusão.

## Evidências

Planejamento em 26/10/2026. Implementação e validações desta task ainda não executadas.

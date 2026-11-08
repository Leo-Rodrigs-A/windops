# Slice 15 — Identidade visual

**Status:** Concluída em 08/11/2026.

## Resultado

Atualizar a marca Wind Ops para usar o ícone Brisa filled enviado pelo proprietário, mantendo alinhamento, escala e cores consistentes entre a interface e os ícones instaláveis.

## Limites

- Inclui símbolo inline do site, favicon claro/escuro, SVG de PWA, PNGs do manifesto e Apple touch icon.
- Não altera nome, tipografia, telas ou regras do produto.
- O SVG de origem permanece fora do repositório; os caminhos necessários foram incorporados aos assets versionados.

## Dependências e ordem

| Task                          | Entrega                                                                           | Dependências                    |
| ----------------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| [x] [BR01](01-icone-brisa.md) | Ícone Brisa centralizado e adaptado à paleta Wind Ops em todos os pontos da marca | SVG fornecido pelo proprietário |

## Critério de encerramento

- [x] Interface, favicon por tema, ícones PWA e Apple touch icon usam a nova marca.
- [x] O ícone aparece centralizado com área segura para máscara do PWA.
- [x] `pnpm check` passa.

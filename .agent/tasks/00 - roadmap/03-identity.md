# 03-identity: Autenticação e conta órfã

## Status

Parcialmente implementada. Cadastro, senha/Google, segunda etapa obrigatória, recuperação e sessão têm evidência local em F04/F08; gestão de conta e a validação em aparelho ainda têm pendências.

## Objetivo e escopo

Schema Better Auth, cadastro, Google/senha com vínculo seguro por e-mail verificado, código obrigatório de 15 min, reenvio invalidante, recuperação, sessão e landing/conta órfã. Configurar adaptador SMTP/Resend.

## Dependências

01; 02 para interface final

## Critérios de aceite

Nenhuma sessão de negócio antes do código, inclusive OAuth. Mesmo e-mail verificado corresponde à mesma conta. Expiração offline não destrói dados. Sem login funcional parcial em produção.

## Testes

Google e senha, e-mail não verificado, tentativas/cooldown, código expirado/reutilizado, reenvio, CSRF/origens, logout com pendências.

## Referências e atualização

Seguir [memória](../../memory.md) e [arquitetura](../../architeture.md). Este arquivo descreve uma etapa do roadmap; a execução é detalhada nas slices de [tasks](../README.md). Atualizar status e registrar evidência ao concluir. Não marcar integração pronta apenas por instalar dependências.

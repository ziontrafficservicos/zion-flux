# Zion Flux — Sistema Financeiro da SIEG

## Sobre o Projeto
Este e o **sistema oficial do financeiro da SIEG**, desenvolvido e mantido pela equipe Zion Traffic.

- **Cliente:** SIEG (empresa de solucoes contabeis)
- **Funcao:** Dashboard financeiro, controle de atendimentos, CSAT, leads, disparos, qualificacao e analise de dados
- **Stack:** React + TypeScript + Vite + Shadcn/UI + Supabase + tRPC + Hono
- **Repositorio oficial:** `github.com/ziontrafficservicos/zion-flux`
- **Repositorio upstream:** `github.com/ZionTraffic/zion-flux`

## Banco de Dados
- **Supabase** — banco de producao da SIEG
- **ATENCAO:** Este banco contem dados REAIS financeiros da SIEG. Qualquer operacao destrutiva (DROP, DELETE, TRUNCATE, ALTER) DEVE ser validada com o George antes de executar
- **Edge Functions:** Webhooks de disparos, leads ASF e financeiro SIEG

## Time
- **George Marcel** — Lider tecnico, responsavel final por aprovacoes e deploys
- **Leonardo Basilio** (`leonardobasiliozion-source`) — Desenvolvimento e manutencao

## Regras de Trabalho
1. **NUNCA** fazer deploy em producao sem autorizacao EXPLICITA do George
2. **NUNCA** executar migrations ou operacoes destrutivas no banco sem confirmar com George
3. **SEMPRE** desenvolver e testar no localhost primeiro (`npm run dev`)
4. **SEMPRE** criar branch para features/fixes — nao commitar direto na `main`
5. **SEMPRE** fazer PR para a `main` — George faz code review
6. Manter o codigo em **portugues brasileiro** (variaveis, componentes, comentarios)

## Comandos Uteis
```sh
npm install        # Instalar dependencias
npm run dev        # Rodar em desenvolvimento (localhost)
npm run build      # Build de producao
npm run deploy     # Deploy para Vercel (SO COM AUTORIZACAO)
```

## Estrutura Principal
- `src/` — Frontend React (pages, components, hooks, contexts)
- `backend/` — Backend tRPC + Hono
- `supabase/` — Edge Functions e migrations
- `scripts/` — Scripts de migracao e utilitarios

## Idioma
Sempre responder e documentar em **portugues brasileiro**.

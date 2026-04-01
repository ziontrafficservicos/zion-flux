# Guia de Integração NicoChat → Dashboard SIEG Financeiro

## O que é isso?
Este guia ensina como configurar o NicoChat para enviar dados automaticamente
para o dashboard do SIEG Financeiro. Cada vez que algo acontece no fluxo de
cobrança (disparo, resposta, pagamento, etc), o NicoChat avisa o banco de dados.

## Como funciona?
O NicoChat tem um bloco chamado **HTTP Request** — ele faz uma "ligação" pro
banco de dados dizendo "aconteceu isso aqui". São 6 momentos no fluxo onde
você precisa colocar esse bloco.

---

## Configuração Base (igual pra TODOS os 6 pontos)

Sempre que for adicionar um bloco HTTP Request, use estas configurações:

### Método
```
POST
```

### Headers (cabeçalhos)
Adicione ESTES 3 headers em TODOS os blocos:

| Header | Valor |
|--------|-------|
| `Content-Type` | `application/json` |
| `apikey` | `{SUA_ANON_KEY}` |
| `Authorization` | `Bearer {SUA_ANON_KEY}` |

> **⚠️ Obtenha a anon key no painel do Supabase: Settings → API → anon/public key**

> **Nota:** O `apikey` e o `Authorization` usam o MESMO token. A diferença é
> que o Authorization tem a palavra `Bearer ` (com espaço) na frente.

---

## PONTO 1 — Disparo do Template de Cobrança

### Quando usar?
Logo DEPOIS que o template de cobrança é enviado pro cliente via WhatsApp.
É o primeiro bloco HTTP Request no fluxo.

### URL
```
https://zfgezrwksmuhnrmudnas.supabase.co/rest/v1/rpc/sieg_fin_registrar_disparo
```

### Body (corpo da mensagem)
```json
{
  "p_telefone": "{{telefone}}",
  "p_nome_empresa": "{{nome_empresa}}",
  "p_valor_em_aberto": {{valor_em_aberto}},
  "p_cnpj": "{{cnpj}}",
  "p_nome": "{{nome_contato}}"
}
```

### O que cada campo significa?

| Campo | O que colocar | Exemplo | Obrigatório? |
|-------|--------------|---------|-------------|
| `p_telefone` | Telefone do cliente (com DDD) | `"5511999887766"` | SIM |
| `p_nome_empresa` | Nome da empresa do cliente | `"Padaria do João"` | SIM |
| `p_valor_em_aberto` | Valor da dívida (número, sem R$) | `1500.00` | SIM |
| `p_cnpj` | CNPJ da empresa (se tiver) | `"12345678000199"` | NÃO |
| `p_nome` | Nome do contato/responsável | `"João Silva"` | NÃO |

### O que acontece no banco?
- Cria um registro de cobrança com tag "T1 - SEM RESPOSTA"
- Registra o disparo como "enviado"
- Se esse telefone já recebeu 10+ cobranças sem pagar, marca como "T5 - PASSÍVEL DE SUSPENSÃO"

---

## PONTO 2 — Cliente Respondeu

### Quando usar?
Quando o cliente responde a mensagem de cobrança (qualquer resposta).

### URL
```
https://zfgezrwksmuhnrmudnas.supabase.co/rest/v1/rpc/sieg_fin_atualizar_status
```

### Body
```json
{
  "p_telefone": "{{telefone}}",
  "p_nova_tag": "T2 - RESPONDIDO"
}
```

### O que acontece no banco?
- Muda a tag do cliente de T1 para T2
- Registra no histórico que a tag mudou

---

## PONTO 3 — IA Validou Comprovante (Pagou via IA)

### Quando usar?
Quando a IA (OpenAI Vision) analisa o comprovante de pagamento e confirma que
está correto. O cliente pagou e foi resolvido pela IA, sem precisar de humano.

### URL
```
https://zfgezrwksmuhnrmudnas.supabase.co/rest/v1/rpc/sieg_fin_atualizar_status
```

### Body
```json
{
  "p_telefone": "{{telefone}}",
  "p_nova_tag": "T3 - PAGO IA",
  "p_valor_recuperado": {{valor_pago}},
  "p_tipo_recuperacao": "ia",
  "p_data_pagamento": "{{data_pagamento}}"
}
```

### O que cada campo significa?

| Campo | O que colocar | Exemplo |
|-------|--------------|---------|
| `p_telefone` | Telefone do cliente | `"5511999887766"` |
| `p_nova_tag` | Sempre `"T3 - PAGO IA"` | `"T3 - PAGO IA"` |
| `p_valor_recuperado` | Valor que o cliente pagou (número) | `1500.00` |
| `p_tipo_recuperacao` | Sempre `"ia"` | `"ia"` |
| `p_data_pagamento` | Data do pagamento (AAAA-MM-DD) | `"2026-03-22"` |

### O que acontece no banco?
- Muda a tag para T3
- Soma o valor em "Recuperado por IA"
- Marca a situação como "concluído"
- Registra no histórico de valores

---

## PONTO 4 — Transferido para Atendente Humano

### Quando usar?
Quando a IA não consegue resolver e transfere o atendimento para um humano.
Por exemplo: cliente quer negociar, tem dúvidas, comprovante ilegível, etc.

### URL
```
https://zfgezrwksmuhnrmudnas.supabase.co/rest/v1/rpc/sieg_fin_atualizar_status
```

### Body
```json
{
  "p_telefone": "{{telefone}}",
  "p_nova_tag": "T4 - TRANSFERIDO",
  "p_atendente": "{{nome_atendente}}"
}
```

### O que cada campo significa?

| Campo | O que colocar | Exemplo |
|-------|--------------|---------|
| `p_telefone` | Telefone do cliente | `"5511999887766"` |
| `p_nova_tag` | Sempre `"T4 - TRANSFERIDO"` | `"T4 - TRANSFERIDO"` |
| `p_atendente` | Nome do atendente que recebeu | `"Maria Santos"` |

### O que acontece no banco?
- Muda a tag para T4
- Registra qual atendente assumiu

---

## PONTO 5 — Humano Coletou o Pagamento (com CSAT)

### Quando usar?
Quando o atendente humano resolve o caso e coleta o pagamento.
Esse é o momento final do atendimento humano, geralmente após a pesquisa CSAT.

### URL
```
https://zfgezrwksmuhnrmudnas.supabase.co/rest/v1/rpc/sieg_fin_atualizar_status
```

### Body
```json
{
  "p_telefone": "{{telefone}}",
  "p_valor_recuperado": {{valor_pago}},
  "p_tipo_recuperacao": "humano",
  "p_data_pagamento": "{{data_pagamento}}",
  "p_nota_csat": {{nota_csat}},
  "p_opiniao_csat": "{{opiniao_csat}}",
  "p_historico_conversa": "{{historico}}"
}
```

### O que cada campo significa?

| Campo | O que colocar | Exemplo | Obrigatório? |
|-------|--------------|---------|-------------|
| `p_telefone` | Telefone do cliente | `"5511999887766"` | SIM |
| `p_valor_recuperado` | Valor que pagou (número) | `4200.00` | SIM |
| `p_tipo_recuperacao` | Sempre `"humano"` | `"humano"` | SIM |
| `p_data_pagamento` | Data do pagamento | `"2026-03-22"` | NÃO |
| `p_nota_csat` | Nota de satisfação (1 a 5) | `5` | NÃO |
| `p_opiniao_csat` | Comentário do cliente | `"Ótimo atendimento"` | NÃO |
| `p_historico_conversa` | Resumo da conversa | `"Cliente pediu parcelamento..."` | NÃO |

### O que acontece no banco?
- Soma o valor em "Recuperado por Humano"
- Marca situação como "concluído"
- Salva nota CSAT e comentário
- Registra no histórico de valores

---

## PONTO 6 — Marcar como Passível de Suspensão (manual)

### Quando usar?
Quando você quer marcar manualmente um cliente como passível de suspensão.
**NOTA:** A função já faz isso AUTOMATICAMENTE quando detecta 10+ disparos
sem pagamento. Use este ponto só se precisar marcar manualmente.

### URL
```
https://zfgezrwksmuhnrmudnas.supabase.co/rest/v1/rpc/sieg_fin_atualizar_status
```

### Body
```json
{
  "p_telefone": "{{telefone}}",
  "p_nova_tag": "T5 - PASSIVEL DE SUSPENSAO",
  "p_observacoes": "{{motivo}}"
}
```

---

## Resumo Visual do Fluxo

```
DISPARO (Ponto 1)
    │
    ▼
[T1 - SEM RESPOSTA]
    │
    ├── Cliente respondeu? ──► Ponto 2 ──► [T2 - RESPONDIDO]
    │                                          │
    │                                          ├── IA validou pagamento?
    │                                          │       ▼
    │                                          │   Ponto 3 ──► [T3 - PAGO IA] ✅
    │                                          │
    │                                          └── Transferiu pro humano?
    │                                                  ▼
    │                                              Ponto 4 ──► [T4 - TRANSFERIDO]
    │                                                  │
    │                                                  └── Humano coletou?
    │                                                          ▼
    │                                                      Ponto 5 ──► [T4 + PAGO] ✅
    │
    └── 10+ disparos sem pagar? ──► Automático ──► [T5 - SUSPENSÃO] ⚠️
```

---

## Testando

Para testar se está funcionando, você pode usar o Postman ou o próprio NicoChat:

1. Configure o Ponto 1 com um telefone de teste (ex: `"5500000000001"`)
2. Envie o request
3. Abra o dashboard e veja se o valor aparece em "Valor Pendente"
4. Configure o Ponto 3 com o mesmo telefone
5. Envie o request
6. Atualize o dashboard — o valor deve mover de "Pendente" para "Recuperado por IA"

---

## Dúvidas Frequentes

**P: Os valores vêm com vírgula (1.500,00) ou ponto (1500.00)?**
R: As RPCs aceitam ambos os formatos: ponto decimal (`1500.00`) e formato BR com vírgula (`1.297,90`). O sistema converte automaticamente. Exemplo: tanto `1500.00` quanto `1.500,00` funcionam.

**P: O telefone precisa ter o +55?**
R: Não importa. A função remove automaticamente +, espaços e hífens.
Tanto `"+55 11 99988-7766"` quanto `"5511999887766"` funcionam.

**P: E se o NicoChat enviar o mesmo disparo 2 vezes?**
R: Cada chamada cria um novo registro. Se enviar 2x, vai contar como 2 disparos.
Isso é proposital — se realmente disparou 2 vezes, deve contar 2.

**P: Posso enviar campos vazios?**
R: Os campos obrigatórios (marcados como SIM) precisam ter valor.
Os opcionais podem ser omitidos do JSON — não precisa enviar campo vazio.

**P: Como sei se funcionou?**
R: A resposta do request vai ter um JSON com `"sucesso": true` ou `"sucesso": false`.
Se der false, o campo `"erro"` explica o que aconteceu.

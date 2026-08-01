# Desempenho e capacidade

## Orçamentos iniciais

- páginas públicas: p95 abaixo de 750 ms no ensaio base;
- APIs administrativas: p95 abaixo de 1,5 s;
- taxa de erro abaixo de 1%;
- conclusão de previsão abaixo de 2 minutos por utilizador;
- recálculo e snapshots executados em fila fora do pedido público.

## Ensaio

```bash
k6 run -e BASE_URL=https://staging.example.pt tests/load/k6-smoke.js
```

Executar com dados representativos e aumentar progressivamente VUs. Não executar
carga contra produção sem janela e aprovação.

## Pontos de atenção

- ranking e agregações;
- importações grandes;
- geração de cartões;
- sessões e rate limiting;
- ligações PostgreSQL;
- cache e invalidação após resultados oficiais.

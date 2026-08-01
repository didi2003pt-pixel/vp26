# Observabilidade

## Sinais

- `/api/health`: vida do processo;
- `/api/ready`: PostgreSQL e Redis;
- `/api/metrics`: métricas Prometheus protegidas;
- logs JSON com redaction;
- `X-Request-Id` em pedidos e respostas;
- `instrumentation.ts` para erros do servidor;
- `security_events` para CSP, rate limits e autenticação.

## Alertas mínimos

- readiness indisponível por 5 minutos;
- importações pendentes acima do SLA;
- cálculo falhado;
- evento CRITICAL;
- pedido RGPD perto ou além do prazo;
- backup diário ausente ou não verificado;
- espaço em disco e memória acima de 80%.

Não colocar emails, telefones, tokens, cookies ou IP em claro nos logs.

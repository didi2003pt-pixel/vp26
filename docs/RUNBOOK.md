# Runbook local

1. Copiar `.env.example` para `.env`.
2. Gerar `AUTH_PEPPER` com pelo menos 32 caracteres aleatórios.
3. Executar `docker compose up -d postgres redis minio mailpit`.
4. Executar `npm install`.
5. Executar `npm run db:deploy`.
6. Definir credenciais de seed administrativo e executar `npm run db:seed`.
7. Executar `npm run dev`.
8. Confirmar `/api/health` e `/api/ready`.

## Recuperação local

```bash
docker compose down
docker volume rm desafio-volta-vela-2026-foundation_postgres_data
npm run infra:up
npm run db:deploy
npm run db:seed
```

Não executar a remoção de volume em produção.


## Fase 2 — fecho de mercados

Executar periodicamente:

```bash
npm run markets:close
```

Em produção, usar `POST /api/cron/close-markets` com `Authorization: Bearer $CRON_SECRET`. O endpoint é idempotente.

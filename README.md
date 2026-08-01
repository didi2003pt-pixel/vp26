# Desafio Volta à Vela 2026 — Fase 5

> [!IMPORTANT]
> **GitHub Pages não executa esta aplicação.** Para publicar a aplicação completa, use um serviço Node/Docker. Existe uma configuração Railway pronta em `railway.json`; consulte `docs/RAILWAY_DEPLOY.md`.


Aplicação full-stack para previsões ANC/ORC, resultados Sailti, pontuação,
classificações, missões, prémios e comunicação.

A Fase 5 adiciona segurança de produção, RGPD operacional, observabilidade, retenção,
backups, testes e gates de lançamento.

## Arranque de desenvolvimento

Requisitos recomendados:

- Node.js 24 LTS;
- npm 10+;
- Docker;
- PostgreSQL 18;
- Redis 8.

```bash
cp .env.example .env
# substituir todos os segredos
npm install
npm run db:generate
docker compose up -d postgres redis minio mailpit
npm run db:deploy
npm run db:seed
npm run dev
```

## Verificações

```bash
npm run validate:all
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run release:gate
```

O `release:gate` deve falhar enquanto não houver lockfile, configuração de produção,
validação jurídica, backup/restauro e testes reais.

## Operações

```bash
npm run markets:close
npm run results:recalculate
npm run privacy:retention
npm run backup:db
npm run backup:verify -- backups/ficheiro.dump.age
```

## Rotas operacionais

- `/api/health`
- `/api/ready`
- `/api/version`
- `/api/metrics` — Bearer token
- `/perfil/privacidade`
- `/admin/privacidade`

## Documentação

- `docs/PRODUCTION_RUNBOOK.md`
- `docs/RGPD.md`
- `docs/DPIA_SCREENING.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/BACKUP_RESTORE.md`
- `docs/OBSERVABILITY.md`
- `docs/PERFORMANCE.md`
- `docs/PHASE5_REPORT.md`
- `PHASE5_VALIDATION.json`

## Estado

O código da Fase 5 está implementado e verificado estruturalmente. Não está autorizado
para produção até o gate de lançamento ser concluído em staging.

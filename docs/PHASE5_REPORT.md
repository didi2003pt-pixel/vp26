# Relatório da Fase 5 — produção, segurança e RGPD

## Implementado

- Proxy Next.js 16 com nonce CSP, controlo de origem, HSTS e cabeçalhos;
- request IDs;
- logs estruturados com redaction;
- eventos de segurança;
- hashing de IP por defeito;
- sessões reforçadas;
- bloqueio temporário após falhas de login;
- centro de privacidade;
- exportação de dados;
- pedidos de acesso e apagamento;
- anonimização auditada;
- retenção automática;
- métricas protegidas;
- liveness/readiness/version;
- backups, verificação, restauro e pruning;
- compose de produção endurecido;
- Nginx de fronteira;
- CI, auditoria de dependências, Playwright e k6;
- documentação de RGPD, incidentes, backups, observabilidade e lançamento.

## Validação estrutural final

- fundação: aprovada;
- Fase 2: 33/33;
- Fase 3: 140/140;
- Fase 4: 10/10;
- Fase 5: 31/31;
- funções puras de operação: 7/7;
- 141 ficheiros TypeScript/TSX transpilados sem diagnósticos;
- Prisma: 54 modelos, 37 enums, cinco migrações e nenhum campo duplicado;
- JSON, YAML e scripts shell validados;
- pesquisa de privacidade sem nomes reais de tripulantes no pacote.

O detalhe está em `PHASE5_VALIDATION.json`.

## Limitações reais

- Dependências npm não foram instaladas: o registo disponível não fornece
  `@types/node` e o acesso ao registo público expirou.
- Não foi gerado `package-lock.json`.
- PostgreSQL, Redis, Docker, Prisma generate/migrate, Next build e Playwright não
  foram executados neste ambiente.
- A API/exportação real Sailti continua por confirmar.
- Termos, privacidade, menores, prémios e períodos de retenção exigem validação jurídica.
- O pacote não é uma autorização de lançamento. O `release:gate` foi desenhado para
  falhar enquanto existirem bloqueios.

## Próximo estado

Executar o runbook numa infraestrutura de staging com Node 24, PostgreSQL 18, Redis,
TLS e o registo npm oficial. Só depois produzir uma release candidata.

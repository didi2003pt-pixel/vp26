# Publicação correta no Railway

## O que aconteceu no GitHub Pages

O GitHub Pages publicou o `README.md`. Isso é documentação estática, não é a aplicação.
Este projeto utiliza Next.js em modo `standalone`, Server Actions, cookies, APIs, Prisma,
PostgreSQL e Redis. Portanto precisa de um processo Node.js em execução.

O GitHub continua a ser usado como repositório do código. O runtime deve ficar no Railway
ou noutro serviço capaz de executar Docker/Node.

## Serviços do projeto Railway

Criar no mesmo projeto:

1. `web` — repositório GitHub, usando o `Dockerfile` da raiz;
2. `Postgres` — serviço PostgreSQL gerido;
3. `Redis` — serviço Redis gerido;
4. armazenamento S3 compatível — serviço externo ou MinIO;
5. SMTP — fornecedor real ou Mailpit apenas em staging.

## Passos

### 1. Desativar o GitHub Pages

Não usar o endereço `github.io` como endereço da aplicação. O repositório continua no GitHub.

### 2. Criar o serviço web

No Railway:

- New Project;
- Deploy from GitHub Repo;
- escolher `FPV-Desafio-Volta-Vela-2026`;
- confirmar que o Root Directory é `/`;
- confirmar que o Railway detetou o `Dockerfile`.

O ficheiro `railway.json` define:

- Dockerfile;
- migrações antes do deploy;
- arranque do servidor standalone;
- healthcheck em `/api/ready`;
- reinício em caso de falha.

### 3. Adicionar bases de dados

Adicionar PostgreSQL e Redis ao mesmo projeto.

No serviço `web`, configurar:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

Os nomes `Postgres` e `Redis` têm de coincidir com os nomes reais dos serviços no Railway.

### 4. Gerar domínio

Em `web`:

- Settings;
- Networking;
- Generate Domain.

Depois atualizar:

```env
APP_URL=https://dominio-gerado.up.railway.app
TRUSTED_ORIGINS=https://dominio-gerado.up.railway.app
```

### 5. Configurar segredos

Copiar as variáveis de `.env.railway.example` para o separador Variables.

Nunca colocar segredos reais no GitHub.

Gerar valores diferentes para:

- `AUTH_PEPPER`;
- `IP_HASH_PEPPER`;
- `METRICS_TOKEN`;
- `CRON_SECRET`;
- `RESULTS_CRON_SECRET`;
- `RETENTION_CRON_SECRET`.

### 6. Configurar email e armazenamento

A aplicação valida `SMTP_*` e `S3_*` no arranque.

Para staging:

- SMTP: Mailpit ou uma conta SMTP de testes;
- S3: MinIO ou bucket de testes.

Para produção:

- SMTP transacional;
- AWS S3, Cloudflare R2 ou armazenamento equivalente.

### 7. Primeiro deploy

O Railway deve executar:

1. build Docker;
2. `npm run db:deploy`;
3. `node apps/web/server.js`;
4. healthcheck `/api/ready`.

Depois do primeiro deploy, executar uma única vez o seed num ambiente controlado:

```bash
npm run db:seed
```

Não repetir o seed automaticamente em todos os deploys.

## Verificações

Abrir:

- `/api/health`;
- `/api/ready`;
- `/api/version`.

Depois testar:

- registo;
- verificação de email;
- login;
- área administrativa;
- etapas;
- submissão e fecho de previsão.

## Limitações atuais

- Não existe `package-lock.json`; o build ainda não é totalmente reprodutível.
- É obrigatório rever os logs do primeiro build.
- Sailti continua em modo `file` até existir fonte autorizada.
- O site não deve ser considerado produção antes dos testes integrados e jurídicos.

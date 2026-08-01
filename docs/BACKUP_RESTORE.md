# Backup e restauro

## Política inicial

- dump lógico PostgreSQL diário em formato custom;
- cifragem obrigatória em produção;
- checksum SHA-256;
- retenção inicial de 30 dias;
- cópia fora da infraestrutura principal;
- teste de restauro pelo menos mensal e antes do lançamento;
- backup do armazenamento de objetos separado.

## Criar

```bash
BACKUP_ENCRYPTION_RECIPIENT=age1... npm run backup:db
```

## Verificar

```bash
BACKUP_AGE_IDENTITY_FILE=/secure/key.txt npm run backup:verify -- backups/file.dump.age
```

## Restaurar

Executar primeiro em ambiente isolado:

```bash
export RESTORE_CONFIRM=RESTORE_DESAFIO_VOLTA
export BACKUP_AGE_IDENTITY_FILE=/secure/key.txt
npm run restore:db -- backups/file.dump.age
npm run db:deploy
```

Depois validar contagens, autenticação, previsões, resultados, pontuação e rankings.

## Objetivos propostos

- RPO: 24 horas no MVP; reduzir com WAL/PITR antes de tráfego elevado.
- RTO: 4 horas, sujeito a ensaio real.
- Os valores não são garantias enquanto não houver teste cronometrado.

# Runbook de produção

## Gate de lançamento

1. Aprovação jurídica de termos, privacidade, menores e prémios.
2. `package-lock.json` gerado e `npm ci` reproduzível.
3. Migrações aplicadas em staging com `prisma migrate deploy`.
4. Build Next.js e testes unitários, integração e Playwright aprovados.
5. Teste de importação real Sailti.
6. Teste de pontuação com resultado conhecido e revisão a quatro olhos.
7. Backup cifrado e restauro cronometrado.
8. CSP em report-only, correção de violações e ativação enforcement.
9. Segredos exclusivos e rotação documentada.
10. Monitorização, alertas e contactos de incidente.
11. Ensaio de carga.
12. Feature flags abertas por etapas.

## Deploy

- criar backup;
- aplicar migrações com `npm run db:deploy`;
- publicar imagem imutável;
- verificar `/api/health`, `/api/ready` e `/api/version`;
- executar smoke tests;
- abrir flags uma a uma;
- acompanhar logs e métricas.

## Rollback

- desligar flags públicas;
- reverter imagem;
- não reverter migrações destrutivas automaticamente;
- restaurar backup apenas após decisão de incidente;
- documentar impacto em previsões e resultados.

## Tarefas periódicas

- fecho de mercados;
- recálculo de resultados;
- retenção;
- backup e verificação;
- revisão de pedidos RGPD;
- atualização de dependências;
- revisão de acessos administrativos.

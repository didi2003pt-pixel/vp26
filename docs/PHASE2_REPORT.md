# Relatório da Fase 2

## Entregue

- migração do domínio de previsões;
- 16 mercados em rascunho: ANC e ORC para oito etapas;
- páginas de etapas e embarcações;
- fluxo autenticado de previsão;
- pergunta especial configurável;
- seleção editorial de outsiders;
- perfil do participante;
- administração de etapas, mercados e feature flags;
- fecho automático por CLI e endpoint protegido;
- histórico de revisões e auditoria;
- testes unitários do domínio;
- verificação estática sem dependências.

## Deliberadamente excluído

- resultados Sailti;
- cálculo de pontos;
- rankings;
- missões;
- prémios;
- estatísticas sociais.

## Estado de validação

O código foi verificado quanto a estrutura, sintaxe TypeScript/TSX, integridade dos seeds, presença da migração e ausência de dados pessoais de tripulantes. Não foi possível executar instalação npm, migração PostgreSQL, testes Vitest ou build Next.js no ambiente de geração.

## Gate para a Fase 3

Antes de avançar:

- executar `npm install` e guardar `package-lock.json`;
- executar `npm run db:generate`;
- aplicar migrações numa base de teste;
- executar `npm test`, `npm run typecheck` e `npm run build`;
- testar duas contas concorrentes no instante de fecho;
- validar a operação de cron;
- aprovar formalmente o modelo de pergunta e outsiders.

# Operação da Fase 2

## Checklist antes de abrir previsões

- etapa correta e não retroativa;
- horário confirmado em Europe/Lisbon;
- mercados ANC e ORC configurados;
- embarcações da etapa revistas;
- outsiders aprovadas pela organização;
- pergunta especial revista;
- conta de teste removida ou claramente identificada;
- `CRON_SECRET` configurado;
- backup efetuado;
- feature flags ainda desligadas.

## Abertura

1. Alterar o mercado para `OPEN`.
2. Alterar a etapa para `PREDICTIONS_OPEN`.
3. Testar com uma conta interna.
4. Ativar `public_game_enabled`.
5. Ativar `predictions_enabled`.

## Fecho

O sistema rejeita submissões no instante do fecho, mesmo que o cron ainda não tenha corrido. O cron converte mercados expirados em `CLOSED` e previsões submetidas em `LOCKED`.

## Incidentes

- Não editar diretamente previsões na base de dados.
- Não encurtar o prazo depois da primeira previsão.
- Não alterar pergunta ou outsiders depois da primeira previsão.
- Para cancelar um mercado, desligar previsões e registar a decisão.
- Não importar resultados nesta fase.

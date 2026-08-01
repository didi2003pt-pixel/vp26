# Domínio de previsões

## Mercado

Cada etapa possui um mercado ANC e um mercado ORC. O mercado tem estado, abertura, fecho e regra de compatibilidade entre surpresa e pódio.

Um mercado aceita uma previsão apenas quando:

- `PredictionMarket.status = OPEN`;
- `Stage.status = PREDICTIONS_OPEN`;
- abertura e fecho estão configurados;
- a hora do servidor está dentro da janela;
- as feature flags públicas estão ativas.

## Seleção

A previsão contém:

1. vencedor;
2. segundo;
3. terceiro;
4. surpresa;
5. resposta especial, quando ativa.

As três posições são distintas. Todas as embarcações têm de estar associadas à etapa e à classe. A surpresa tem de estar marcada editorialmente como elegível.

## Perguntas especiais

Tipos suportados:

- escolha única;
- verdadeiro/falso;
- número exato;
- intervalo numérico;
- diferença de tempo;
- intervalo de tempo.

A resposta correta ainda não é utilizada; pertence à Fase 3. A configuração da pergunta fica bloqueada após a primeira previsão.

## Revisões

Uma edição antes do fecho não apaga a versão anterior. A tabela `prediction_revisions` conserva o snapshot anterior e o novo snapshot, o ator e o motivo.

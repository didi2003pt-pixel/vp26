# Motor de pontuação

## Contrato

O pacote `@desafio/scoring` recebe uma previsão, as entradas do resultado, uma versão das regras e a definição da pergunta especial. Devolve:

- total de pontos;
- eventos explicativos;
- métricas para desempate;
- erro numérico da pergunta especial.

Não acede à base de dados e não conhece a interface.

## Regras normalizadas

| Código | Pontos iniciais | Regra |
|---|---:|---|
| `WINNER_EXACT` | 100 | Vencedor exato |
| `PODIUM_EXACT_SECOND` | 75 | Segundo exato |
| `PODIUM_EXACT_THIRD` | 75 | Terceiro exato |
| `PODIUM_WRONG_POSITION` | 40 | Barco no pódio, posição diferente |
| `SURPRISE_TOP_FIVE` | 60 | Surpresa no top 5 |
| `SPECIAL_QUESTION_CORRECT` | 50 | Resposta correta |
| `ALL_ELIGIBLE_STAGES_BONUS` | 100 | Todas as etapas elegíveis desde o lançamento |

Uma escolha do pódio recebe apenas a regra mais alta aplicável. Nunca recebe simultaneamente pontuação exata e pontuação de posição errada. Cada mercado fica associado a uma versão concreta do conjunto de regras; novas versões só são atribuídas automaticamente a mercados ainda em rascunho e sem previsões.

## Pergunta especial

- escolha, verdadeiro/falso e intervalos por opção: igualdade do valor normalizado;
- número exato: diferença absoluta dentro da tolerância;
- diferença temporal: valor em segundos dentro da tolerância.

A resposta oficial pode vir do resultado importado ou da configuração administrativa da pergunta.

## Ciclo de cálculo

1. carregar resultado atual;
2. carregar previsões submetidas/bloqueadas;
3. selecionar conjunto ativo de regras;
4. calcular eventos em memória;
5. criar `calculation_run` serializável;
6. guardar `score_events`;
7. atualizar `user_stage_scores`;
8. recalcular totais;
9. criar snapshots de ranking;
10. guardar auditoria.

Um recálculo não apaga os eventos antigos: o cálculo anterior é marcado como substituído e deixa de ser atual.

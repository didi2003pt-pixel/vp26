# Classificações e desempates

## Rankings produzidos

- `GENERAL`: total por utilizador e classe;
- `STAGE`: pontos da etapa e classe;
- `CITY`: média dos dez melhores utilizadores da cidade;
- `CLUB`: média dos dez melhores utilizadores do clube.

Cada execução cria snapshots, permitindo auditar a evolução e distinguir dados provisórios de definitivos. Quando o resultado de origem é substituído, os respetivos snapshots passam a `SUPERSEDED` e deixam de ser apresentados publicamente.

## Desempate individual

1. mais vencedores exatos;
2. mais posições exatas no pódio;
3. mais surpresas corretas;
4. mais perguntas especiais corretas;
5. menor erro numérico acumulado;
6. previsão mais cedo na última etapa relevante;
7. nickname/identificador como ordenação técnica estável.

O último critério não substitui o sorteio previsto no regulamento; apenas garante uma ordem técnica determinística até existir decisão administrativa.

## Comunidades

A metodologia padrão é `average_top_10`:

- ordena os pontos individuais da comunidade;
- utiliza no máximo os dez melhores;
- calcula a média;
- mostra também pontos brutos e número total de participantes.

Isso reduz a vantagem automática de cidades ou clubes com mais inscritos. A metodologia deve constar no regulamento público.

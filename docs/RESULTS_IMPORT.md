# Importação e publicação de resultados

## Formatos aceites

### CSV

Cabeçalhos reconhecidos incluem variantes portuguesas e inglesas:

```csv
position;sail_number;boat_number;boat_name;status;elapsed_time;corrected_time;penalty
1;POR 49;10;Allaboard49;CLASSIFIED;02:31:10;02:20:00;
2;POR 8551;6;Anthea;CLASSIFIED;02:34:10;02:22:00;
```

Estados aceites: `CLASSIFIED`, `DNF`, `DNS`, `DNC`, `DSQ`, `RET`, `OCS`, `BFD`, `UFD`, `SCP`, `RDG`.

### JSON

```json
{
  "provider": "SAILTI_FILE",
  "format": "JSON",
  "status": "PROVISIONAL",
  "publishedAt": "2026-07-30T18:00:00+01:00",
  "entries": [
    {
      "sailNumber": "POR 49",
      "boatNumber": "10",
      "boatName": "Allaboard49",
      "position": 1,
      "status": "CLASSIFIED"
    }
  ]
}
```

### XRR/XML

O parser procura os elementos típicos de identificação, posição, estado e tempos. Como implementações XRR podem variar, qualquer ficheiro novo deve ser testado numa importação de ensaio antes da etapa real.

### Manual

Formato por linha:

```text
1|10|CLASSIFIED
2|6|CLASSIFIED
|11|DNF
```

É um fallback, não o fluxo principal.

## Correspondência de embarcações

Ordem:

1. identificador externo;
2. número de vela oficial do certificado;
3. número de barco oficial;
4. nome público ou alias;
5. seleção manual.

A seleção manual é validada contra a lista de embarcações elegíveis da etapa e da classe.

## Estados da importação

- `NEEDS_REVIEW`: contém linhas ambíguas, não associadas ou inválidas;
- `READY`: todas as linhas ativas estão associadas;
- `CONFIRMED`: originou um resultado imutável;
- `REJECTED` / `FAILED`: reservado para rejeição ou falha operacional.

## Confirmação

Antes da confirmação:

- fechar o mercado;
- resolver ou ignorar cada linha;
- verificar vencedor e posições;
- guardar a resposta oficial da pergunta especial;
- escolher provisório ou oficial.

Uma nova fonte para a mesma etapa/classe gera uma nova versão. A versão anterior não é apagada.

## Gestão de incidentes

- fonte incorreta: não confirmar; criar nova importação;
- linha associada ao barco errado: corrigir antes da confirmação;
- resultado oficial corrigido: importar a nova versão, confirmar e recalcular;
- Sailti indisponível: utilizar exportação oficial ou introdução manual;
- HTML alterado: não adaptar em produção sem testes e autorização.

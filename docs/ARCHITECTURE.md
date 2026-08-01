# Arquitetura — Fase 3

```text
Sailti / ficheiro oficial / operação manual
  → @desafio/sailti
    → normalização e correspondência
      → result_imports + result_import_rows
        → revisão administrativa
          → stage_results versionados
            → @desafio/scoring
              → calculation_runs + score_events
                → user_stage_scores + user_total_scores
                  → ranking_snapshots
                    → páginas públicas e perfil
```

## Módulos

- `apps/web`: administração de resultados, regras e páginas públicas.
- `packages/sailti`: fornecedores, parsers, normalização e correspondência.
- `packages/scoring`: regras puras e validação do resultado.
- `packages/database`: persistência, confirmação, cálculo e snapshots.
- `packages/game`: submissão e normalização das previsões.
- `packages/auth`, `config`, `ui`: infraestrutura partilhada.

## Consistência

- uma importação idêntica é idempotente por fornecedor, hash, etapa e classe;
- uma versão de resultado é única por etapa, classe e número;
- apenas uma versão fica `isCurrent` por fluxo de confirmação;
- uma embarcação não se repete no mesmo resultado;
- um evento não se repete no mesmo cálculo, previsão, regra e sujeito;
- um total de etapa existe por utilizador e mercado;
- transações críticas usam isolamento `Serializable` e repetição em conflito;
- as alterações deixam registo em `audit_logs`.

## Fronteira de confiança

O browser nunca decide prazos, permissões, elegibilidade, associação ou pontos. Todas as regras críticas são repetidas no servidor e na base de dados.

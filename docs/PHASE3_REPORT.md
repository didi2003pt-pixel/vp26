# Relatório da Fase 3 — Resultados, pontuação e rankings

## Âmbito entregue

A Fase 3 acrescenta ao jogo:

- importações versionadas de resultados;
- formatos CSV, JSON e XRR/XML;
- introdução manual auditada;
- correspondência controlada de embarcações;
- resultados provisórios, oficiais e substituídos;
- motor de pontuação independente da interface;
- eventos individuais de pontuação;
- totais por etapa e por classe;
- snapshots de ranking;
- páginas públicas de resultados e classificações;
- painel administrativo de resultados e regras;
- rotina protegida de recálculo.

## Decisões de arquitetura

1. **O resultado oficial é ingerido, não recalculado.** Ratings ANC/ORC não produzem posições no jogo.
2. **Fonte imutável.** Cada importação guarda conteúdo original, dimensão, nome e SHA-256.
3. **Confirmação humana.** Uma importação com linhas ambíguas, inválidas ou não associadas não pode ser confirmada.
4. **Mercado fechado.** Não se confirma um resultado com previsões abertas ou em rascunho.
5. **Versionamento.** Uma correção cria uma nova versão de `stage_results`; a anterior passa a `SUPERSEDED`.
6. **Pontuação explicável.** Cada regra aplicada gera um `score_event` independente.
7. **Recálculo seguro.** Cálculos e confirmação usam transações `Serializable` com repetição em conflitos P2034.
8. **Separação por classe.** ANC e ORC mantêm resultados, pontos e rankings próprios.
9. **Comunidades justas.** Cidade e clube usam média dos dez melhores, não apenas soma total.
10. **Regras fixadas por mercado.** Um mercado conserva a versão das regras que lhe foi atribuída; alterações futuras não reescrevem etapas anteriores.
11. **Correções sem dados obsoletos.** Ao substituir um resultado, eventos, pontuações e snapshots antigos passam a `VOID`/`SUPERSEDED` até existir novo cálculo.

## Segurança e integridade

- permissões `RESULTS_MANAGER`, `ADMIN` ou `SUPERADMIN`;
- limite configurável de ficheiro;
- validação de formato e estados;
- associação manual limitada às embarcações elegíveis da etapa/classe;
- hash e auditoria;
- bloqueio de alterações após confirmação;
- feature flags desligadas no seed;
- endpoint cron protegido por segredo separado.

## Dados reais

Não foram adicionados resultados reais. Os PDFs provisórios/históricos permanecem fora dos seeds e fixtures. As fixtures do pacote Sailti usam nomes e números explicitamente marcados como teste.

## Testes executáveis incluídos

- motor de pontuação;
- não acumulação de 75 + 40;
- surpresa top 5;
- pergunta especial com tolerância;
- validação de estados/posições;
- parser CSV;
- prioridade do número de vela na correspondência;
- verificação estrutural dos modelos, migração, seeds, rotas e ausência de resultados reais.

## Limitação de validação

Não foi possível executar instalação npm, geração Prisma, migração real, build Next.js, Docker ou Playwright no ambiente de geração. Essas verificações não são substituídas por análise estática e são bloqueadoras antes do lançamento.

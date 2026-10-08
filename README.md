# FPV — Novo Website · Release Candidate para entrega técnica

Referência visual e funcional consolidada para validação final pela Federação Portuguesa de Vela e entrega à equipa responsável pela implementação/alojamento.

## Estado atual

- 26 entradas HTML no protótipo, incluindo o redirecionamento de calendário.
- Homepage, Descobrir, Competição, Alto Rendimento, Formação, Clubes, Notícias, Federação, Documentação, Pesquisa e myFPV consolidados.
- Diretório de Clubes alinhado com a listagem oficial de 2026: 87 entidades.
- Perfis individuais de clube alimentados pela mesma fonte de dados.
- Centro de Documentação com 24 documentos ligados diretamente a ficheiros oficiais da FPV.
- Notícias do protótipo revistas para remover conteúdo demonstrativo visível.
- Acessibilidade já reforçada em menu móvel, pesquisa, filtros, foco de teclado e hierarquia de headings.
- Responsividade revista nas áreas principais, com otimizações específicas para mobile.
- myFPV modernizado como gateway para a plataforma oficial, sem recolha local de credenciais.

## Plataformas externas já definidas

- Calendário competitivo: https://fpv.bogolab.es/pt/calendario?ini=1
- Submissão de resultados nacionais/internacionais: https://script.google.com/macros/s/AKfycbwV304-vXzeNyvjPEyjG2idxhW4JRzzQYnXn02P8iynjk_7PaXWkVfHl2R9NAeIRBcfXw/exec
- myFPV / área reservada: https://backoffice.fpvela.pt/

## Implementação final

Este repositório deve ser tratado como referência de arquitetura, design, conteúdo e comportamento. Antes da publicação no domínio oficial deverão ser concluídos em staging:

- integração no CMS/stack definitivo;
- redirects 301 das URLs antigas relevantes;
- sitemap, robots.txt e canonicals;
- revisão final de metadados SEO;
- auditoria completa em browsers e dispositivos físicos;
- validação de acessibilidade no ambiente final;
- confirmação de analytics/cookies apenas se forem efetivamente instalados;
- alojamento local dos assets críticos atualmente externos, quando aplicável;
- backup e plano de rollback.

Não substituir diretamente o website oficial por estes ficheiros estáticos sem esta fase de implementação e QA em staging.

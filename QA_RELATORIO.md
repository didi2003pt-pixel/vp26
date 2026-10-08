# Relatório QA — Release Candidate FPV

## Verificações e correções já realizadas

- Entradas HTML no protótipo: 26.
- Diretório oficial de clubes: 87 entidades.
- Perfis de clube: gerados a partir da mesma base de dados do diretório.
- Documentação: 24 entradas com ligação direta para ficheiros oficiais da FPV.
- Notícias: removido o conteúdo demonstrativo visível e revistos os destinos principais.
- Formação: filtros corrigidos e estados acessíveis sincronizados.
- Menu móvel: aria-expanded, aria-controls, aria-hidden e fecho por Escape.
- Pesquisa global: gestão de foco, Escape e devolução de foco ao elemento de origem.
- Foco de teclado: estado :focus-visible global.
- Headings da homepage: corrigida hierarquia e HTML inválido.
- Clubes: contador inicial corrigido para 87 e filtros com feedback acessível.
- Competição: calendário e submissão de resultados ligados aos destinos operacionais definidos.
- myFPV: gateway modernizado e simplificado para um único CTA principal.

## Destinos operacionais confirmados

- Calendário competitivo:
  https://fpv.bogolab.es/pt/calendario?ini=1
- Submissão de participação/resultado nacional ou internacional:
  https://script.google.com/macros/s/AKfycbwV304-vXzeNyvjPEyjG2idxhW4JRzzQYnXn02P8iynjk_7PaXWkVfHl2R9NAeIRBcfXw/exec
- Área reservada myFPV:
  https://backoffice.fpvela.pt/

## Pontos ainda obrigatórios em staging/produção

- testar todos os layouts em desktop, tablet e mobile físicos;
- validar Chrome, Safari, Firefox e Edge;
- validar todos os links externos e downloads no domínio final;
- preparar redirects 301;
- gerar sitemap e robots.txt;
- definir canonical URLs;
- rever title/description finais por página;
- validar analytics/cookies caso sejam adicionados;
- confirmar direitos de uso das fotografias;
- reduzir dependências remotas críticas, incluindo fontes/logótipos, quando viável;
- executar auditoria final de acessibilidade no ambiente publicado;
- validar backup e rollback.

## Resultado

A versão está apta para entrega técnica à empresa responsável pela implementação/alojamento como Release Candidate e referência funcional. A publicação em produção deve ocorrer apenas depois da integração em staging e da validação final da FPV.

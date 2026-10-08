# Mapa de implementação WordPress / CMS

## Estruturas de conteúdo recomendadas

- **Atleta** — arquivo + perfil individual.
- **Clube** — arquivo + perfil individual.
- **Formação / Curso** — arquivo + detalhe.
- **Documento** — arquivo central com filtros e relações.
- **Notícia** — listagem + artigo.

## Taxonomias

- Classe
- Região / Associação Regional
- Área
- Categoria
- Subcategoria
- Ano
- Tags

## Templates

- archive-atletas / single-atleta
- archive-clubes / single-clube
- archive-formacao / single-formacao
- archive-documentos
- artigo de notícia
- página institucional genérica
- template de órgão/conselho
- gateway externo myFPV

## Componentes reutilizáveis

- Header e navegação
- Hero institucional / editorial
- Card atleta
- Card clube
- Pesquisa e filtros
- Linha de documento
- Course card
- Tags
- Conteúdo relacionado
- CTA externo
- Footer institucional
- Estados de foco e interação acessíveis

## Website institucional vs. plataformas operacionais

### Manter no website institucional
- Descobrir
- Alto Rendimento
- Formação institucional
- Clubes
- Notícias
- Federação
- Centro de Documentação
- Pesquisa
- páginas de contexto e orientação

### Encaminhar para serviços externos
- Calendário competitivo:
  https://fpv.bogolab.es/pt/calendario?ini=1
- Submissão de resultados nacionais/internacionais:
  https://script.google.com/macros/s/AKfycbwV304-vXzeNyvjPEyjG2idxhW4JRzzQYnXn02P8iynjk_7PaXWkVfHl2R9NAeIRBcfXw/exec
- myFPV / área reservada:
  https://backoffice.fpvela.pt/

## Princípio documental

Existe uma única base de Documentos. As páginas de Federação, Arbitragem, Formação e Alto Rendimento devem abrir subconjuntos filtrados, evitando duplicação.

## Clubes

A implementação deve manter uma única fonte de dados para diretório e perfil individual. A referência atual contém 87 entidades oficiais, organizadas pelas associações regionais.

## Produção

A implementação final deve ser validada em staging antes de qualquer substituição do website atual. Redirects, SEO técnico, acessibilidade, testes multi-browser, performance, backup e rollback fazem parte do go-live.

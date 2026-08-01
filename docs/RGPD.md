# RGPD — desenho operacional

## Âmbito

O sistema trata dados de conta, perfil, cidade/clube, previsões, pontuação, missões,
notificações e prémios. Os documentos de inscrição e tripulação permanecem fora do
frontend e dos seeds.

## Princípios implementados

- minimização de dados;
- marketing separado do funcionamento do jogo;
- versões dos termos e política;
- exportação autenticada;
- pedidos de acesso e apagamento;
- anonimização de identidade mantendo integridade competitiva;
- retenção configurável;
- eventos de segurança sem IP em claro por defeito;
- auditoria de operações administrativas.

## Decisões jurídicas pendentes

1. Identificação formal do responsável pelo tratamento e contactos.
2. Bases legais por finalidade.
3. Idade mínima, menores e autorização parental.
4. Retenção final de previsões, rankings e prémios.
5. Subcontratantes de alojamento, email, armazenamento e monitorização.
6. Transferências internacionais.
7. Necessidade de avaliação de impacto (DPIA).
8. Procedimento de verificação da identidade nos pedidos.
9. Regime fiscal e divulgação de vencedores.

## Direitos dos titulares

O centro `/perfil/privacidade` permite exportação e pedidos. A organização deve
responder dentro do prazo aplicável, documentar extensões e evitar revelar dados de
terceiros no ficheiro de acesso.

## Apagamento

O fluxo técnico utiliza pseudonimização forte:

- revoga sessões;
- remove tokens;
- remove notificações e comunidades;
- elimina nome, email, telefone, avatar, cidade e clube;
- bloqueia autenticação;
- mantém previsões e pontuação sob identidade anonimizada.

A conservação dos registos competitivos exige validação da base legal e do período.

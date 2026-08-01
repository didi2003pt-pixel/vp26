# Resposta a incidentes

## Prioridades

1. Proteger pessoas e conter o incidente.
2. Preservar evidência e linha temporal.
3. Rotacionar credenciais afetadas.
4. Avaliar confidencialidade, integridade e disponibilidade.
5. Avaliar risco para direitos e liberdades.
6. Decidir notificações legais e comunicações.
7. Recuperar a partir de fontes verificadas.
8. Realizar revisão pós-incidente.

## Primeiros 30 minutos

- designar responsável do incidente;
- registar hora de deteção;
- isolar credenciais ou serviços afetados;
- não apagar logs;
- criar cópia protegida da evidência;
- ativar modo de manutenção quando necessário.

## Violação de dados pessoais

O registo deve incluir natureza, categorias e volume aproximado, pessoas afetadas,
consequências, medidas tomadas e decisão de notificação. A equipa jurídica/DPO deve
avaliar a obrigação de notificar a autoridade de controlo e os titulares.

## Contactos

Configurar `SECURITY_CONTACT_EMAIL` e `PRIVACY_CONTACT_EMAIL`. Não usar endereços
`example.invalid` em produção.

## Pós-incidente

- análise da causa;
- lista de ações com responsáveis e prazos;
- testes das correções;
- atualização de runbooks, ameaças e formação.

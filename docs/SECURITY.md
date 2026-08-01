# Segurança da fundação

- Argon2id para palavras-passe.
- Tokens opacos aleatórios; apenas HMAC-SHA-256 é armazenado.
- Cookies `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- Sessões revogáveis no servidor.
- RBAC no servidor.
- Rate limiting Redis.
- Consentimentos versionados.
- Audit log para registo, login e verificação.
- Feature flags públicas desligadas.
- Nenhum segredo no repositório.

Antes de produção: executar análise de dependências, testes de penetração, revisão RGPD, rotação de segredos e configuração TLS.


## Previsões

- autorização sempre no servidor;
- prazo calculado pelo relógio do servidor;
- transação serializável;
- revisão e auditoria de cada alteração;
- pergunta e outsiders bloqueados após a primeira submissão;
- endpoint de cron protegido por segredo;
- nenhuma previsão individual é publicada antes do fecho.

# Política de segurança

## Reporte

Configurar `SECURITY_CONTACT_EMAIL` com um endereço monitorizado. Não incluir
vulnerabilidades em canais públicos antes de existir correção.

## Controlos

- Argon2id;
- sessões opacas revogáveis;
- cookie `__Host-` em produção;
- RBAC no servidor;
- CSP com nonce;
- verificação de origem;
- rate limiting Redis;
- bloqueio temporário de login;
- IP em hash por defeito;
- logs com redaction;
- eventos de segurança;
- backups cifrados;
- pipeline de segurança.

## Antes do lançamento

- revisão de código independente;
- análise de dependências;
- teste de penetração;
- teste de restauro;
- revisão de configurações cloud;
- rotação de segredos;
- revisão jurídica e RGPD.

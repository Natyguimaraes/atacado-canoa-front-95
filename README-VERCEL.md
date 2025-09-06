# Configuração de Variáveis de Ambiente para Vercel

Configure as seguintes variáveis de ambiente no painel da Vercel:

## Supabase
```
SUPABASE_URL=https://lcualhkpezggwqqmlywc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Sua chave de service role do Supabase]
```

## Mercado Pago - Teste
```
MERCADO_PAGO_ACCESS_TOKEN_TEST=TEST-1800374272969427-081617-a7cd35d7787e1fa3e85c56b678d865c2-629972576
MERCADO_PAGO_PUBLIC_KEY_TEST=TEST-dfc36fd1-447c-4c28-ba97-740e7d046799
```

## Mercado Pago - Produção
```
MERCADO_PAGO_ACCESS_TOKEN_PROD=APP_USR-1800374272969427-081617-15ed03a36394b81f8bfe5fa12ebd9472-629972576
MERCADO_PAGO_PUBLIC_KEY_PROD=APP_USR-edb5a218-3bc1-496e-b3d9-24d33475a5b5
```

## Como configurar no Vercel

1. Acesse o painel da Vercel: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em "Settings" > "Environment Variables"
4. Adicione cada variável com os valores acima

## Detecção de Ambiente

O sistema detecta automaticamente o ambiente:
- **Produção**: Quando `NODE_ENV=production` e o domínio não contém "vercel.app"
- **Teste**: Todos os outros casos (incluindo preview deploys)

Para usar produção em um domínio customizado:
1. Conecte seu domínio no Vercel
2. O sistema automaticamente usará as chaves de produção

## Notas Importantes

- As chaves de teste já estão configuradas e funcionais
- Para produção real, você precisará das chaves reais do Mercado Pago
- A chave SUPABASE_SERVICE_ROLE_KEY pode ser encontrada em: 
  https://supabase.com/dashboard/project/lcualhkpezggwqqmlywc/settings/api
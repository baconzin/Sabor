# Sistema Sabor

Aplicação React/Vite conectada ao Supabase para gestão de clientes, ingredientes, estoque, fichas técnicas, pedidos, cozinha e financeiro.

## Configuração

1. Crie um projeto no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Crie um usuário em **Authentication > Users**.
4. Crie `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
```

5. Instale e execute:

```powershell
npm.cmd install
npm.cmd run dev
```

Acesse `http://localhost:3000`.

## Segurança

O frontend usa somente a chave publicável. As tabelas têm Row Level Security e permitem acesso apenas a usuários autenticados. Nunca coloque uma chave `secret` ou `service_role` no navegador.

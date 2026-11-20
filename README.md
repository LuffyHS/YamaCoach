# Yama Coach

Plataforma de coaching competitivo para VALORANT, feita com Next.js, TypeScript e Supabase.

## Configuração local

1. Instale as dependências com `npm install`.
2. Crie `.env.local` usando `.env.example` e preencha a URL e a chave pública do projeto Supabase. Não coloque a chave `service_role` em variáveis `NEXT_PUBLIC_*`.
3. No Supabase, execute primeiro `supabase/schema.sql` e depois `supabase/v1_production.sql` no SQL Editor. A segunda migração configura a segurança de perfis e pagamentos, o bucket privado de comprovantes e a função transacional de aprovação Pix.
4. Em **Authentication → URL Configuration**, configure `http://localhost:3000` como Site URL e adicione `http://localhost:3000/auth/callback` às URLs de redirecionamento permitidas. Em produção, use o domínio HTTPS publicado.
5. Inicie o app com `npm run dev` e abra `http://localhost:3000`.

O cadastro público cria somente perfis de aluno. Para criar o primeiro coach, altere o papel de uma conta diretamente no Supabase com acesso administrativo. Nunca aceite `role=coach` vindo do formulário público.

Se uma conta já existir em **Authentication → Users**, mas faltar em `public.profiles`, execute também `supabase/auth-profile-trigger.sql`. Esse script instala o trigger seguro e cria os perfis ausentes sem exigir um novo cadastro.

## Verificações

- `npm run lint`
- `npm run build`

Se aparecer `fetch failed`, confirme se a URL do Supabase está correta, se o projeto não está pausado e se o navegador consegue abrir o domínio do projeto. A aplicação não substitui uma indisponibilidade da rede ou do serviço Supabase.

## Aplicativo para PC

- Acesse `/download` no site publicado para instalar o Yama Coach como aplicativo no Windows pelo Chrome ou Edge.
- A pasta `desktop/` contém o início do aplicativo Windows independente, baseado no site e na mesma autenticação Supabase. Consulte `desktop/README.md` para rodar localmente ou empacotar um instalador depois de publicar e configurar o domínio HTTPS.
- O instalador desktop ainda não está publicado; não distribua builds apontando para `localhost`.

# Publicar no Render

## Criar o serviço

1. Envie a branch `main` para o GitHub.
2. No Render, selecione **New + → Blueprint** e conecte `LuffyHS/YamaCoach`.
3. O Render vai ler `render.yaml`. Mantenha o serviço como **Web Service**; o plano definido no arquivo é o gratuito para a primeira publicação.
4. Preencha as variáveis solicitadas no Render:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública/anon do Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave `service_role` do Supabase. Mantenha-a somente no Render, nunca no GitHub ou no navegador.
   - `PIX_KEY`: chave Pix que receberá os pagamentos.
5. Clique para criar o Blueprint e aguarde o build e o deploy. O endereço público é exibido na página do serviço.

O Blueprint configura `npm ci && npm run build` e `npm run start`. `NEXT_PUBLIC_APP_URL` é ligado automaticamente ao endereço público do serviço.

## Ajustar o Supabase

Depois que o Render mostrar o endereço, abra **Supabase → Authentication → URL Configuration** e configure:

- **Site URL**: endereço do serviço no Render, por exemplo `https://yama-coach.onrender.com`.
- **Redirect URLs**: adicione `https://yama-coach.onrender.com/auth/callback`.

Use o endereço real criado para o serviço, tanto no Site URL quanto no callback. Confirme também que as migrações SQL do projeto já foram executadas no Supabase.

Para liberar a nova sala pública e proteger a sinalização WebRTC, abra o SQL Editor do Supabase, cole o conteúdo de `supabase/public_class.sql` e execute uma vez. Depois, em **Project Settings → Realtime**, desative **Allow public access** para exigir canais privados e aplicar essas políticas de autorização. A migração pode ser executada novamente com segurança.

## Observações

- O Stripe ainda não está conectado a um fluxo ativo no código; o checkout implementado usa Pix.
- O plano gratuito do Render suspende o serviço depois de um período sem tráfego e pode demorar para responder na primeira visita. É adequado para validar a publicação; para uso comercial contínuo, considere um plano sempre ativo.
- Não publique `.env.local` nem copie a chave `service_role` para arquivos do repositório.

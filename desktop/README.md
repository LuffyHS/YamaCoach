# Yama Coach para Windows

O aplicativo desktop reaproveita o site e o Supabase já existentes. O processo Electron mantém a sessão em uma janela própria, sem expor APIs do Node ao conteúdo do site.

## Desenvolvimento local

1. Inicie o site Next.js na raiz do repositório (`npm run dev`).
2. Em `desktop/`, instale as dependências com `npm install`.
3. Rode `npm run dev` para abrir o aplicativo apontando para `http://localhost:3000`.

Defina `YAMA_APP_URL` no ambiente para apontar o app a outra URL durante o desenvolvimento.

## Instalador Windows

1. Publique o site com HTTPS.
2. Copie `.env.example` para `.env.production` e informe a URL real do site.
3. Instale as dependências nesta pasta e rode `npm run build:win`.
4. O instalador NSIS será gerado em `desktop/release/`.

Não distribuir o instalador até configurar a URL de produção e validar o fluxo de autenticação nesse domínio.

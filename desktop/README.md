# Yama Coach para Windows

O Yama Coach instala como um programa Windows (.exe), com atalho no Desktop e no menu Iniciar. A janela do programa conecta ao serviço seguro do Yama Coach para autenticação, dados e sincronização; é necessário estar conectado à internet.

## Desenvolvimento local

1. Inicie o site Next.js na raiz do repositório (`npm run dev`).
2. Em `desktop/`, instale as dependências com `npm install`.
3. Rode `npm run dev` para abrir o aplicativo apontando para `http://localhost:3000`.

Defina `YAMA_APP_URL` no ambiente para apontar o app a outra URL durante o desenvolvimento.

## Instalador Windows

O workflow `.github/workflows/windows-desktop.yml` compila o instalador para Windows e publica o `.exe` em uma release do GitHub ao atualizar a versão desktop.

Para compilar manualmente, crie `.env.production` baseado em `.env.example`, use o endereço HTTPS do serviço publicado em `YAMA_APP_URL`, instale as dependências em `desktop/` e rode `npm run build:win`. O instalador NSIS será gerado em `desktop/release/`.

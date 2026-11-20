# Yama Coach para Windows

O Yama Coach instala como um programa Windows (.exe), com atalho no Desktop e no menu Iniciar. A janela do programa conecta ao serviço seguro do Yama Coach para autenticação, dados e sincronização; é necessário estar conectado à internet.

## Desenvolvimento local

1. Inicie o site Next.js na raiz do repositório (`npm run dev`).
2. Em `desktop/`, instale as dependências com `npm install`.
3. Rode `npm run dev` para abrir o aplicativo apontando para `http://localhost:3000`.

Defina `YAMA_APP_URL` no ambiente para apontar o app a outra URL durante o desenvolvimento.

## Identidade visual do instalador

Os recursos do instalador ficam em `desktop/`:

- `assets/icon.ico` — ícone multi-resolução (16/32/48/64/128/256) do aplicativo, instalador e desinstalador.
- `assets/icon.png` (512×512) e `assets/icon-256.png` — ícones PNG de alta resolução.
- `build/installerHeader.bmp` — faixa superior exibida nas páginas do instalador (150×57).
- `build/installerSidebar.bmp` — painel lateral das páginas de boas-vindas e conclusão (164×314).
- `build/installer.nsh` — tema escuro, textos de marca e instalação por usuário.

Para recriar os bitmaps e o ícone após mudar o design, rode `npm run assets` em `desktop/`. Os arquivos gerados já são commitados; a CI usa esses binários no empacotamento.

## Instalador Windows

O fluxo do instalador é: boas-vindas → progresso → conclusão. A página de escolha “todos os usuários / apenas para mim” foi removida e a instalação é feita apenas para o usuário atual, sem pedido de administrador.

O workflow `.github/workflows/windows-desktop.yml` compila o instalador para Windows e publica o `.exe` em uma release do GitHub ao atualizar a versão desktop.

Para compilar manualmente, crie `.env.production` baseado em `.env.example`, use o endereço HTTPS do serviço publicado em `YAMA_APP_URL`, instale as dependências em `desktop/` e rode `npm run build:win`. O instalador NSIS será gerado em `desktop/release/`.

## Launcher

O `main.cjs` abre uma splash escura da marca enquanto o serviço carrega, usa `requestSingleInstanceLock` para evitar duas instâncias e define o App User Model ID para a barra de tarefas do Windows.

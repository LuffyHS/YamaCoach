; Yama Coach - tema do instalador (NSIS Modern UI 2)
; Incluido automaticamente pelo electron-builder (nsis.include).

!define MUI_BGCOLOR "07090B"
!define MUI_TEXTCOLOR "E7EDF0"
!define MUI_DISABLEDFGCOLOR "0D1115"
!define MUI_DISABLEDTEXTCOLOR "5F6E66"
!define MUI_LICENSEBGCOLOR "0D1115"

!define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Yama Coach"
!define MUI_WELCOMEPAGE_TEXT "Seu acompanhamento de VALORANT em um só lugar.$\r$\n$\r$\nO instalador vai preparar o aplicativo para você começar a evoluir."
!define MUI_FINISHPAGE_TITLE "Yama Coach instalado"
!define MUI_FINISHPAGE_TEXT "O aplicativo está pronto.$\r$\n$\r$\nAbra o Yama Coach e entre na sua conta para continuar."
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o Yama Coach agora"

; Instala apenas para o usuario atual: evita a pagina generica de escolha
; "todos os usuarios / apenas para mim" e nao exige elevacao de administrador.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

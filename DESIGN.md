# Yama Coach — Design System

## Identidade visual

### Paleta
- **Fundo base (dark):** `#07090B`
- **Superfície 1:** `#0D1115`
- **Superfície 2:** `#131920`
- **Borda sutil:** `rgba(255, 255, 255, 0.08)` (dark) / `#E2E8F0` (light)
- **Texto principal:** `#F8FAFC` (dark) / `#0F172A` (light)
- **Texto secundário:** `#94A3B8` (dark) / `#475569` (light)
- **Texto muted:** `#64748B` (dark) / `#94A3B8` (light)
- **Acento esmeralda:** `#10B981` (dark) / `#059669` (light)
- **Acento âmbar:** `#F59E0B` (dark) / `#D97706` (light)
- **Acento azul (VOD):** `#3B82F6`
- **Erro:** `#EF4444` (dark) / `#DC2626` (light)
- **Sucesso:** `#10B981` (dark) / `#059669` (light)

### Logotipo
- Monograma "YC" + estrela Radiante de 4 pontas
- "Y" em esmeralda `#10B981`, "C" em branco/grafite
- Estrela Radiante em âmbar `#F59E0B` com centro branco
- Wordmark: `YAMA / COACH` ou `YAMA / PLAYER`

### Tipografia
- Fonte principal: Arial, Helvetica, sans-serif
- Números de estatísticas: tabular-nums (font-variant-numeric)
- Títulos: letter-spacing negativo, font-weight 600-700
- Labels: uppercase, letter-spacing 0.08-0.18em, font-size 9-10px

### Espaçamento
- Generoso entre cartões e colunas (gap 8-14px)
- Padding interno de cartões: 12-16px
- Margens verticais entre seções: 12-24px
- Zero textos colados ou sobrepostos

### Componentes
- **Cartões:** border-radius 8-10px, border 1px solid var(--line), background #0D1115
- **Botões primários:** bg #10B981, text #04110c, border-radius 6px
- **Botões secundários:** bg #11191a, border var(--line), color #d3ded7
- **Inputs:** bg #090d0f, border var(--line), border-radius 6px, focus border #10b98180
- **Badges:** border-radius 3-6px, padding 2-5px, font-size 8-9px, uppercase

### Responsividade
- Grid responsivo: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Rolar vertical desbloqueada: `overflow-y-auto min-h-0 flex-1` em todas as páginas
- Sem necessidade de zoom para visualizar conteúdo

### Terminologia (português)
- "Player workspace" → "Área do Jogador"
- "Coach workspace" → "Área do Coach"
- "active" → "Ativo"
- "pending" → "Pendente"
- "reviewed" → "Revisada"
- Todas as labels, botões e mensagens em português brasileiro

### Desktop (Electron)
- Janela frameless: `frame: false`, `titleBarStyle: 'hidden'`, `backgroundColor: '#07090B'`
- Titlebar customizada: 36px, `-webkit-app-region: drag`, borda inferior `1px solid rgba(255,255,255,0.06)`
- Ícone multi-resolução (16/32/48/64/128/256) com logo YC + estrela Radiante
- Auto-updater silencioso com barra de progresso in-app
- NSIS oneClick: true, sem janela branca de reinstalação

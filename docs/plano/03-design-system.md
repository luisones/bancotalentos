# Design system — Liceu Jardim

Referência: `refs_visuais/Boletim Extracurricular.dc.html`

## Cores (CSS variables)

```css
--liceu-navy: #0B3053;
--liceu-navy-hover: #16456F;
--liceu-gold: #E3C39D;
--liceu-gold-text: #B98A4E;
--liceu-bg: #F1EFEA;
--liceu-card: #ffffff;
--liceu-border: #E2DDD4;
--liceu-text: #172026;
--liceu-muted: #6E7378;
--liceu-subtle: #9AA0A5;
```

## Tipografia

- Display/headings: **Archivo** (Google Fonts)
- Body: **Source Sans 3**
- Números em tabelas/KPIs: `font-variant-numeric: tabular-nums`

## Layout

- Header sticky 60px, navy, logo bege (`public/logo-liceu-bege.png`)
- Max-width conteúdo: 1180px
- Cards: border 1px `#E2DDD4`, radius 3px, padding generoso
- KPI strip: grid com separadores 1px
- Tabelas ranking: header navy, texto gold nos labels

## Componentes

shadcn/ui como primitivos com tema customizado — **não** usar zinc/slate default.

## UX operacional

- Filtros na URL (persistem ao navegar)
- Botão WhatsApp ao lado do telefone
- Avaliação cega: ocultar colegas até avaliar ou peek explícito
- Feedback de salvamento claro
- Navegação candidato anterior/próximo no perfil

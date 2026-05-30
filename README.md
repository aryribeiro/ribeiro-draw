# Ribeiro Draw!

**Whiteboard colaborativo para diagramas de arquitetura AWS com estilo hand-drawn.**

Fork independente do [Excalidraw](https://github.com/excalidraw/excalidraw), customizado e otimizado para criação de diagramas de infraestrutura cloud AWS. Totalmente self-hosted, sem dependências de serviços externos.

---

## Recursos

- **824 ícones oficiais AWS** inline (Architecture Service, Resource, Group e Category) — carregamento instantâneo, zero requests de rede
- **Painel lateral AWS** com busca em tempo real, filtros por categoria e tabs por tipo de ícone
- **Inserção via clique ou drag-and-drop** com nome do serviço exibido automaticamente como texto editável
- **Grid virtualizado** — renderiza apenas os ícones visíveis na viewport para máxima performance
- **100% independente** — nenhum dado enviado a terceiros (sem Sentry, Firebase, Google Fonts, Analytics)
- **Local-first** — salva automaticamente no browser (localStorage + IndexedDB)
- **Idioma padrão: Português Brasileiro** (100% traduzido) com suporte a 30+ idiomas
- **PWA** — funciona offline após primeiro acesso
- **Colaboração em tempo real** — via WebSocket (opcional, requer servidor próprio)
- **Exportação** — PNG, SVG, clipboard, arquivo `.excalidraw`
- **Canvas infinito** com zoom, pan, dark mode e estilo hand-drawn
- **Deploy na Vercel** — build estático otimizado

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, TypeScript 5.9 |
| Build | Vite 5, esbuild |
| Monorepo | Yarn Workspaces |
| Estilo | SCSS Modules |
| State | Jotai |
| Canvas | HTML5 Canvas (roughjs) |
| Deploy | Vercel (static) |
| Ícones | SVG data-URIs inline (gerados no build) |

---

## Estrutura do Projeto

```
ribeiro-draw/
├── excalidraw-app/          # App web principal (Ribeiro Draw!)
│   ├── components/          # Componentes customizados (AwsIconPanel, etc.)
│   ├── data/                # awsIcons.ts (manifest gerado com 824 ícones inline)
│   ├── collab/              # Módulo de colaboração WebSocket
│   └── index.html           # Entry point
├── packages/
│   ├── excalidraw/          # Core library (canvas, tools, UI)
│   ├── common/              # Constantes e utilitários compartilhados
│   ├── element/             # Tipos e lógica de elementos
│   ├── math/                # Geometria e cálculos
│   └── utils/               # Utilitários de exportação
├── public/
│   └── icons/               # 824 SVGs originais AWS (4 conjuntos)
├── scripts/
│   └── generate-aws-manifest.mjs  # Gerador de manifest com data-URIs inline
├── .env.production          # Config de produção (tudo local, zero terceiros)
├── vercel.json              # Configuração de deploy Vercel
└── package.json             # Monorepo root
```

---

## Conjuntos de Ícones AWS

| Conjunto | Quantidade | Descrição |
|----------|-----------|-----------|
| Architecture Service | 309 | Serviços AWS (EC2, S3, Lambda, etc.) |
| Resource | 477 | Recursos específicos (instâncias, buckets, etc.) |
| Category | 25 | Ícones de categoria (Compute, Database, etc.) |
| Architecture Group | 13 | Agrupadores (VPC, Region, Subnet, etc.) |
| **Total** | **824** | |

Fonte: [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) — versão Julho 2025.

---

## Desenvolvimento Local

### Pré-requisitos

- Node.js >= 18
- Yarn 1.x

### Instalação

```bash
git clone https://github.com/aryribeiro/ribeiro-draw.git
cd ribeiro-draw
yarn install
```

### Gerar manifest de ícones

```bash
node scripts/generate-aws-manifest.mjs
```

Isso escaneia `public/icons/`, converte cada SVG em data-URI inline e gera `excalidraw-app/data/awsIcons.ts` (~2.6 MB raw, ~450 KB gzip).

### Iniciar servidor de desenvolvimento

```bash
yarn start
```

Abre em `http://localhost:3001`

### Build de produção

```bash
yarn build
```

Output em `excalidraw-app/build/`

---

## Deploy na Vercel

O projeto está configurado para deploy direto na Vercel:

```json
{
  "outputDirectory": "excalidraw-app/build",
  "installCommand": "yarn install"
}
```

Basta conectar o repositório GitHub na Vercel. Não é necessário configurar variáveis de ambiente — tudo já está no `.env.production`.

---

## Guia Rápido de Uso

### Inserir ícones AWS

1. O painel lateral AWS abre automaticamente ao iniciar
2. Use a **busca** para encontrar um serviço (ex.: "Lambda", "S3", "EC2")
3. Navegue pelas **tabs**: Services, Resources, Groups, Categories
4. Filtre por **categoria** usando os chips (Analytics, Compute, Database...)
5. **Clique** no ícone para inserir no centro da tela, ou **arraste** para posicionar onde quiser
6. O nome do serviço aparece automaticamente como texto editável abaixo do ícone

### Navegar no canvas

- **Mover a tela**: segure `Scroll Wheel` ou `Espaço` + arrastar, ou use a ferramenta Mão
- **Zoom**: `Ctrl + Scroll` ou os botões -/+ no canto inferior esquerdo
- **Selecionar**: clique no elemento ou arraste uma área de seleção

### Ferramentas principais

| Atalho | Ferramenta |
|--------|-----------|
| `1` | Seleção |
| `2` | Retângulo |
| `3` | Losango |
| `4` | Círculo |
| `5` | Seta |
| `6` | Linha |
| `7` | Lápis (desenho livre) |
| `8` | Texto |
| `9` | Imagem |
| `0` | Borracha |

### Editar elementos

- **Mover**: arraste o elemento selecionado
- **Redimensionar**: arraste os handles nos cantos/bordas
- **Rotacionar**: arraste o handle circular acima do elemento
- **Editar texto**: clique duplo no texto
- **Duplicar**: `Ctrl + D`
- **Deletar**: `Delete` ou `Backspace`
- **Copiar estilo**: `Ctrl + Alt + C` / **Colar estilo**: `Ctrl + Alt + V`

### Organização

- **Agrupar**: selecione múltiplos elementos + `Ctrl + G`
- **Desagrupar**: `Ctrl + Shift + G`
- **Trazer para frente**: `Ctrl + ]`
- **Enviar para trás**: `Ctrl + [`
- **Alinhar**: selecione elementos e use o menu de alinhamento

### Salvar e exportar

- **Salva automaticamente** no browser (localStorage)
- **Exportar como imagem**: `Ctrl + Shift + E` (PNG ou SVG)
- **Salvar arquivo**: `Ctrl + S` (formato `.excalidraw`)
- **Abrir arquivo**: `Ctrl + O`
- **Copiar para clipboard**: `Ctrl + Shift + C` (como PNG)

### Dicas

- Segure `Shift` ao desenhar para manter proporções
- Segure `Alt` ao redimensionar para escalar do centro
- Use `Ctrl + Z` / `Ctrl + Y` para desfazer/refazer
- Troque o tema (claro/escuro) no menu hamburger
- O idioma pode ser alterado no menu hamburger > seletor de idioma

---

## Autor

**Ary Ribeiro**

- GitHub: [@aryribeiro](https://github.com/aryribeiro)
- Email: [aryribeiro@gmail.com](mailto:aryribeiro@gmail.com)
- LinkedIn: [linkedin.com/in/aryribeiro](https://www.linkedin.com/in/aryribeiro)

---

## Licença

MIT — veja [LICENSE](./LICENSE)

Baseado no [Excalidraw](https://github.com/excalidraw/excalidraw) (MIT License).

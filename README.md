# Planster Editor App

A rich-text document editor built with **Next.js 15**, **Tiptap**, **Tailwind CSS**, and **shadcn/ui** component library.

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 15](https://nextjs.org) | React framework (App Router) |
| [React 19](https://react.dev) | UI library |
| [Tiptap](https://tiptap.dev) | Rich-text editor engine |
| [Tailwind CSS v3](https://tailwindcss.com) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com) | Accessible UI components (Radix UI) |
| [TypeScript](https://www.typescriptlang.org) | Static typing |

## Prerequisites

- **Node.js** v18 or later — check with `node -v`
- **npm** v9 or later — check with `npm -v`

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd planster-editor-app
```

### 2. Install dependencies

```bash
npm install
```

> **Note for external drives / NTFS file systems:** If the project lives on an NTFS-formatted drive and you get an `EACCES` permission error, run the following once to fix ownership:
> ```bash
> sudo chown -R $USER:$USER /path/to/planster-editor-app
> ```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The page auto-reloads when you edit source files.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        # Home / landing page
│   ├── layout.tsx                      # Root layout
│   ├── globals.css                     # Global styles
│   └── documents/
│       ├── page.tsx                    # Documents list page
│       └── [documentId]/
│           ├── page.tsx                # Individual document page
│           └── editor.tsx              # Tiptap editor component
├── components/
│   └── ui/                             # shadcn/ui components
├── hooks/                              # Custom React hooks
└── lib/
    └── utils.ts                        # Utility helpers (cn, etc.)
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server at `localhost:3000` |
| `npm run build` | Create an optimised production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Troubleshooting

### `EACCES` / permission denied during `npm install`
The project folder may be owned by root (common on NTFS drives). Fix it with:
```bash
sudo chown -R $USER:$USER .
```

### `ENOTEMPTY` error during `npm install`
A previous install was interrupted, leaving a corrupt `node_modules`. Clean and retry:
```bash
sudo rm -rf node_modules
npm install
```

### Peer dependency warnings (`@floating-ui/react-dom`)
These are informational warnings from `@radix-ui/react-popper` and can be safely ignored — the packages work correctly with React 19.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tiptap Documentation](https://tiptap.dev/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deployment

The easiest way to deploy is via [Vercel](https://vercel.com/new):

1. Push your code to a GitHub/GitLab/Bitbucket repository.
2. Import the project on Vercel.
3. Vercel auto-detects Next.js and configures the build for you.

See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for other options.

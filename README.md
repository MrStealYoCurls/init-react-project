# React Project Setup Script

I got tired of setting up the same React + TypeScript + Tailwind + shadcn/ui stack every time I start a new project. This script automates the whole thing so I can go from zero to a working setup in under a minute.

## What this does

Creates a new React project with:
- React 18 + TypeScript
- Vite for dev server
- Tailwind CSS v4 for styling
- shadcn/ui components with dark mode support
- Path aliases configured (@/ maps to src/)
- Random emoji favicon (makes it easy to spot in browser tabs)
- Clean starter app with theme toggle

## Setup on a new device

To install globally from GitHub:
```bash
npm install -g git+https://github.com/MrStealYoCurls/init-react-project.git
```

## Usage

Then from any directory, create a new project with:

```bash
setup-react <app-name>
```

The script will:
1. Create the project directory
2. Set up all the dependencies
3. Configure everything
4. Copy the "cd app-name && npm run dev" command to clipboard

Then I just paste and run to start developing.

## What gets installed

### Core packages:
- `react` + `@types/react`
- `typescript`
- `vite` + `@vitejs/plugin-react`
- `tailwindcss` + `@tailwindcss/vite`
- `lucide-react` (for icons)

### shadcn/ui components added by default:
- `button`
- `card`
- `input`
- `label`
- `dropdown-menu`

### Dev dependencies:
- `@types/node` (for path resolution in vite config)

## File structure after setup

```
my-project/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn components go here
│   │   ├── theme-provider.tsx
│   │   └── mode-toggle.tsx
│   ├── lib/                 # utils (shadcn creates this)
│   ├── App.tsx              # main app with theme provider
│   ├── main.tsx
│   └── index.css            # just tailwind imports
├── index.html               # updated title + emoji favicon
├── vite.config.ts           # path aliases configured
├── tsconfig.json            # base config with path aliases
├── tsconfig.app.json        # updated with path aliases
└── README.md                # project-specific readme
```

## Adding more shadcn components later

```bash
# See what's available
npx shadcn@latest view

# Add what you need
npx shadcn@latest add dialog toast tabs
```

## Troubleshooting

### Script fails on npm create vite
- Make sure Node.js is installed (18+ recommended)
- Check that npm is working: `npm --version`

### Permission denied on macOS/Linux
- Make sure the script is executable: `chmod +x ~/code/tools/react-setup/setup-react.js`
- Or always use `node` explicitly in the alias

### Clipboard not working
- The script tries to copy the next command to clipboard
- If it fails, it just shows the command to run manually
- On Linux, make sure you have `xclip` or `xsel` installed
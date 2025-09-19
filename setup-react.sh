#!/bin/bash

# React + TypeScript + Vite setup script
# Because I got tired of doing this manually every time
# Run with: ./setup-react.sh project-name

set -e

# Colors for terminal output (makes it easier to spot issues)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to copy to clipboard (cross-platform)
copy_to_clipboard() {
    local text="$1"
    if command -v pbcopy >/dev/null 2>&1; then
        # macOS
        echo "$text" | pbcopy
    elif command -v xclip >/dev/null 2>&1; then
        # Linux with xclip
        echo "$text" | xclip -selection clipboard
    elif command -v xsel >/dev/null 2>&1; then
        # Linux with xsel
        echo "$text" | xsel --clipboard --input
    elif [[ -n "$WSL_DISTRO_NAME" ]] && command -v clip.exe >/dev/null 2>&1; then
        # WSL
        echo "$text" | clip.exe
    else
        # Fallback - just show the command
        return 1
    fi
    return 0
}

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }


# Check if project name is provided
if [ $# -eq 0 ]; then
    print_error "Need a project name"
    echo "Usage: $0 <project-name>"
    exit 1
fi

PROJECT_NAME=$1

if [ -d "$PROJECT_NAME" ]; then
    print_error "Directory '$PROJECT_NAME' already exists"
    exit 1
fi


print_status "Setting up React TypeScript project: $PROJECT_NAME"

# Create the Vite project
print_status "Creating Vite project..."
npm create vite@latest "$PROJECT_NAME" -- --template react-ts
cd "$PROJECT_NAME"

# Install everything we need in one go
print_status "Installing dependencies..."
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node
npm install lucide-react  # for icons

# Setup Tailwind CSS
print_status "Setting up Tailwind CSS..."
cat > src/index.css << 'EOF'
@import "tailwindcss";
EOF

# Fix TypeScript config for path aliases
print_status "Configuring TypeScript..."
cat > tsconfig.json << 'EOF'
{
  "files": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.node.json"
    }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
EOF

# Update tsconfig.app.json (strip comments first because JSON doesn't like them)
node -e "
const fs = require('fs');
let content = fs.readFileSync('tsconfig.app.json', 'utf8');
content = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
content = content.replace(/,(\s*[}\]])/g, '\$1');
const config = JSON.parse(content);
if (!config.compilerOptions) config.compilerOptions = {};
config.compilerOptions.baseUrl = '.';
config.compilerOptions.paths = { '@/*': ['./src/*'] };
fs.writeFileSync('tsconfig.app.json', JSON.stringify(config, null, 2));
"

# Setup Vite config
print_status "Configuring Vite..."
cat > vite.config.ts << 'EOF'
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
EOF

npm install

# Initialize shadcn/ui with defaults
print_status "Setting up shadcn/ui..."
npx shadcn@latest init --yes --base-color neutral

# Add the essential shadcn components
print_status "Adding essential shadcn/ui components..."
npx shadcn@latest add button card input label dropdown-menu --yes

# Create the theme provider for dark mode support
print_status "Adding dark mode support..."
mkdir -p src/components
cat > src/components/theme-provider.tsx << 'EOF'
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
EOF

# Create the mode toggle component
cat > src/components/mode-toggle.tsx << 'EOF'
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
EOF

# Generate a random emoji for this project (makes it easier to distinguish in browser tabs)
EMOJIS=("👻", "☠️", "👽", "👾", "🤖", "🥷", "👑", "🐶", "🐭", "🦊", "🐸", "🪿", "🦆", "🦅", "🦉", "🦄", "🦋", "🐞", "🐢", "🦖", "🐙", "🦐", "🦞", "🐠", "🐬", "🦜", "🦔", "🐲", "🌵", "🌲", "🍀", "🌺", "🌸", "🌼", "🌻", "☀️", "🌎", "🌖", "✨", "💥", "🔥", "☃️", "☔️", "🍎", "🍌", "🍉", "🍇", "🍓", "🫐", "🥑", "🌽", "🌶️", "🥕", "🍕", "🍩", "⚽️", "🏀", "🏈", "⚾️", "🥎", "🎾", "🏐", "⛳️", "🏵️", "🫟", "🎨", "🧩", "🚀", "🚁", "⛵️", "🛸", "🏖️", "🏝️", "🏜️", "🌋", "🎁", "🎊", "🎉", "🪩", "📚")
RANDOM_EMOJI=${EMOJIS[$RANDOM % ${#EMOJIS[@]}]}

print_status "Setting page title and favicon..."
# Update the HTML title and add emoji favicon
sed -i '' "s/<title>Vite + React + TS<\/title>/<title>$PROJECT_NAME<\/title>/" index.html
# Add emoji as favicon using data URL
sed -i '' "s/<link rel=\"icon\" type=\"image\/svg+xml\" href=\"\/vite.svg\" \/>/<link rel=\"icon\" href=\"data:image\/svg+xml,<svg xmlns=%22http:\/\/www.w3.org\/2000\/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>$RANDOM_EMOJI<\/text><\/svg>\">/" index.html

# Create starter app
print_status "Creating starter app..."
cat > src/App.tsx << 'EOF'
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";

function AppContent() {
  return (
    <div>
      <ModeToggle />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
EOF

# Clean up the default CSS
rm src/App.css
rm public/vite.svg
rm src/assets/react.svg

# Create a personal README
print_status "Writing README..."
cat > README.md << EOF
# $RANDOM_EMOJI $PROJECT_NAME

My standard React setup to get started quickly without the usual config headaches.

## What's in here

- **React 18** with TypeScript (because types save time)
- **Vite** for dev server (way faster than webpack)
- **Tailwind CSS v4** for styling
- **shadcn/ui** components (beautiful and accessible)
- **Dark mode** with system preference detection
- **Path aliases** so imports look clean (\`@/\` maps to \`src/\`)

## Getting started

\`\`\`bash
npm run dev
\`\`\`

Opens at http://localhost:5173

## Adding more components

\`\`\`bash
# See what's available
npx shadcn@latest view

# Add what you need
npx shadcn@latest add dialog toast tabs
\`\`\`

## Project structure

\`\`\`
src/
├── components/
│   ├── ui/              # shadcn components
│   ├── theme-provider.tsx
│   └── mode-toggle.tsx
├── lib/                 # utils (shadcn adds this)
├── App.tsx
└── main.tsx
\`\`\`

## Docs

- [React Documentation](https://reactjs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
EOF

print_success "All done! $RANDOM_EMOJI"
print_success ""
NEXT_COMMAND="cd $PROJECT_NAME && npm run dev"
if copy_to_clipboard "$NEXT_COMMAND"; then
    print_success "Next command copied to clipboard! Just paste and run:"
    print_success "  $NEXT_COMMAND"
else
    print_success "Next steps:"
    print_success "  cd $PROJECT_NAME"
    print_success "  npm run dev"
fi
print_success ""

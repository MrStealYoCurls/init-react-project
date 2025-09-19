#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Cross-platform clipboard function
function copyToClipboard(text) {
  try {
    const platform = os.platform();
    let command;
    
    switch (platform) {
      case 'darwin': // macOS
        command = `echo "${text}" | pbcopy`;
        break;
      case 'win32': // Windows
        command = `echo ${text} | clip`;
        break;
      case 'linux': // Linux
        // Try different clipboard tools
        if (commandExists('xclip')) {
          command = `echo "${text}" | xclip -selection clipboard`;
        } else if (commandExists('xsel')) {
          command = `echo "${text}" | xsel --clipboard --input`;
        } else {
          return false;
        }
        break;
      default:
        return false;
    }
    
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Logging functions
function printStatus(message) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function printSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function printError(message) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

// Main setup function
function setupReactProject() {
  // Check if project name is provided
  if (process.argv.length < 3) {
    printError('Need a project name');
    console.log(`Usage: node ${path.basename(__filename)} <project-name>`);
    process.exit(1);
  }

  const projectName = process.argv[2];

  // Check if directory already exists
  if (fs.existsSync(projectName)) {
    printError(`Directory '${projectName}' already exists`);
    process.exit(1);
  }

  printStatus(`Setting up React TypeScript project: ${projectName}`);

  try {
    // Create the Vite project
    printStatus('Creating Vite project...');
    execSync(`npm create vite@latest "${projectName}" -- --template react-ts`, { stdio: 'inherit' });
    
    // Change to project directory
    process.chdir(projectName);

    // Install dependencies
    printStatus('Installing dependencies...');
    execSync('npm install tailwindcss @tailwindcss/vite', { stdio: 'inherit' });
    execSync('npm install -D @types/node', { stdio: 'inherit' });
    execSync('npm install lucide-react', { stdio: 'inherit' });

    // Setup Tailwind CSS
    printStatus('Setting up Tailwind CSS...');
    const tailwindCSS = '@import "tailwindcss";';
    fs.writeFileSync('src/index.css', tailwindCSS);

    // Fix TypeScript config for path aliases
    printStatus('Configuring TypeScript...');
    const tsConfig = {
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
    };
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));

    // Update tsconfig.app.json
    let appConfigContent = fs.readFileSync('tsconfig.app.json', 'utf8');
    // Remove comments
    appConfigContent = appConfigContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    appConfigContent = appConfigContent.replace(/,(s*[}\]])/g, '$1');
    
    const appConfig = JSON.parse(appConfigContent);
    if (!appConfig.compilerOptions) appConfig.compilerOptions = {};
    appConfig.compilerOptions.baseUrl = '.';
    appConfig.compilerOptions.paths = { '@/*': ['./src/*'] };
    fs.writeFileSync('tsconfig.app.json', JSON.stringify(appConfig, null, 2));

    // Setup Vite config
    printStatus('Configuring Vite...');
    const viteConfig = `import path from "path"
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
})`;
    fs.writeFileSync('vite.config.ts', viteConfig);

    execSync('npm install', { stdio: 'inherit' });

    // Initialize shadcn/ui
    printStatus('Setting up shadcn/ui...');
    execSync('npx shadcn@latest init --yes --base-color neutral', { stdio: 'inherit' });

    // Add essential shadcn components
    printStatus('Adding essential shadcn/ui components...');
    execSync('npx shadcn@latest add button card input label dropdown-menu --yes', { stdio: 'inherit' });

    // Create theme provider
    printStatus('Adding dark mode support...');
    if (!fs.existsSync('src/components')) {
      fs.mkdirSync('src/components', { recursive: true });
    }

    const themeProvider = `import { createContext, useContext, useEffect, useState } from "react"

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
}`;
    fs.writeFileSync('src/components/theme-provider.tsx', themeProvider);

    // Create mode toggle component
    const modeToggle = `import { Moon, Sun } from "lucide-react"
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
}`;
    fs.writeFileSync('src/components/mode-toggle.tsx', modeToggle);

    // Generate random emoji
    const emojis = ["👻", "☠️", "👽", "👾", "🤖", "🥷", "👑", "🐶", "🐭", "🦊", "🐸", "🪿", "🦆", "🦅", "🦉", "🦄", "🦋", "🐞", "🐢", "🦖", "🐙", "🦐", "🦞", "🐠", "🐬", "🦜", "🦔", "🐲", "🌵", "🌲", "🍀", "🌺", "🌸", "🌼", "🌻", "☀️", "🌎", "🌖", "✨", "💥", "🔥", "☃️", "☔️", "🍎", "🍌", "🍉", "🍇", "🍓", "🫐", "🥑", "🌽", "🌶️", "🥕", "🍕", "🍩", "⚽️", "🏀", "🏈", "⚾️", "🥎", "🎾", "🏐", "⛳️", "🏵️", "🫟", "🎨", "🧩", "🚀", "🚁", "⛵️", "🛸", "🏖️", "🏝️", "🏜️", "🌋", "🎁", "🎊", "🎉", "🪩", "📚"];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    // Update HTML title and favicon
    printStatus('Setting page title and favicon...');
    let htmlContent = fs.readFileSync('index.html', 'utf8');
    htmlContent = htmlContent.replace(/<title>Vite \+ React \+ TS<\/title>/, `<title>${projectName}</title>`);
    htmlContent = htmlContent.replace(
      /<link rel="icon" type="image\/svg\+xml" href="\/vite\.svg" \/>/,
      `<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${randomEmoji}</text></svg>">`
    );
    fs.writeFileSync('index.html', htmlContent);

    // Create starter app
    printStatus('Creating starter app...');
    const appComponent = `import { ModeToggle } from "@/components/mode-toggle";
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

export default App;`;
    fs.writeFileSync('src/App.tsx', appComponent);

    // Clean up default files
    if (fs.existsSync('src/App.css')) fs.unlinkSync('src/App.css');
    if (fs.existsSync('public/vite.svg')) fs.unlinkSync('public/vite.svg');
    if (fs.existsSync('src/assets/react.svg')) fs.unlinkSync('src/assets/react.svg');

    // Create README
    printStatus('Writing README...');
    const readme = `# ${randomEmoji} ${projectName}

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
- [shadcn/ui Documentation](https://ui.shadcn.com/)`;
    fs.writeFileSync('README.md', readme);

    printSuccess(`All done! ${randomEmoji}`);
    printSuccess('');
    
    const nextCommand = `cd ${projectName} && npm run dev`;
    if (copyToClipboard(nextCommand)) {
      printSuccess('Next command copied to clipboard! Just paste and run:');
      printSuccess(`  ${nextCommand}`);
    } else {
      printSuccess('Next steps:');
      printSuccess(`  cd ${projectName}`);
      printSuccess('  npm run dev');
    }
    printSuccess('');

  } catch (error) {
    printError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the setup
setupReactProject();
`npm install tailwindcss @tailwindcss/vite`
`npm install -D postcss autoprefixer`

Add in `src/index.css` 

```css
@import "tailwindcss";
```

Add in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

`npm install -D @types/node`

Add in `vite.config.ts`:

```ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

Run cli: `npx shadcn@latest init`

Add components:
```
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add badge
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
```
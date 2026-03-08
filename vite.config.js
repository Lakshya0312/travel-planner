import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001", // for local dev
    },
  },
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || "")
  }
});
```

**4.** In Vercel, add an **Environment Variable**:
```
VITE_API_URL=https://your-railway-url.up.railway.app
```

**5.** Click **Deploy** — Vercel gives you a live URL like:
```
https://travel-planner.vercel.app
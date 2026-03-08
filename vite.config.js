import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

---

**Push to GitHub from PyCharm:**

**Git menu → Commit** → type `"Add production API URL"` → click **Commit and Push**

---

## Step 3 — Deploy Frontend to Vercel

**1.** Go to **vercel.com** → **"Sign up with GitHub"**

**2.** Click **"Add New Project"** → Import `travel-planner`

**3.** Before clicking Deploy, find **"Environment Variables"** and add:
```
VITE_API_URL = https://travel-planner-production-a6fa.up.railway.app
```
(paste your Railway URL from the previous step)

**4.** Click **"Deploy"** → wait ~1 minute

**5.** Vercel gives you a live URL like:
```
https://travel-planner.vercel.app
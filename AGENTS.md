# Project rules

- Keep Deno npm dependency resolution in automatic mode in the root `deno.json`, separate from frontend package versions, so Edge Functions with pinned npm imports can deploy without relying on Vite's installed versions.
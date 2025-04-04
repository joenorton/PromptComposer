# ContextSmash

⚡ a lean, local-first prompt crafting tool with symbolic file aliasing and real-time preview. built for hackers, prompt engineers, and LLM nerds who want clarity before compute.

## 🔥 Features

- 🗃 drag & drop file upload with symbolic aliases (e.g. `{{vault}}`)
- ✍️ real-time prompt editing with instant alias resolution
- 📊 character + token count estimation (1 token ≈ 4 chars)
- 💾 session persistence via localStorage
- 📋 copy or download resolved prompt in one click

## 🧪 Try It Out

**GitHub Pages:** 
Try it out here:  https://joenorton.github.io/contextsmash/

— or host it locally:

```bash
git clone https://github.com/joenorton/contextsmash.git
cd contextsmash
python -m http.server 8000
```

Then open: [http://localhost:8000](http://localhost:8000)

## 🧠 Tech Stack

- [HTMX](https://htmx.org/) — server-enhanced UX, minimal JS
- [Alpine.js](https://alpinejs.dev/) — reactive UI, no bloat
- Vanilla HTML/CSS/JS — no build step, just open and go

## 📁 Structure

```
index.html      → main UI
app.js          → logic & state (Alpine.js)
styles.css      → minimal, clean styling
```

## 🚀 Deployment

To deploy via GitHub Pages:
1. Push code to `main`
2. In repo settings → Pages → select root of `main` as source
3. Visit: `https://yourusername.github.io/contextsmash/`

## 📜 License

MIT — do whatever, just don’t claim you wrote it.  
(c) [@joenorton](https://twitter.com/joenorton)

# ContextSmash

⚡ a lean, local-first prompt crafting tool with symbolic file aliasing and real-time preview. built for hackers, prompt engineers, and LLM nerds who want clarity before compute.

## 🔥 Features

- 🗃 drag & drop file upload with symbolic aliases (e.g. `{{vault}}`)
- 🔣 manual alias creation for custom symbols and reusable text snippets
- 🖊️ inline alias editing for both files and manual aliases
- ✨ intelligent highlighting with color-coded valid, invalid, and repeated aliases
- ✍️ real-time prompt editing with instant alias resolution and preview
- 🔍 error detection for invalid aliases with visual feedback
- 📊 character + token count estimation (1 token ≈ 4 chars)
- 💾 workflow save/load to preserve your entire workspace setup
- 🌙 dark mode support for comfortable night-time work
- 🔄 session persistence via localStorage
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

- [Alpine.js](https://alpinejs.dev/) — reactive UI, no bloat
- Vanilla HTML/CSS/JS — no build step, just open and go

## 📁 Structure

```
index.html      → main UI
app.js          → logic & state (Alpine.js)
styles.css      → minimal, clean styling
```

## 📜 License

MIT — do whatever, just don't claim you wrote it.  
(c) [@joenorton](https://twitter.com/joenorton)

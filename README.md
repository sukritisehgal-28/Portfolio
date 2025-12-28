# Sukriti Sehgal — Portfolio Website

Single-page portfolio site for Sukriti Sehgal, Data Scientist and AI Engineer, featuring API-powered projects, responsive design, and motion-rich storytelling.

## Getting Started Locally

1. Clone or download this repository.
2. Serve the site with any static HTTP server to enable fetch requests:
   - Python: `python3 -m http.server`
   - Node: `npx serve`
3. Visit `http://localhost:8000` (or the port your server prints) to explore the site.

> Opening `index.html` directly from the filesystem disables the GitHub API call because of browser CORS restrictions.

## Deploying

### GitHub Pages
1. Commit and push the project to a public GitHub repository.
2. In repository settings, enable **GitHub Pages** and pick the `main` branch `/root` as the source.
3. Update canonical URLs in `index.html`, `sitemap.xml`, and `robots.txt` if the published URL differs.
4. After the site goes live, submit `sitemap.xml` to Google Search Console for indexing.

### Netlify (or similar static hosts)
1. Drag and drop the folder onto https://app.netlify.com/drop or connect the GitHub repo.
2. Set the publish directory to the repository root (contains `index.html`).
3. Add a custom domain and configure DNS if desired.
4. Redeploy whenever you update the site—Netlify handles cache busting automatically.

### Custom Domains
- Map your domain to GitHub Pages or Netlify per their documentation.
- Add the canonical URL for the custom domain to `index.html`, `sitemap.xml`, and `robots.txt`.

## Updating GitHub Projects Section

Projects load client-side from the GitHub API:
- The grid prioritizes repositories containing ML/data keywords in their name, description, or topics.
- The three flagship projects (Wikipedia Clickstream Analysis, Bias Detection in Fandango Ratings, AI Fitness Coach) are pinned with detailed copy and upgraded with live repo links when discovered via the API.
- To ensure accurate tagging, add repository topics (e.g., `spark`, `pytorch`, `streamlit`) in GitHub’s repository settings.
- If you update your GitHub username, change the API endpoint in `app.js` and URLs across the project.

## Contact Form

- The site ships with a Formspree placeholder endpoint (`FORMSPREE_ENDPOINT` in `app.js`).
- Replace `your-form-id` with the ID from your Formspree dashboard to activate submissions.
- Toast notifications and inline status messaging provide user feedback for success or failure.

## Performance & Accessibility

- Responsive layout (mobile-first), keyboard-friendly navigation, accessible color contrast (≥ 4.5:1), and focus rings across interactive elements.
- Motion uses transform/opacity for GPU-friendly animations and respects `prefers-reduced-motion`.
- Assets are lightweight: inline SVG icons, lazy typewriter animation, and CSS-powered effects.
- SEO metadata, JSON-LD schema (`structured-data.json`), `sitemap.xml`, and `robots.txt` are included.

## Maintenance Checklist

- Update resume PDF in `assets/Sukriti_Resume.pdf` with the latest version.
- Swap in final hero artwork or photography by replacing `assets/hero-bg.svg`.
- Re-run Lighthouse after major visual or content updates to keep scores ≥ 90 across all categories.

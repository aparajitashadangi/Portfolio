# Aparajita Shadangi — Portfolio

A one-page portfolio for Aparajita Shadangi, a banking operations professional seeking an Operations Analyst role in investment banking operations.

It is plain HTML, CSS and JavaScript. There is no build step and nothing to install.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publish on GitHub Pages

The code lives at https://github.com/aparajitashadangi/Portfolio.

1. On GitHub, open **Settings → Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then save.
2. After a minute or two the site is live at https://aparajitashadangi.github.io/Portfolio/.

To publish later changes, commit them and push to `main`; Pages redeploys on its own.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The page and all résumé content |
| `styles.css` | Palette, type and layout |
| `script.js` | Animations, tabs, calculators, contact form |
| `assets/` | Photo crops, link-preview image, favicon |
| `Aparajita_Shadangi_Resume_Operations_Analyst.pdf` | The résumé the download buttons link to |
| `404.html` | Shown by GitHub Pages for unknown paths |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Updating content

All text lives in `index.html`, grouped by section (About, Skills, Experience, Internships, Education, Projects, Certifications, Contact). Edit the text there and push again.

To replace the résumé, overwrite the PDF with a file of the same name.

## Link previews

`og:image` in `index.html` uses the full GitHub Pages address, so LinkedIn and WhatsApp can show the preview image. If the site moves to another address, update that URL.

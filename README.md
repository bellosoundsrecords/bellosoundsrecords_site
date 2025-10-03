# BelloSounds Records — Static Site (Nervous-inspired)

## Run locally
Use a local server to avoid module/CORS issues:
```bash
cd bellosounds-site
python3 -m http.server 8080
# then open http://localhost:8080/
```

## Deploy (GitHub Pages)
- Push this folder as a repo.
- Pages → Source: GitHub Actions.
- The provided workflow at `.github/workflows/deploy.yml` deploys on push to `main`.

## Content workflow
- Edit JS modules under `/content/`.
- Add cover images under `/images/...` (or keep the placeholder).

## Notes
- Images fallback to `./images/placeholder.svg` if missing.
- Release pages auto-inject JSON-LD for SEO.

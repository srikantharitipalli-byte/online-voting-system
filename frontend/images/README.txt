This project ships without binary image assets so the codebase stays
lightweight and framework-free.

- Place your logo at `frontend/images/logo.png`
- Place a homepage banner at `frontend/images/banner.jpg`
- Place candidate photos inside `frontend/images/candidates/`
  (e.g. `candidate1.png`, matching the `symbol` column in the `candidates` table)

The UI currently renders candidate avatars as initials (see `vote.js`,
function `initials()`), so the app works fully without any images. Swap in
real files here and update the relevant `<img>`/CSS references if you'd
like to use actual photos/logos instead.

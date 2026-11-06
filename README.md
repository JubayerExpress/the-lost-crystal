# The Lost Crystal: NEON WILDS

Playable HTML5 canvas action-adventure. No installation, build command, external dependencies, or API keys.

## Play locally
Open `index.html` in Chrome, Firefox, Edge, or Safari. Press **Start Adventure**.

## Controls
- Move: Arrow keys / WASD, or touch direction buttons
- Sword: Space / J or touch Slash
- Dash: Shift / K or touch Dash
- Pause: P. Restart button resets the game.

## Upload to GitHub
1. Create a new GitHub repository.
2. Extract the ZIP. Upload `index.html`, `netlify.toml`, `README.md`, and `.gitignore` **directly into the repository root** (not inside another folder).
3. Commit files to the main branch.

## Deploy on Netlify via GitHub
1. In Netlify, select Add new project > Import an existing project > GitHub.
2. Select the repository. Set base directory blank, build command blank, publish directory `.`.
3. Deploy. After GitHub updates Netlify auto-redeploys.

## Alternative: manual Netlify deploy
Extract ZIP and drag the extracted folder that contains `index.html` into Netlify's manual deploy area. Do not upload the ZIP as a subfolder of an existing project.

## Troubleshooting
- **404 / Page not found**: `index.html` must be at the publish directory root.
- **Old version**: wait for the successful deploy and hard-refresh the page.
- **Start button**: click Start Adventure to begin; no assets or external services needed.

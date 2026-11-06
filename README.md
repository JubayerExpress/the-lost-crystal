# The Lost Crystal 🎮

A small animated fantasy adventure game that runs in a browser. Built with plain HTML, CSS and JavaScript; no installation or build step needed.

## Play locally

Open `index.html` in a modern web browser.

## Controls

- Arrow keys or WASD: move
- On-screen directional buttons: move on touch devices
- R: restart

Collect five crystals, avoid the monsters, and reach the portal.

## Deploy with GitHub + Netlify

1. Create a new repository on [GitHub](https://github.com/new), e.g. `the-lost-crystal`.
2. Upload `index.html`, `netlify.toml`, `README.md`, and `.gitignore` to the **root** of the repository. Commit the files.
3. Sign in to [Netlify](https://app.netlify.com/).
4. Choose **Add new project** > **Import an existing project**, connect GitHub, and select your repository.
5. Set the **publish directory** to `.` (the repository root). Leave the build command empty. Deploy.
6. Netlify will give you a public `.netlify.app` URL. Future commits to the connected branch will trigger new deployments.

You can also deploy without GitHub by dragging the project folder into Netlify's manual deploy interface, but that won't automatically redeploy when you push GitHub changes.

## Project files

- `index.html` — all game logic, drawing, styles, and controls
- `netlify.toml` — static site deployment configuration
- `README.md` — instructions
- `.gitignore` — local files to exclude from version control

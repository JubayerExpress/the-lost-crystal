# The Lost Crystal: NEON WILDS 💎

A fast-paced, neon-styled browser adventure built with plain HTML, CSS and JavaScript. No dependencies or build tools.

## Play

Open `index.html` in your browser. Collect all seven crystals, fight the Shadow Guardian, and reach the portal.

- Move: WASD or arrow keys (on-screen directional controls on touch devices)
- Attack: Space / J (or the slash button)
- Dash: Shift / K (or the dash button)
- Pause: P
- Restart: Restart button
- Sound: Optional sound toggle (off by default)

## Deploy on Netlify using GitHub

1. Create a GitHub repository and upload **the files inside this folder** to the repository root.
2. In Netlify, select **Add new project → Import an existing project** and connect GitHub.
3. Choose the repository, leave **Build command** blank, set **Publish directory** to `.` and deploy.
4. Future commits to your connected branch automatically redeploy.

You can also drag this folder into Netlify's manual deployment interface.

## Edit

Everything lives in `index.html`. Edit CSS in `<style>` to change appearance and JavaScript in `<script>` to change gameplay. The game uses Canvas 2D, Web Audio (only when enabled), and no external assets.

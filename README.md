# THRESHOLD

**Skip Ad to Live · v0.6.0**  
HUA Chencheng × YANG Haowei · Re-Imagine Internet

There is an opening. Move towards it. Each interruption promises to bring it closer.

A small browser work with monochrome architecture, red-and-gold advertising, three movements, five possible simulated ad formats, and an unresolved ending. The game interface is in English; the advertisements remain in Chinese. There is no message to deliver, explanatory notes panel, score screen, or participation summary.

## Run and edit

Plain HTML, CSS, and JavaScript. No third-party runtime, account, payment, or server-side tracking. Open `threshold-offline.html` for a self-contained offline copy. GitHub Pages serves the repository root from `main`.

- `index.html`: minimal game interface
- `style.css`: responsive interface and simulated advertisements
- `scene.js`: monochrome architecture, light, and perspective movement
- `engine.js`: progression and timing rules
- `game.js`: interactions, narrative cues, audio, and rendering schedule
- `tests/engine.test.cjs`: rule checks
- `scripts/make-offline.cjs`: single-file export

```sh
npm test
npm run offline
```

No installation is needed. Regenerate the offline file after source edits. When releasing a new version, update the asset query version in `index.html` to prevent mixed cached files.

## Scope and verification

The three-node route and five simulated ad formats remain. Clicking Begin continues the same scene through a 1.8-second camera and light transition; the game clock starts after this transition. In the second ad, the large close icon enters a claim state, while the small corner close dismisses the ad immediately. The claim button opens the separate retention sequence. A 12-second opening conflicts with a 30-second mandatory ad. The door closes; the ending reads only “You are still here.” with an “Again” button.

The renderer uses a maximum of approximately two million pixels and 30 frames per second, with reduced-motion support and automatic pause when the page is hidden. It loads no images, video, web fonts, or third-party code. Actual low-end mobile devices and Safari still need device testing.

All architecture is drawn in code. The visual references include James Turrell, Boullée, Peter Gric, and Thomas Demand; no images of their work are embedded. The advertising palette draws on the red-envelope and gold-coupon references in the project presentation. CSS gradients, embossed borders, and a slow button sheen create the effect without image assets. Ad brands and actions are fictional. Public source does not itself grant a license; this repository currently has no license file.

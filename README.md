# Browser work

**v0.7.2**
HUA Chencheng × YANG Haowei · Re-Imagine Internet

There is an opening. Move towards it. Each interruption promises to bring it closer.

The work has no displayed title. The browser tab uses the functional label “Begin”.

A small, silent browser work with monochrome architecture, red-and-gold advertising, three movements, six possible simulated ad formats, and an unresolved ending. The game interface is in English; the advertisements remain in Chinese. There is no message to deliver, explanatory notes panel, score screen, or participation summary. The soundtrack and sound control have been removed; light, motion, and interruption carry the experience.

## Run and edit

Plain HTML, CSS, and JavaScript. No third-party runtime, account, payment, or server-side tracking. Open `threshold-offline.html` for a self-contained offline copy. GitHub Pages serves the repository root from `main`.

- `index.html`: minimal game interface
- `style.css`: responsive interface and simulated advertisements
- `scene.js`: monochrome architecture, light, and perspective movement
- `engine.js`: progression and timing rules
- `game.js`: interactions, narrative cues, and rendering schedule
- `tests/engine.test.cjs`: rule checks
- `tests/ui.test.cjs`: interface-script checks using a minimal DOM and clock adapter
- `scripts/make-offline.cjs`: single-file export

```sh
npm test
npm run offline
```

No installation is needed. Regenerate the offline file after source edits. When releasing a new version, update the asset query version in `index.html` to prevent mixed cached files.

## Scope and verification

The three-node route now includes six possible simulated ad formats. Clicking Begin continues the same scene through a 1.8-second camera and light transition; the game clock starts after this transition. Gift and acceleration claims each display a receipt with a continue button. In the second ad, the large false close opens a red-and-gold priority-service purchase offer, while the small corner close dismisses the ad immediately. Opening the offer does not purchase anything. The simulated ¥9.90 purchase displays a distinct receipt; its continue button returns to the game. The purchase page also has a true close. Declining the offer enters the retention sequence: keeping the free benefit returns an acceleration receipt, while declining twice returns to the game. No payment information is collected and no money is charged. Verification confirmation records the checkbox choice and displays the corresponding result. These are simulated choices only. A 12-second opening conflicts with a 30-second mandatory ad. The door closes; the ending reads only “You are still here.” with an “Again” button.

The renderer uses a maximum of approximately two million pixels and 30 frames per second, with reduced-motion support and automatic pause when the page is hidden. Pausing freezes the scene and stops repeated canvas drawing. Portrait framing keeps the side curtains visible, and the small true-close icon has a 44-pixel hit area. It loads no images, video, audio, web fonts, or third-party code.

The 25 automated checks cover timing and progression, claim receipts, both verification choices, the false-close, simulated purchase, and retention paths, replay, keyboard handling, focus, hidden-page pausing, and the absence of audio. Interface checks execute the actual game script with a small DOM adapter; they do not replace browser or device testing. Native Canvas renderings were inspected at desktop, portrait, and landscape sizes. Actual low-end mobile devices and Safari still need device testing.

All architecture is drawn in code. The visual references include James Turrell, Boullée, Peter Gric, and Thomas Demand; no images of their work are embedded. The advertising palette draws on the red-envelope and gold-coupon references in the project presentation. CSS gradients, embossed borders, and a slow button sheen create the effect without image assets. Ad brands and actions are fictional. Public source does not itself grant a license; this repository currently has no license file.

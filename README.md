# Browser work

**v0.8.0**  
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

The three-node route includes six possible simulated ad formats. Clicking Begin continues the same scene through a 1.8-second camera and light transition; the 160-second journey clock starts after this transition. Gift and acceleration claims display distinct receipts. In the second ad, the large false close opens a red-and-gold priority-service purchase offer, while the small true close dismisses the ad. Declining that offer enters retention; keeping the free benefit displays its receipt, and declining twice returns to the route.

The final movement is a continuous passage-confirmation process. The first two checks advance preparation from 98.0% to 99.0% and 99.5%; the optional-service receipt reflects the checkbox choice. Claiming an entry credential advances preparation to 99.7%. Its last activation cell opens three alternating tasks: hold or click repeatedly, light three points, and start a short timed check. A normal task credits 90% of the final cell; every fourth manual round credits 99%. Continuing expands the previous remainder into a new set of ten parts, nine already confirmed. The overview stops at 99.9%, while local results continue to change. No overall completion transition exists.

An optional simulated purchase can complete one local round. A purchase made earlier can be applied once at the entrance; an offer opened from a final task returns to that saved task when declined or closed, and to a distinct local receipt after activation. No payment data is collected and no money is charged. True close on a passage card saves the screen and earned progress, reveals an English Continue control, and requires timed checks to be started again after reopening. The journey clock continues until the opening closes. The ending reads only “You are still here.” and “Again”.

The renderer uses a maximum of approximately two million pixels and 30 frames per second, with reduced-motion support and automatic pause when the page is hidden. Pausing freezes the scene and stops repeated canvas drawing. Portrait framing keeps the side curtains visible, and the small true-close icon has a 44-pixel hit area. It loads no images, video, audio, web fonts, or third-party code.

The 35 automated checks cover timing and progression, receipts and verification choices, the false-close and purchase branches, 100 successive subdivisions, hold and click alternatives, light selection, timed checks, local service completion, close/reopen, deadline cleanup, replay, focus, pause, and the absence of audio. Interface checks execute the actual game script with a small DOM adapter; they do not replace browser or device testing. Native Canvas renderings were inspected at desktop, portrait, and landscape sizes. Actual low-end mobile devices and Safari still need device testing.

All architecture is drawn in code. The visual references include James Turrell, Boullée, Peter Gric, and Thomas Demand; no images of their work are embedded. The advertising palette draws on the red-envelope and gold-coupon references in the project presentation. CSS gradients, embossed borders, and a slow button sheen create the effect without image assets. Ad brands and actions are fictional. Public source does not itself grant a license; this repository currently has no license file.

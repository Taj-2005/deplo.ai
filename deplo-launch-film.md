# deplo.ai — Launch Film Production Package
**"Code goes in. Production URL comes out."**
Runtime: 60s master · 20s LinkedIn cutdown included (Section 9)

---

## Director's note before you build anything

Three constraints that will decide whether this works:

1. **Everything you see in 0:38–0:52 must be a real screen recording.** Do not generate the product UI with Veo or Runway. AI video cannot render legible, correct UI text — it will produce garbled framework names and fake logos, and this audience will spot it in one frame. Generative video is for the *atmosphere* (0:00–0:20 chaos, 0:20–0:38 reset, black space, light behavior). Real capture is for the *product*.
2. **The film must read at 85% muted.** Every beat has a text or visual state that carries meaning with no audio.
3. **No fake terminal output.** Run the real thing. Deploy a real repo. Screen-record it. If it takes 2:40 in reality, speed-ramp the capture — don't fabricate the log lines.

---

# 1. Second-by-second storyboard

Format per beat: **TIME · SHOT · CAMERA · MOTION SPEC · ON-SCREEN TEXT · SOUND · TRANSITION**

---

### ACT I — THE WALL (0:00–0:20)

---

**0:00–0:02 · Shot 1 — Black**
- **Visual:** Pure #0A0A0A. Nothing. A single cursor block (#FFFFFF, 8×18px, Geist Mono) blinks dead center at 1.0s intervals.
- **Camera:** Locked. No movement.
- **UI motion:** Cursor blink only — hard on/off, no fade. 500ms on, 500ms off.
- **Text:** none
- **Sound:** Room tone. Very low 40Hz bed at -34dB. One distant HDD-like tick at 0:01.
- **Transition out:** Hard cut.

**0:02–0:05 · Shot 2 — The ask**
- **Visual:** Same frame. Text types into the terminal line, character by character, monospace, 26px, #FFFFFF, letter-spacing -0.01em. Typing speed: 18 chars/sec, irregular (human), with a 220ms hesitation before the final word.
- **Camera:** Extremely slow push in — 100% → 103% over 3s, ease-out.
- **Text:** `i just want to put my app online`
- **Sound:** Real mechanical keystrokes, dry, close-mic'd, no reverb. Slight pitch variance per key. -12dB.
- **Transition out:** Cursor sits. Beat of 400ms of nothing. Then hard cut.

**0:05–0:08 · Shot 3 — The wall opens**
- **Visual:** From black, a lattice of browser tabs, terminal panes and doc pages materialize in Z-space — not a montage, a *volume*. 40+ rectangles at varying depths, all dark UI, all slightly out of focus except the plane nearest camera. Text fragments legible on the sharp plane: `Dockerfile`, `nginx.conf`, `CORS`, `.env.production`, `SSL cert expired`, `502 Bad Gateway`.
- **Camera:** Dolly forward through the lattice at increasing speed. Shallow DOF (f/1.4 feel). Panes rush past camera and blur.
- **UI motion:** Each pane fades up on a 120ms stagger, randomized. Panes nearest camera drift laterally at 8px/s.
- **Text:** none (the fragments *are* the text)
- **Sound:** Layers begin stacking — notification blips, a fan spinning up, keyboard mashing, a Slack ping. Each layer enters 300ms apart. Building density, not volume.
- **Transition out:** Continuous.

**0:08–0:13 · Shot 4 — Escalation, fast cuts**
- **Visual:** Six cuts, roughly 800ms each, each one a single hostile artifact filling frame, shot flat-on, high contrast, near-black background:
  1. A YAML file scrolling past far too fast to read — 300 lines in 800ms
  2. A DNS record table with a red `PROPAGATION PENDING`
  3. A terminal wall of red `npm ERR!` stack trace
  4. A Docker build log, layer after layer, `CACHED` `CACHED` `CACHED`
  5. A CORS preflight error in a browser console, red text on black
  6. A Slack message bubble, no avatar, text only: `works on my machine`
- **Camera:** Each cut locked, dead-center, no movement. The stillness against the fast cutting is what makes it feel oppressive rather than energetic.
- **UI motion:** Content inside each frame moves; the frame does not.
- **Text:** on-screen only what's inside the artifacts. `works on my machine` is the one line meant to be read.
- **Sound:** Each cut lands on a percussive transient — not a whoosh, a *thud*. Sub-bass hit at 55Hz on cuts 1, 3, 5. The ambient chaos bed continues underneath, now denser.
- **Transition out:** Cut 6 holds 200ms longer than the others. Then:

**0:13–0:17 · Shot 5 — The line**
- **Visual:** Everything drops to black except one line of text. Geist, 44px, weight 500, #FFFFFF, centered, tracking -0.02em. The line appears in two parts.
- **Camera:** Locked.
- **UI motion:** Part A fades up over 400ms (opacity 0→1, ease-out). Hold 900ms. Part B fades up over 400ms — but shifted 4px lower on the baseline and set in #00D2FF.
- **Text:**
  - Part A: `We spend more time deploying`
  - Part B: `than building.`
- **Sound:** The chaos bed **hard-cuts to nothing** the instant Part A appears. Total silence except a single low sustained cyan-feeling tone (sine, 110Hz, -26dB) under Part B.
- **Transition out:** Text holds 1.2s. Then both lines dissolve, 600ms.

**0:17–0:20 · Shot 6 — The hold**
- **Visual:** Black. Empty. Three full seconds of almost nothing. At 0:19 a single 1px horizontal line, #1A1A1A, draws across the lower third from left to right over 1s.
- **Camera:** Locked.
- **Text:** none
- **Sound:** Silence. Genuine silence — not room tone. At 0:19.5, one very soft sub-bass swell begins (30Hz, fading in from -inf to -30dB).
- **Transition out:** The 1px line becomes the anchor for the next scene.

> **Note on the 0:17–0:20 hold:** this is the highest-risk 3 seconds in the film. On LinkedIn it is where you lose people. Keep it in the 60s master; **cut it to 0.8s in the cutdown.**

---

### ACT II — ONE THING (0:20–0:38)

---

**0:20–0:24 · Shot 7 — Reset**
- **Visual:** From the 1px line, a terminal window assembles — but minimally. Just a 1px border, #1F1F1F, 1200×680px in a 1920 frame, centered, floating on #0A0A0A. No chrome, no traffic-light dots. Inside: empty. A dot-grid background at 2% opacity, 24px pitch, becomes faintly visible.
- **Camera:** Very slow push in, 100% → 104% across the full 4s, linear. Confident, not urgent.
- **UI motion:** Border draws in from the anchor line: horizontal first (400ms), then verticals (300ms, eased). Dot-grid fades up over 1.2s after the border completes.
- **Text:** none
- **Sound:** One soft, single-cycle mechanical click as the border completes. Then a low ambient pad enters — clean, wide, no rhythm.
- **Transition out:** Continuous.

**0:24–0:31 · Shot 8 — The single action**
- **Visual:** A cursor appears inside the terminal. One line types. Then, below it, a GitHub repo row renders: repo name, a small lock/globe glyph, last-commit timestamp. Thin borders. No avatars.
- **Camera:** Push continues, now slower: 104% → 106%.
- **UI motion:** Typing at 22 chars/sec, steady this time (machine-confident, contrasting with Shot 2's human hesitation). The repo row slides up 12px and fades in over 350ms, ease-out cubic.
- **Text (this is your key muted-viewer beat):**
  - Line 1: `$ connect repo`
  - Repo row: `your-org/your-app` · `main` · `updated 2m ago`
- **Sound:** Keystrokes return — but now single, deliberate, spaced. Three keys, not thirty. A soft confirm tone (sine, 660Hz, 80ms, -20dB) when the repo row lands.
- **Transition out:** Continuous.

**0:31–0:36 · Shot 9 — That's the whole ask**
- **Visual:** Frame holds on the connected repo. Then, centered beneath it, a single line of Geist 32px, #6B6B6B, fades in.
- **Camera:** Push stops. Absolute lock. The stopping is the point.
- **UI motion:** Text opacity 0→1 over 500ms. No movement.
- **Text:** `That's the whole ask.`
- **Sound:** Ambient pad only. One note change — a single upward interval, not a chord. Restraint.
- **Transition out:** Hold 1s.

**0:36–0:38 · Shot 10 — Ignition**
- **Visual:** A single point of cyan #00D2FF light appears at the left edge of the terminal border. It travels the full perimeter of the 1px border in 1.6s, leaving a fading trail. When it completes the circuit, the entire border flashes cyan for 3 frames then settles to #1F1F1F.
- **Camera:** Locked, then a 2% snap-zoom out on the flash frame.
- **UI motion:** Light travels with ease-in-out. Trail decay: 400ms, cyan → violet #7928CA → transparent.
- **Text:** none
- **Sound:** A rising tone tracks the light's travel — 200Hz → 900Hz over 1.6s. On the flash: **the music swell begins.** This is the single swell of the film.
- **Transition out:** Whip-cut on the flash frame.

---

### ACT III — THE REVEAL (0:38–0:52)

> **All of Act III is real screen capture.** Record an actual deploy. Speed-ramp to fit.

---

**0:38–0:41 · Shot 11 — Stack detected**
- **Visual:** The dark dashboard. Left: a file-tree strip showing real detected files (`package.json`, `pnpm-lock.yaml`, `next.config.js`, `requirements.txt`). Right: detection results appearing as rows. Each row: framework name in Geist Mono 15px + a version + a green check #34D399.
- **Camera:** Slow 1% drift left-to-right across the panel. Almost imperceptible.
- **UI motion:** Rows land on a 180ms stagger. Each row: translateY(8px)→0, opacity 0→1, 240ms ease-out. Check mark draws (SVG stroke-dashoffset) in 200ms, arriving 100ms after the row.
- **Text (on-screen label, 8 words max):** `Stack detected`
  - Rows read: `Next.js 15` `FastAPI` `PostgreSQL` `pnpm`
- **Sound:** A soft tick per row landing. Pitched slightly up each time — a rising four-note figure. Music swell continuing underneath.
- **Transition out:** Cut.

**0:41–0:44 · Shot 12 — Env vars found**
- **Visual:** A panel listing environment variable keys the code actually requires. Keys visible; values shown as `••••••••`. Thin 1px row separators. A count badge top-right.
- **Camera:** Locked.
- **UI motion:** Keys populate top-to-bottom, 120ms stagger, faster than Shot 11 — the rhythm accelerates through the act. Count badge number ticks up as each key lands.
- **Text:** `Every variable the code needs`
  - Keys: `DATABASE_URL` `NEXT_PUBLIC_API_URL` `JWT_SECRET` `STRIPE_KEY`
  - Badge: `7 found · asked once`
- **Sound:** Ticks continue, tighter interval. A soft paper-like riffle under the population.
- **Transition out:** Cut.

**0:43–0:47 · Shot 13 — Backend live**
- **Visual:** Split frame. Left 50%: a build log streaming in Geist Mono 13px, #A1A1A1, scrolling upward at readable-but-fast speed. Right 50%: a status card, empty, with a pulsing outline. The card resolves to a live URL and a green dot.
- **Camera:** Very slow push on the right half only (achieved in post — scale the right layer independently).
- **UI motion:** Log scrolls at ~14 lines/sec. Status card: pulse (opacity 0.4↔1.0, 900ms cycle) then hard resolve — pulse stops, green dot #34D399 appears with a 400ms bloom, URL text types in at 40 chars/sec.
- **Text:** `Backend live on Render`
  - Terminal strip: `$ deploy api → https://your-api.onrender.com ●`
- **Sound:** Log scroll has a granular texture — fine, dry, digital. On resolve: **success chime #1** — a clean two-note bell, 880Hz→1320Hz, 300ms, generous but not cute.
- **Transition out:** Cut.

**0:47–0:50 · Shot 14 — Frontend live + wired**
- **Visual:** Same layout, mirrored — build log now on the right, status card left. Second card resolves. Then: a thin cyan #00D2FF line draws *between* the two cards, connecting them. A small label appears on the line.
- **Camera:** Slow pull back, 106% → 100%, revealing both cards in one frame.
- **UI motion:** Connector line draws left-to-right over 500ms with a cyan→violet gradient. Label fades in at 60% draw completion.
- **Text:** `Frontend wired to backend`
  - Connector label: `API_URL injected`
  - Terminal strip: `$ deploy web → https://your-app.vercel.app ●`
- **Sound:** Success chime #2, a perfect fifth above chime #1. The connector draw has a filtered sweep. Music swell at peak here.
- **Transition out:** Continuous.

**0:50–0:52 · Shot 15 — The number**
- **Visual:** Both URLs sit in frame. Everything else desaturates to 30% opacity. A timer readout, previously unnoticed in the corner, is now the only thing at full brightness. It stops.
- **Camera:** Locked.
- **UI motion:** Non-timer elements fade to 30% over 400ms. Timer scales 100%→112% over 300ms and holds.
- **Text:** `2:41` — and beneath it, small, #6B6B6B: `production. yours.`
- **Sound:** Music **cuts to silence** on the timer stop. One frame of absolute nothing. This is the cut-to-silence.
- **Transition out:** Fade to black over 300ms.

---

### ACT IV — SIGN-OFF (0:52–0:60)

---

**0:52–0:56 · Shot 16 — Logo**
- **Visual:** Black. The deplo.ai mark builds: the chrome pipeline draws first as a bright specular path, segment by segment, following its actual bend. When the path reaches the terminus, the arrowhead resolves and ignites — pink/violet glow blooming outward, then settling. Cyan seam-rings on the pipe joints light last, one at a time.
- **Camera:** Locked. Zero movement. Let the logo do the work.
- **UI motion:** Pipe path: SVG stroke-dashoffset draw, 1.4s, ease-in-out. Arrowhead: scale 0.9→1.0 with a glow bloom (radial gradient, #7928CA core, 1.0→0.35 opacity over 600ms). Seam-rings: 3 rings, 150ms stagger, each a 200ms fade-in at #00D2FF.
- **Text:** none yet
- **Sound:** Silence broken by one deep, resonant tone as the arrowhead ignites — 65Hz fundamental with a long decay. Then a low ambient tail.
- **Transition out:** Logo holds, then shifts up 40px to make room.

**0:56–0:59 · Shot 17 — Tagline**
- **Visual:** Logo in upper third. Tagline in Geist, 38px, weight 400, #FFFFFF, centered. Two sentences, appearing separately.
- **Camera:** Locked.
- **UI motion:** Sentence 1 fades in, 350ms. Hold 700ms. Sentence 2 fades in, 350ms — the words `Production URL` in #00D2FF.
- **Text:** `Code goes in. Production URL comes out.`
- **Sound:** Ambient tail only. No music return.
- **Transition out:** Hold.

**0:59–0:60 · Shot 18 — The address**
- **Visual:** Tagline dims to 40%. One line appears below in Geist Mono 22px.
- **Camera:** Locked.
- **UI motion:** Fade in 300ms. Hold to end of frame.
- **Text:** `deplo.in — free during beta`
- **Sound:** One final soft click. Then nothing.
- **Transition out:** Hard cut to black at 0:60.00. No fade. End on the cut.

---

# 2. Generation prompts — every shot, Veo 3 and Runway Gen-4

**Read this first:** Shots 11–15 are marked DO-NOT-GENERATE. AI video will not render `Next.js 15` or `https://your-app.vercel.app` legibly or correctly. Those are screen captures. Prompts below are provided only for the atmospheric shots and the logo environment.

**Universal negative prompt (append to every generation):**
```
no watermark, no logo, no text overlay, no brand logos, no Vercel logo,
no GitHub logo, no Docker logo, no human faces, no people, no hands,
no stock footage look, no lens flare, no chromatic aberration,
no motion blur artifacts, no warped text, no gibberish text,
no rounded corners, no drop shadows, no gradients on UI, no purple haze,
no cursor jitter, no shaky cam, no film grain overlay, no vignette,
no bokeh balls, no particles, no smoke, no neon signs, no cyberpunk city
```

**Universal style block (prepend to every generation):**
```
Cinematic product film. Near-black background #0A0A0A. Restrained,
premium, engineering-credible. Palette strictly: #0A0A0A, #FFFFFF,
electric cyan #00D2FF, violet #7928CA. Lighting: single soft key from
frame left, deep falloff, no fill. Shot on ARRI Alexa 35, Zeiss Supreme
Prime 50mm, T1.4. Slow deliberate camera. Apple keynote pacing.
Anamorphic 2.39 framing energy inside a 16:9 frame. 24fps.
```

---

## SHOT 1 — Black + cursor (0:00–0:02)

**Veo 3:**
```
[UNIVERSAL STYLE BLOCK]
A completely black frame, pure #0A0A0A void, filling the entire image.
At exact center, a single small white rectangular text cursor, 8 pixels
wide, blinks on and off at a steady one-second rhythm. Nothing else
exists in frame. No background detail, no texture, no gradient. Camera
is perfectly locked, absolutely no movement. The blackness has real
depth — like looking into an unlit room, not a flat black card.
Duration 2 seconds.
[UNIVERSAL NEGATIVE]
```

**Runway Gen-4:**
```
Pure black void, #0A0A0A, edge to edge. Single white blinking cursor
rectangle at center. Locked camera, zero motion. Deep black with
dimensional falloff, not flat. Minimal. Premium. Dark.
Camera: static, locked off, no movement, no drift.
Motion: cursor blink only, 1Hz, hard on-off.
Style: cinematic, high contrast, ARRI Alexa, T1.4, 24fps.
Negative: [UNIVERSAL NEGATIVE]
```

---

## SHOT 3 — The wall of tabs (0:05–0:08)

**Veo 3:**
```
[UNIVERSAL STYLE BLOCK]
Camera dollies forward through a dense three-dimensional lattice of
floating dark rectangular panels suspended in black void. Forty or more
panels at varying depths, each a dark interface surface with thin 1px
grey borders and faint monospace text too small to read. Only the panels
nearest the lens are in sharp focus; everything behind falls into heavy
bokeh-free defocus. Panels rush past the lens and blur as camera
accelerates. Cold white and grey light only. Claustrophobic density.
The panels overlap and occlude each other, creating layers of depth.
Camera speed increases smoothly over 3 seconds. Duration 3 seconds.
[UNIVERSAL NEGATIVE]
```

**Runway Gen-4:**
```
Dolly forward through floating dark UI panels in black space. Dozens of
rectangular screens at different depths, thin grey 1px borders, dark
surfaces. Shallow depth of field, front plane sharp, rear planes soft.
Panels pass camera and blur. Cold grey light. Dense, layered,
claustrophobic.
Camera: fast dolly in, accelerating, straight on Z axis.
Motion: panels drift laterally 8px/sec, camera accelerates.
Style: cinematic, dark, #0A0A0A background, high contrast, 24fps.
Negative: [UNIVERSAL NEGATIVE], no readable text, no window chrome,
no traffic light buttons, no browser UI
```

---

## SHOT 4 — Six hostile artifacts (0:08–0:13)

Generate as six separate 1-second clips. Same prompt structure, swap the subject.

**Veo 3 (template — replace `<SUBJECT>`):**
```
[UNIVERSAL STYLE BLOCK]
Locked-off frontal shot of a dark computer screen filling the entire
frame, no bezel, no device visible — the screen IS the frame. On it:
<SUBJECT>. The camera does not move at all. The only motion is content
moving inside the screen. Extremely high contrast, near-black background
#0A0A0A, text in cold white and warning red. Flat-on, dead center,
perfectly parallel to sensor. Duration 1 second.
[UNIVERSAL NEGATIVE]
```

`<SUBJECT>` values:
1. `a configuration file scrolling upward far too fast to read, hundreds of indented lines blurring past`
2. `a table of network records with one row highlighted in amber, status pending`
3. `a wall of red error text, stack trace lines cascading downward, dense and hostile`
4. `a build log, identical repeated lines scrolling, each ending in the same word, monotonous repetition`
5. `a browser developer console showing red error text on black, one long error line wrapping`
6. `a single dark chat message bubble, text only, no avatar, no name, isolated in black space`

**Runway Gen-4 (template):**
```
Static locked shot. Dark screen fills frame edge to edge. <SUBJECT>.
Camera absolutely still. Content moves, frame does not. Near-black
#0A0A0A, white and red text, extreme contrast, flat frontal angle.
Camera: locked, zero movement, perpendicular to screen.
Motion: internal content scroll only.
Style: cinematic, dark UI, high contrast, 24fps.
Negative: [UNIVERSAL NEGATIVE], no screen reflection, no monitor bezel,
no desk, no room, no ambient light
```

---

## SHOT 5 — The line (0:13–0:17)

**Veo 3:**
```
[UNIVERSAL STYLE BLOCK]
Pure black frame. A single line of clean geometric sans-serif text fades
up at center, medium weight, generous letter spacing slightly tight.
Pure white. Then a second line fades up beneath it in electric cyan
#00D2FF. Nothing else in frame. Camera perfectly locked. The text does
not move, scale, or animate beyond a clean opacity fade. Deep black
background with dimensional depth. Duration 4 seconds.
[UNIVERSAL NEGATIVE]
```
> **Production note:** do not let AI generate the actual words. Generate the empty black plate with the light behavior and composite real Geist type in After Effects or CapCut. AI-rendered text will be malformed.

**Runway Gen-4:**
```
Black void. Two lines of clean sans-serif text fade in sequentially at
center — first white, then cyan #00D2FF below. Locked camera. Simple
opacity fade only, no movement. Deep dimensional black.
Camera: locked, static.
Motion: opacity fade only.
Style: minimal, cinematic, premium, dark, 24fps.
Negative: [UNIVERSAL NEGATIVE], no text distortion, no glow, no bloom
```

---

## SHOT 7 — Terminal assembles (0:20–0:24)

**Veo 3:**
```
[UNIVERSAL STYLE BLOCK]
On a pure black field, a thin rectangular outline draws itself into
existence — 1 pixel wide, dark grey #1F1F1F. Horizontal edges draw
first from a center point outward, then vertical edges descend. The
enclosed area is empty. After the rectangle completes, a faint dot grid
pattern fades up inside it at very low opacity, dots spaced evenly.
Camera performs an extremely slow push in, barely perceptible, over the
full duration. Restrained, architectural, precise. No glow, no
decoration. Duration 4 seconds.
[UNIVERSAL NEGATIVE]
```

**Runway Gen-4:**
```
Black frame. Thin 1px grey rectangle outline draws in — horizontals
first, then verticals. Interior empty, then faint dot grid fades up
inside at low opacity. Precise, architectural, minimal.
Camera: very slow push in, 100% to 104%, linear.
Motion: line draw, then grid fade.
Style: minimal dark UI, #0A0A0A, thin borders, no fill, 24fps.
Negative: [UNIVERSAL NEGATIVE], no glow, no rounded corners, no shadow
```

---

## SHOT 10 — Ignition, light travels the border (0:36–0:38)

**Veo 3:**
```
[UNIVERSAL STYLE BLOCK]
A thin rectangular outline on black. A single bright point of electric
cyan light #00D2FF appears at the left edge and travels smoothly along
the entire perimeter of the rectangle, leaving a short fading trail
behind it that shifts from cyan to violet #7928CA before dissipating.
When the light completes the full circuit and returns to its origin,
the entire outline flashes bright cyan for three frames, then settles
back to dark grey. Camera locked, then a subtle 2 percent pull back on
the flash. Clean, physical, no particles. Duration 2 seconds.
[UNIVERSAL NEGATIVE]
```

**Runway Gen-4:**
```
Thin rectangle outline on black. Point of cyan #00D2FF light travels
the full perimeter, trailing a cyan-to-violet #7928CA fade. On circuit
completion, whole outline flashes cyan then returns to dark grey.
Camera: locked, then 2% snap pull back on flash frame.
Motion: light travels perimeter, ease-in-out, 1.6s.
Style: precise, clean, no particles, dark, cinematic, 24fps.
Negative: [UNIVERSAL NEGATIVE], no sparks, no particles, no lens flare,
no glow spill, no light rays
```

---

## SHOTS 11–15 — DO NOT GENERATE

**Capture protocol instead:**
- Record at 2560×1440 minimum, 60fps, using OBS or macOS screen capture with cursor hidden.
- Deploy a real repo. Let it actually run.
- Hide any real third-party branding in-frame if you can't clear it — use your own dashboard's rendering of the state, not Vercel's or Render's own dashboards.
- Speed-ramp in post: hold real-time on the moments of resolution (URL appearing, green check landing), ramp 8–20× through the log-streaming stretches.
- Export ProRes 422 or lossless. Never screen-record to H.264 at low bitrate — the fine 1px borders will smear.

---

## SHOT 16 — Logo environment (0:52–0:56)

Generate the *environment and light behavior*; composite the actual vector logo on top.

**Veo 3:**
```
[UNIVERSAL STYLE BLOCK]
Pure black void. A chrome cylindrical tube form, highly polished, with
crisp specular highlights, bends through space in a smooth S-curve.
The metal is neutral silver with cool reflections, lit by a single soft
key from frame left. Thin luminous cyan #00D2FF ring bands sit at the
joints where tube segments meet. At the terminus, the form transitions
into a glowing arrowhead radiating soft violet-to-pink light #7928CA,
blooming outward then settling to a steady glow. Camera absolutely
locked, no movement. Photoreal chrome, sharp specular, deep black
surround. Duration 4 seconds.
[UNIVERSAL NEGATIVE]
```

**Runway Gen-4:**
```
Black void. Polished chrome tube bending in an S-curve, neutral silver,
crisp speculars, single soft key light from left. Cyan #00D2FF glowing
ring bands at tube joints. Terminus becomes a glowing violet-pink
#7928CA arrowhead, light blooming then settling.
Camera: fully locked, zero movement.
Motion: light bloom on arrowhead only.
Style: photoreal chrome, product render, deep black, cinematic, 24fps.
Negative: [UNIVERSAL NEGATIVE], no reflections of a room, no floor,
no environment reflection, no HDRI visible, no studio backdrop
```

---

# 3. Figma frame specs — 5 UI screens

**Global tokens (create these as Figma variables first):**

| Token | Value |
|---|---|
| `bg/base` | `#0A0A0A` |
| `bg/panel` | `#0E0E0E` |
| `border/hairline` | `#1F1F1F` |
| `border/active` | `#2A2A2A` |
| `text/primary` | `#FFFFFF` |
| `text/secondary` | `#A1A1A1` |
| `text/tertiary` | `#6B6B6B` |
| `accent/cyan` | `#00D2FF` |
| `accent/violet` | `#7928CA` |
| `status/success` | `#34D399` |
| `grid/dot` | `#FFFFFF` @ 2% |

**Global rules:** Border radius `4px` maximum, never more. All borders `1px`, never `2px`. No drop shadows anywhere. No gradients except the cyan→violet connector. Dot-grid background: 1px dots, 24px pitch, 2% opacity, on every frame.

**Type scale (Geist / Geist Mono only):**

| Role | Face | Size | Weight | Tracking | Line height |
|---|---|---|---|---|---|
| Display | Geist | 44 | 500 | -0.02em | 1.1 |
| Heading | Geist | 24 | 500 | -0.01em | 1.3 |
| Body | Geist | 15 | 400 | 0 | 1.5 |
| Label | Geist | 12 | 500 | 0.04em, uppercase | 1.2 |
| Terminal | Geist Mono | 13 | 400 | 0 | 1.7 |
| Terminal-lg | Geist Mono | 26 | 400 | -0.01em | 1.4 |

---

## Frame 1 — `01_connect_repo` (1920×1080)

```
Frame: 1920×1080, fill bg/base, dot-grid overlay
└─ Container: 1200×680, centered (x:360, y:200)
   ├─ Border: 1px border/hairline, radius 4
   ├─ Padding: 40px all sides
   └─ Content stack, gap 32
      ├─ Label: "CONNECT REPOSITORY" — Label style, text/tertiary
      ├─ Terminal line: "$ connect repo" — Terminal-lg, text/primary
      │  └─ "$" in text/tertiary, rest in text/primary
      └─ Repo row: 1120×72
         ├─ Border: 1px border/hairline, radius 4
         ├─ Padding: 20px 24px
         ├─ Left group (gap 12):
         │  ├─ Icon: 16×16 lock glyph, stroke 1.5px, text/secondary
         │  ├─ "your-org/your-app" — Body 15, text/primary
         │  └─ Branch chip: "main" — Terminal 13, text/secondary
         │     └─ 1px border/hairline, radius 3, padding 3px 8px
         └─ Right: "updated 2m ago" — Body 13, text/tertiary
```
**Copy on this frame, verbatim:** `CONNECT REPOSITORY` · `$ connect repo` · `your-org/your-app` · `main` · `updated 2m ago`

---

## Frame 2 — `02_stack_detected` (1920×1080)

```
Frame: 1920×1080, bg/base, dot-grid
└─ Container: 1400×720, centered
   └─ Two columns, 1px border/hairline vertical divider at x=420
      ├─ LEFT COLUMN (400px wide, padding 32)
      │  ├─ Label: "FILES ANALYZED" — Label, text/tertiary
      │  ├─ Gap 20
      │  └─ File list, row height 34, Terminal 13:
      │     ├─ "package.json"      text/secondary
      │     ├─ "pnpm-lock.yaml"    text/secondary
      │     ├─ "next.config.js"    text/secondary
      │     ├─ "requirements.txt"  text/secondary
      │     └─ "Dockerfile"        text/tertiary, strikethrough
      │        └─ trailing: "ignored" Body 12 text/tertiary
      └─ RIGHT COLUMN (940px, padding 40)
         ├─ Heading: "Stack detected" — Heading 24, text/primary
         ├─ Gap 8
         ├─ Sub: "deterministic — no guessing" — Body 15, text/tertiary
         ├─ Gap 32
         └─ Result rows, height 64, 1px bottom border/hairline each:
            ├─ "Next.js"    · "15.1"  · ✓  (check: status/success, 16px)
            ├─ "FastAPI"    · "0.115" · ✓
            ├─ "PostgreSQL" · "16"    · ✓
            └─ "pnpm"       · "9.12"  · ✓
            Layout per row: name Body 15 text/primary (left),
            version Terminal 13 text/tertiary (mid, x-offset 260),
            check right-aligned
```
**Copy verbatim:** `FILES ANALYZED` · `Stack detected` · `deterministic — no guessing` · framework rows as listed

---

## Frame 3 — `03_env_vars` (1920×1080)

```
Frame: 1920×1080, bg/base, dot-grid
└─ Container: 1000×640, centered
   ├─ 1px border/hairline, radius 4, padding 40
   ├─ Header row (space-between):
   │  ├─ Heading: "Environment variables" — Heading 24, text/primary
   │  └─ Badge: "7 found" — Label 12, accent/cyan
   │     └─ 1px accent/cyan @ 30% opacity, radius 3, padding 4px 10px
   ├─ Gap 8
   ├─ Sub: "asked once. never again." — Body 15, text/tertiary
   ├─ Gap 28
   └─ Variable rows, height 52, 1px bottom border/hairline:
      Layout: key left (Terminal 13, text/primary),
              value right (Terminal 13, text/tertiary)
      ├─ "DATABASE_URL"          "••••••••••••"
      ├─ "NEXT_PUBLIC_API_URL"   "••••••••••••"
      ├─ "JWT_SECRET"            "••••••••••••"
      ├─ "STRIPE_SECRET_KEY"     "••••••••••••"
      ├─ "REDIS_URL"             "••••••••••••"
      ├─ "SMTP_HOST"             "••••••••••••"
      └─ "SENTRY_DSN"            "••••••••••••"
```
**Copy verbatim:** `Environment variables` · `7 found` · `asked once. never again.` · keys as listed

---

## Frame 4 — `04_deploying` (1920×1080)

```
Frame: 1920×1080, bg/base, dot-grid
└─ Split layout, 1px border/hairline vertical divider at x=960
   ├─ LEFT — LOG PANE (960px, padding 48)
   │  ├─ Label: "BUILD LOG · API" — Label, text/tertiary
   │  ├─ Gap 24
   │  └─ Log lines, Terminal 13, line-height 1.7, text/secondary
   │     Last 3 lines at 100% opacity, older lines step down:
   │     60%, 40%, 25%, 15%, 8% — creating an upward fade
   │     Sample lines (use REAL captured output, these are placeholders):
   │     "==> Installing dependencies"
   │     "==> Running build command"
   │     "==> Build succeeded"
   │     "==> Starting service"
   └─ RIGHT — STATUS PANE (960px, padding 48, vertical center)
      ├─ Card A: 760×140, 1px border/hairline, radius 4, padding 28
      │  ├─ Label: "BACKEND · RENDER" — Label, text/tertiary
      │  ├─ Gap 14
      │  ├─ Status dot: 8×8 circle, status/success
      │  └─ URL: "https://your-api.onrender.com" — Terminal 15, text/primary
      ├─ Gap 32
      ├─ CONNECTOR: 2px vertical line, 32px tall, centered
      │  ├─ Gradient: accent/cyan → accent/violet
      │  └─ Label right of line: "API_URL injected" — Label 11, accent/cyan
      ├─ Gap 32
      └─ Card B: 760×140, same spec
         ├─ Label: "FRONTEND · VERCEL"
         ├─ Status dot: status/success
         └─ URL: "https://your-app.vercel.app" — Terminal 15, text/primary
```
**Copy verbatim:** `BUILD LOG · API` · `BACKEND · RENDER` · `FRONTEND · VERCEL` · `API_URL injected` · both URLs

---

## Frame 5 — `05_live` (1920×1080)

```
Frame: 1920×1080, bg/base, dot-grid
└─ Centered stack, gap 48
   ├─ Timer: "2:41" — Geist 96, weight 500, text/primary,
   │  tracking -0.03em, tabular figures ON
   ├─ Sub: "production. yours." — Body 15, text/tertiary
   ├─ Gap 24
   ├─ Divider: 1px × 400px, border/hairline, centered
   ├─ Gap 24
   └─ URL block, gap 16, both Terminal 15:
      ├─ Row: ● (status/success 8px) + "https://your-app.vercel.app"
      └─ Row: ● (status/success 8px) + "https://your-api.onrender.com"
   └─ Bottom-right corner (x:1720, y:1000):
      "free during beta" — Label 11, text/tertiary
```
**Copy verbatim:** `2:41` · `production. yours.` · both URLs · `free during beta`

---

# 4. Music direction

## Reference tracks

**1. Hans Zimmer — "Day One" (Interstellar)**
Use for: the *architecture*. A single sustained low pad that holds under everything, and the discipline to let a single note carry 20 seconds. Steal the restraint, not the organ.

**2. Jon Hopkins — "Immunity"**
Use for: the swell shape in Act III. Hopkins builds by adding *texture density*, not volume — filters opening, more grain, more air, while the fundamental stays constant. That's exactly the 0:38–0:50 build.

**3. Ólafur Arnalds — "Near Light"**
Use for: Act II (0:20–0:38). Sparse, patient, a little warm. Prevents the reset section from feeling cold or clinical. And for the Act IV tail.

**Alternative if you need royalty-free:** Musicbed or Artlist, search terms `cinematic minimal ambient swell`, `slow build no drums`, `sustained pad tension`. Avoid anything tagged `corporate`, `inspirational`, or `technology` — those all resolve to the same three trailer-riser templates.

## Structural map

| Time | Music state |
|---|---|
| 0:00–0:05 | **None.** Sound design only. |
| 0:05–0:13 | No melodic music. The chaos *is* the score — layered diegetic UI sound building in density. A 55Hz sub pulse on the hard cuts. |
| 0:13 | **Hard cut to silence.** Chaos bed drops out on the frame the line appears. One sustained 110Hz sine under it. |
| 0:17–0:20 | Silence. Then at 0:19.5 a 30Hz sub fades in from nothing. |
| 0:20–0:36 | Ambient pad enters. **One chord.** No progression. No rhythm. Warm, wide, low. Hold it. One single note change at 0:31. |
| 0:36 | **THE SWELL BEGINS.** Triggered on the ignition flash. |
| 0:36–0:50 | The swell — 14 seconds. Build by *density and filter*, not volume. Add: high strings at 0:41, a rising sub at 0:44, texture grain at 0:47. Peak at 0:49. |
| 0:50 | **THE CUT TO SILENCE.** On the timer stop. One frame of absolute nothing. |
| 0:50–0:52 | Silence. |
| 0:52 | One deep resonant tone on the logo ignition (65Hz, long decay). |
| 0:52–0:60 | Low ambient tail only. Fading. No music return, no button, no final hit. |

**The two moments that matter:** the swell at 0:36 and the cut at 0:50. Everything else is scaffolding for those two. If you only nail two audio events, nail those.

---

# 5. Sound design list

| Time | Element | Spec |
|---|---|---|
| 0:00.0 | Room tone | 40Hz bed, -34dB, continuous |
| 0:01.0 | HDD tick | Single dry click, distant, -28dB |
| 0:02.0–0:05.0 | Keystrokes A | Mechanical, dry, close-mic, no reverb. Pitch variance ±3%. 220ms hesitation before final word. -12dB |
| 0:05.2 | Chaos layer 1 | Notification blip |
| 0:05.5 | Chaos layer 2 | Fan spin-up, low, rising |
| 0:05.8 | Chaos layer 3 | Keyboard mashing, fast, unmusical |
| 0:06.1 | Chaos layer 4 | Chat ping |
| 0:06.4 | Chaos layer 5 | Second notification, different pitch |
| 0:08.0 | Cut thud 1 | Sub-bass transient, 55Hz, 120ms decay, -8dB |
| 0:09.6 | Cut thud 2 | Same, pitched up 2 semitones |
| 0:10.4 | Cut thud 3 | 55Hz |
| 0:12.0 | Cut thud 4 | 55Hz, -6dB (loudest) |
| **0:13.0** | **Hard silence** | All chaos layers cut on the frame. Zero crossfade. |
| 0:13.0–0:17.0 | Cyan tone | Sustained sine, 110Hz, -26dB |
| 0:17.0–0:19.5 | True silence | Nothing. Not even room tone. |
| 0:19.5 | Sub swell in | 30Hz, -inf → -30dB over 2s |
| 0:23.6 | Border click | Single mechanical click, dry, 40ms, -18dB |
| 0:24.0 | Ambient pad in | Enters over 800ms |
| 0:24.5, 0:25.2, 0:26.0 | Keystrokes B | Three keys only. Spaced, deliberate. -14dB |
| 0:27.5 | Repo confirm | Sine, 660Hz, 80ms, soft attack, -20dB |
| 0:31.0 | Pad note change | Single upward interval |
| 0:36.0–0:37.6 | Ignition riser | Tone sweep 200Hz → 900Hz over 1.6s, filtered |
| **0:37.6** | **Swell trigger** | Music swell begins on the flash frame |
| 0:38.2, 0:38.4, 0:38.6, 0:38.8 | Detect ticks ×4 | Short ticks, each +1 semitone. -22dB |
| 0:41.0–0:43.5 | Env riffle | Fine granular texture under key population, -26dB |
| 0:41.1–0:43.4 | Env ticks ×7 | 120ms interval, tight, -24dB |
| 0:44.0–0:46.5 | Log texture | Granular digital scroll, dry, -28dB |
| **0:46.5** | **Success chime 1** | Two-note bell, 880 → 1320Hz, 300ms, -14dB |
| 0:48.0 | Connector sweep | Filtered sweep, left→right pan, 500ms, -20dB |
| **0:49.5** | **Success chime 2** | Perfect fifth above chime 1, -13dB |
| **0:50.0** | **CUT TO SILENCE** | Music and all SFX stop. One frame of nothing. |
| 0:53.4 | Logo ignition tone | 65Hz fundamental, 3s decay, -10dB |
| 0:53.6, 0:53.8, 0:54.0 | Seam-ring ticks ×3 | Very short, high, -26dB |
| 0:54.0–0:60.0 | Ambient tail | Fading pad, -22dB → -inf |
| 0:59.2 | Final click | Single soft click, -22dB |
| 0:60.0 | End | Hard cut. No fade-out. |

**Mixing notes:**
- Master ceiling: -1.0 dBTP. LinkedIn normalizes to roughly -14 LUFS integrated; mix to -14, don't crush it.
- **The keystrokes at 0:02 and the keystrokes at 0:24 must sound different.** First set: human, irregular, slightly anxious. Second set: deliberate, spaced, calm. Same sample library, different performance.
- Everything in Act I is dry — no reverb at all. Act II introduces a small room. Act III is dry again. Act IV has the only long tail in the film.

---

# 6. CapCut assembly

## Project setup
1. New project → **Custom resolution**
2. Master build first at **1920×1080, 30fps** (build once, reframe after)
3. Settings → toggle **Smart HDR off**, **Auto enhance off**, **Auto captions off**
4. Add a 60.00s black adjustment layer at the bottom of the stack as a safety base

## Track layout

| Track | Contents |
|---|---|
| V1 | Base black + generated atmosphere clips |
| V2 | Screen captures (Act III) |
| V3 | Text layers |
| V4 | Logo + overlays |
| A1 | Music |
| A2 | Sound design (UI/chimes) |
| A3 | Keystrokes + transients |

## Clip order and durations

| # | Clip | In | Duration | Source | Transition out |
|---|---|---|---|---|---|
| 1 | Black + cursor | 0:00.0 | 2.0s | Veo Shot 1 | Hard cut |
| 2 | Typed line | 0:02.0 | 3.0s | Screen cap + text layer | Hard cut |
| 3 | Tab lattice | 0:05.0 | 3.0s | Veo Shot 3 | Hard cut |
| 4a–4f | Six artifacts | 0:08.0 | 0.83s each | Veo Shot 4 ×6 | Hard cut ×6 |
| 5 | The line | 0:13.0 | 4.0s | Black plate + text | Dissolve 0.6s |
| 6 | Hold + anchor line | 0:17.0 | 3.0s | Black + shape layer | Continuous |
| 7 | Terminal assembles | 0:20.0 | 4.0s | Veo Shot 7 | Continuous |
| 8 | Repo connect | 0:24.0 | 7.0s | Screen cap | Continuous |
| 9 | "That's the whole ask" | 0:31.0 | 5.0s | Text layer | Hold |
| 10 | Ignition | 0:36.0 | 2.0s | Veo Shot 10 | **Whip cut** |
| 11 | Stack detected | 0:38.0 | 3.0s | Screen cap | Hard cut |
| 12 | Env vars | 0:41.0 | 3.0s | Screen cap | Hard cut |
| 13 | Backend live | 0:44.0 | 3.0s | Screen cap | Hard cut |
| 14 | Frontend + wire | 0:47.0 | 3.0s | Screen cap | Continuous |
| 15 | The number | 0:50.0 | 2.0s | Screen cap + text | Fade to black 0.3s |
| 16 | Logo build | 0:52.0 | 4.0s | Veo Shot 16 + vector | Continuous |
| 17 | Tagline | 0:56.0 | 3.0s | Text layer | Continuous |
| 18 | deplo.in | 0:59.0 | 1.0s | Text layer | **Hard cut to black** |

## Transitions — use only these three
1. **Hard cut** — the default. Use for 90% of the film. In CapCut this means *no transition element at all*, just butt the clips.
2. **Dissolve, 0.6s** — used exactly twice: out of Shot 5 and into Shot 15's fade.
3. **Whip cut** — at 0:37.6 only. CapCut doesn't have a good whip. Build it: duplicate the last 3 frames of clip 10, apply Motion Blur at 80%, and a 4-frame horizontal position offset of ±120px.

**Do not use:** any CapCut preset transition. No glitch, no zoom, no flash, no page-turn, no light-leak. All of them will read as amateur to this audience.

## Text animation styles

| Text | In animation | Duration | Out |
|---|---|---|---|
| Typed line (0:02) | Typewriter | 3.0s, 18cps | Hold |
| "We spend more time deploying" | Fade in | 0.4s, ease-out | Dissolve 0.6s |
| "than building." | Fade in | 0.4s, delay 0.9s | Dissolve 0.6s |
| "That's the whole ask." | Fade in | 0.5s | Hold |
| Act III labels | Fade + slide up 8px | 0.24s, ease-out | Hard cut |
| "2:41" | Scale 100→112% | 0.3s, ease-out | Fade |
| Tagline sentence 1 | Fade in | 0.35s | Hold |
| Tagline sentence 2 | Fade in | 0.35s, delay 0.7s | Hold |
| "deplo.in — free during beta" | Fade in | 0.3s | Hard cut |

**Text settings for every text layer:** Font Geist (upload the .ttf via CapCut's font import — do not substitute Poppins or Montserrat). Tracking -2. No shadow. No stroke. No background box. No animation preset from CapCut's library — build fades with keyframed opacity manually.

## Speed ramping the screen captures
For clips 11–14, on the CapCut speed curve:
- Set **Custom** speed curve, not a preset
- Shape: start at **8×** speed, decelerate to **1×** over the final 25% of each clip
- This lands real-time exactly on the moment each green check appears
- Keep "Smooth slow motion" **off** — it introduces interpolation artifacts on 1px borders

## Export settings

**Master — 1920×1080 (LinkedIn desktop, YouTube, site embed)**
- Resolution 1080p · Frame rate 30fps · Bitrate **Higher** (or Custom 16 Mbps)
- Codec H.264 · Format MP4 · Audio AAC 320kbps 48kHz
- Smart HDR: **off**

**LinkedIn feed — 1080×1350 (4:5)**
1. Duplicate the project. Change canvas to 1080×1350.
2. **Do not auto-reframe.** CapCut's auto-reframe will crop your terminal panels badly.
3. Reframe manually per clip. Rules:
   - Act I atmosphere clips: scale up 130%, center. Losing the edges is fine.
   - Act III screen captures: **rebuild these frames natively at 1080×1350.** Re-record or re-composite. Cropping a 16:9 dashboard to 4:5 will cut off your URLs, and the URLs are the payoff.
   - Text layers: reposition to vertical center, increase size 15% (44px → 50px).
4. Export: 1080×1350, 30fps, Higher bitrate, H.264, MP4.

**LinkedIn upload notes:** Upload native to LinkedIn, never as a YouTube link — LinkedIn suppresses off-platform links in feed distribution. Max 10 min, 5GB; you're nowhere near either. Add captions via LinkedIn's SRT upload even though the film has no dialogue — caption the on-screen text lines. It improves accessibility and there is [Guessing] some evidence it helps distribution.

---

# 7. LinkedIn post copy

## Primary post

> I've spent more of my life fighting deployment than writing code.
>
> Not building. Not designing. Deploying.
>
> Dockerfiles that work locally and die in CI. Env vars discovered one 500 error at a time. DNS that propagates whenever it feels like it. CORS. Always CORS.
>
> The app was done. It just wasn't online.
>
> So we built deplo.ai.
>
> You connect a GitHub repo. That's the whole ask.
>
> It reads your actual files — package.json, your lockfile, your configs — and works out what you built. Deterministically, from the files, not from a guess. It finds every environment variable your code needs and asks you once.
>
> Then it deploys. Frontend to your Vercel account. Backend to your Render workspace. Not ours — yours. It wires them together, injects the live API URL, and hands you production URLs in under three minutes.
>
> If something breaks, it tells you why in plain English instead of a 200-line stack trace.
>
> You own all of it. Projects, logs, domains. We just do the part nobody enjoys.
>
> Code goes in. Production URL comes out.
>
> deplo.in — free during beta. I'd rather have your honest criticism than your signup.
>
> #buildinpublic #devtools #deployment #indiehackers #startups

**Hook analysis:** LinkedIn truncates at roughly 140–210 characters on mobile. Your visible first line is `I've spent more of my life fighting deployment than writing code.` — 65 characters, complete thought, lands before the fold, and every full-stack dev has felt it. It does not mention AI, does not mention a product, and does not ask for anything. That's why it works.

## Alternative — building-in-public variant

> We deployed the deployment tool wrong four times before it worked.
>
> Which felt about right.
>
> deplo.ai started because I timed myself. Eleven minutes writing the feature. Two hours and forty minutes getting it online. That ratio has been true for most of my career and I've never once seen it get better on its own.
>
> Here's where we actually are:
>
> Connect a GitHub repo. It reads your real files and detects your stack — Next.js, Vue, Astro, SvelteKit, FastAPI, Django, Go, and the rest. Finds every env var your code needs, asks once. Deploys frontend to *your* Vercel, backend to *your* Render, wires them together automatically. Production URLs in under three minutes.
>
> When a deploy fails it explains why in a sentence instead of a stack trace. We built that second because we needed it first.
>
> What's still rough: unusual repo structures still take us longer than they should. We're working on it.
>
> Everything you deploy is yours. Your accounts, your projects, your logs, your domains. Free during the beta.
>
> deplo.in
>
> Tell me what breaks. That's genuinely the most useful thing you can send me right now.
>
> #buildinpublic #devtools #shipit #indiehackers #founders

**Which to use:** [Likely] the primary post will outperform on reach; the building-in-public variant will outperform on comment quality and actual signups. If this is your *first* post about deplo.ai, use the primary. Save the variant for a follow-up in 5–7 days.

---

# 8. Rules compliance check

| Rule | Status |
|---|---|
| Nothing on screen the product can't do | ✅ Every UI element maps to a stated capability. No dashboards, no analytics, no team features, no auto-scaling, no rollbacks — none of which you claimed. |
| Works muted | ✅ Key beats carry text: `works on my machine` (0:12), `We spend more time deploying than building` (0:13), `That's the whole ask` (0:31), all four Act III labels, `2:41`, tagline, URL. |
| No talking heads, no stock people | ✅ Zero humans in frame. Universal negative prompt enforces it. |
| Text sparse, max 8 words | ✅ Longest on-screen line is 7 words. |
| No fake brand logos | ✅ Render and Vercel appear as *words* in your own UI (`BACKEND · RENDER`), never as logos. |
| Product hidden until 0:38 | ✅ First product UI frame is 0:38.0. The terminal at 0:20 is deliberately generic. |

---

# 9. The 20-second cutdown (build this one)

Same assets, ruthlessly recut. This is what you should actually post first.

| Time | Content | Source |
|---|---|---|
| 0:00–0:03 | Tab lattice, mid-speed dolly | Clip 3, trimmed |
| 0:03–0:05 | `We spend more time deploying than building.` — both lines together, no stagger | Clip 5 |
| 0:05–0:06 | Black. 0.8s hold. | Clip 6, trimmed |
| 0:06–0:09 | `$ connect repo` + repo row lands | Clip 8, speed 1.4× |
| 0:09–0:10 | Ignition | Clip 10 |
| 0:10–0:12 | Stack detected | Clip 11 |
| 0:12–0:14 | Env vars | Clip 12 |
| 0:14–0:17 | Both URLs resolve, connector draws | Clips 13+14 merged, speed 2× |
| 0:17–0:18 | `2:41` | Clip 15 |
| 0:18–0:20 | Logo + tagline + deplo.in, all three on one frame | Clips 16–18 compressed |

Post the 20s first. Post the 60s a week later as "the full film," which gives you a second post from the same production. [Guessing] but the compounding on that is worth more than one perfect launch.

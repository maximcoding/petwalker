# Auth screen — dog mascot photos

The /sign-in screen uses two decorative dog "mascots" — one peeks from the seam between the left brand pane and the right form pane on desktop, the other peeks from behind the form card on mobile. Until real photos exist, both fall back to in-code illustrations (SVG for the curlers dog, placedog.net random photo + overlay for the sunglasses dog).

This doc captures the **exact** specification for the real photos so they can be generated (via DALL-E 3 / Replicate Flux / Midjourney / commissioned illustration) and dropped into `web/public/images/auth/` to take over from the fallbacks.

## File 1 — Curlers spaniel (`spaniel-curlers.png`)

Path: `web/public/images/auth/spaniel-curlers.png`

### Subject
Close-up portrait of a **long-haired spaniel** (Cavalier King Charles Spaniel or Cocker Spaniel preferred) wearing **three pink/coral hair curlers** on top of the head. Dog is resting on the back of a soft armchair with **front paws crossed** (лапа на лапу). Camera angle slightly above eye-level, dog looking directly at camera with calm, slightly bemused expression.

### Style
- **Transparent background (PNG cutout)** — must blend with any gradient behind it.
- **Photographic realism**, not illustration.
- Soft, warm natural light (golden hour) on the dog's coat.
- Warm earth-tone fur (chestnut, copper, cream) — keep colours within the dogwalk warm palette (coral / peach / sunshine adjacent so the photo harmonises with the gradient-sunset backdrop).
- The curlers should be **clearly visible** — pink/coral plastic rollers, three of them, slightly tilted in different directions for cuteness.
- Crop tight on head + chest + crossed paws. No extraneous background props beyond the armchair's backrest fading off-frame.

### DALL-E 3 prompt (copy/paste verbatim)
```
A long-haired Cavalier King Charles Spaniel with chestnut and cream fur, photographed close-up, resting its chin and crossed front paws on the velvet backrest of a soft armchair. Three pink hair curlers are clipped to the top of its head, slightly tilted. The dog gazes directly at the camera with calm puppy-dog eyes and a faint smile. Soft warm golden-hour lighting, photographic realism, shallow depth of field, transparent PNG background, no environment behind the armchair backrest. Studio-quality pet portrait.
```

### Midjourney prompt
```
close-up portrait of long-haired Cavalier King Charles Spaniel, chestnut-cream coat, paws crossed on velvet armchair backrest, three pink hair curlers on top of head, gentle smile, soft golden-hour light, photographic, shallow depth of field, transparent background, professional pet portrait --ar 1:1 --no environment --style raw
```

### Requirements
- Format: PNG with **alpha transparency**.
- Size: 800×800 minimum (will render up to ~220px in the layout).
- File size: under 300 KB after optimization.

### After dropping the file
Open `web/src/app/(auth)/layout.tsx`, find the comment about `spaniel-curlers.png`, and add `src="/images/auth/spaniel-curlers.png"` to the `<DogMascot variant="curlers" … />` props.

## File 2 — Sunglasses dog (`sunglasses-dog.png`)

Path: `web/public/images/auth/sunglasses-dog.png`

### Subject
Close-up portrait of any friendly medium-sized dog (golden retriever / labrador / poodle mix), wearing **round black sunglasses pushed up on the forehead** so they sit between the ears rather than over the eyes. Dog gazes at the camera with big, expressive, almost human-like eyes visible below the sunglasses.

### Style
Same warm-palette photographic-realism direction as File 1. Transparent PNG cutout. Slight head tilt, peek-around-the-corner pose.

### DALL-E 3 prompt
```
Close-up portrait of a happy golden retriever with bright expressive eyes, looking directly at the camera. Round black sunglasses are pushed up on its forehead, resting between the ears, not covering the eyes. Soft warm light, photographic realism, peek-around-corner pose with slight head tilt, transparent PNG background, no environment.
```

### After dropping the file
In `(auth)/layout.tsx`, find the `<DogMascot variant="sunglasses" …>` line and add `src="/images/auth/sunglasses-dog.png"` to its props.

## Generation paths

Pick one:

1. **Pay-as-you-go API.** Add `OPENAI_API_KEY` (or `REPLICATE_API_TOKEN`) to `web/.env.local`. Cost ~$0.04 per DALL-E 3 HD image, ~$0.003 per SDXL on Replicate. I can wire `pnpm photos:generate-mascot` on request — currently not present to honour the "no paid services" preference.
2. **Generate yourself** in ChatGPT (GPT-4o image), Midjourney, Flux Playground, or any other tool, then drop the resulting `.png` into `web/public/images/auth/`.
3. **Commission** a pet illustrator on Fiverr / Dribbble — same drop location.

## Why a placeholder exists

`placedog.net` returns random dog photos with their own backgrounds (couches, lawns, etc.) — it can't filter by breed and can't add accessories like curlers. Composite overlays (drawing SVG curlers on top of random placedog photos) read as cartoonish + jarring against any real backdrop. The custom-cutout PNG approach above is the only way to get a clean, on-brand mascot photo without paid AI or a stock-photo subscription.

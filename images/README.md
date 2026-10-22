# Seedream, Nano Banana and GPT Image — Dreamina API batch image generation (Node.js and Python)

Batch-generate images with Seedream 5.0 Pro, 5.0 Lite, 4.7, 4.6, 4.5, 4.1, 4.0 and 3.0, Nano Banana Pro and Nano Banana, and GPT Image 2.5 Flare, 2.5 Sunburst and 2 through the [Dreamina API](https://useapi.net/docs/api-dreamina-v1?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) by [useapi.net](https://useapi.net/?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api), with your [Dreamina subscription](https://dreamina.capcut.com/pricing/dreamina-price). The default `seedream-4.6` also runs on a free Dreamina account's daily credits.

`dreamina-images.mjs` (and its Python twin `dreamina-images.py`) reads prompts from `prompts.json`, uploads any local reference images, submits each job to [`POST /images`](https://useapi.net/docs/api-dreamina-v1/post-dreamina-images?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api), polls [`GET /images/{jobid}`](https://useapi.net/docs/api-dreamina-v1/get-dreamina-images-jobid?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) until it is final, and downloads every image (up to 4 per Seedream job, 1 per GPT Image or Nano Banana Pro job).

## Prerequisites

- [Node.js](https://nodejs.org) v21 or newer or [Python](https://www.python.org) 3.x (neither has any dependencies to install)
- A useapi.net [API token](https://useapi.net/docs/start-here/setup-useapi?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api)
- A connected [Dreamina account](https://useapi.net/docs/start-here/setup-dreamina?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api)

## Usage

```bash
node ./dreamina-images.mjs <API_TOKEN> <EMAIL> [PROMPTS_FILE]
# or, equivalently, with Python:
python3 ./dreamina-images.py <API_TOKEN> <EMAIL> [PROMPTS_FILE]
```

`EMAIL` is the email of a connected Dreamina account. If the same email is connected in both regions, pass the account id instead (`US:<email>` or `CA:<email>`) to pick one. `PROMPTS_FILE` defaults to `prompts.json`. A `dreamina-images_results.txt` left by an interrupted run is offered for resume; errors go to `dreamina-images_errors.txt`.

## Prompts

`prompts.json` is an array of objects:

- `prompt` — what to draw (max 5,000 characters). Optional when you pass a reference image, except on `nano-banana` and `seedream-3.0`.
- `model` — optional, default `seedream-4.6`. US and CA accounts: `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst`, `nano-banana-pro`, `gpt-image-2`, `seedream-5.0-lite`, `seedream-4.6`, `seedream-4.5`, `seedream-4.1`, `seedream-4.0`, `seedream-3.0`. CA accounts only: `seedream-5.0-pro`, `seedream-4.7`, `nano-banana`.
- `ratio` — optional: `auto`, `1:1`, `3:4`, `16:9`, `4:3`, `9:16`, `2:3`, `3:2`, `21:9` (`gpt-image-2` takes only `1:1`, `2:3`, `3:2`).
- `resolution` — optional: `1k`, `1.5k`, `2k`, `4k`, depending on the model.
- `imageRef_1` … `imageRef_6` — optional local image files (jpeg, png, webp) used as references, uploaded for you. Up to 6 on most models, 3 on `nano-banana`, 1 on `seedream-3.0`.
- `imageStrength` — optional reference influence, 0–1 (default 0.5).

Local image paths in `prompts.json` are inputs you supply; they are not included in this repo. Every parameter and the per-model limits are on [POST /images](https://useapi.net/docs/api-dreamina-v1/post-dreamina-images?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api). To upscale a result to 2K/4K/8K, see [POST /images/upscale](https://useapi.net/docs/api-dreamina-v1/post-dreamina-images-upscale?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api).

---

Support: [Discord](https://discord.gg/w28uK3cnmF) · [Telegram](https://t.me/use_api) · [YouTube](https://www.youtube.com/@useapi-net)

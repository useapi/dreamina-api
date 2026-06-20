# Seedance 2.0 & Sora 2 video — Dreamina API batch generation (Node.js)

Batch-generate [Seedance 2.0](https://dreamina.capcut.com/) and Sora 2 video through the [Dreamina API](https://useapi.net/docs/api-dreamina-v1) by [useapi.net](https://useapi.net).

📖 Full walkthrough: **[How to Generate AI Video with Seedance 2.0 and Sora 2 via the Dreamina API](https://useapi.net/docs/articles/dreamina-bash)**

`dreamina.mjs` reads prompts from `prompts.json`, uploads any first/last-frame images, submits each job to [`POST /videos`](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos), polls [`GET /videos/{jobid}`](https://useapi.net/docs/api-dreamina-v1/get-dreamina-videos-jobid), and downloads every finished MP4.

## Prerequisites

- [Node.js](https://nodejs.org) v21 or newer (no dependencies to install — uses built-in `fetch`)
- A useapi.net [API token](https://useapi.net/docs/start-here/setup-useapi)
- A connected [Dreamina account](https://useapi.net/docs/start-here/setup-dreamina) email

## Usage

```bash
node ./dreamina.mjs <API_TOKEN> <EMAIL> [PROMPTS_FILE]
```

`PROMPTS_FILE` defaults to `prompts.json`. The script looks the account up by email before submitting.

## Prompts

`prompts.json` is an array of prompt objects — `prompt` is the only required field; the default model is `seedance-2.0`. Other models include `seedance-2.0-fast`, `seedance-1.5-pro`, `seedance-1.0-pro` / `mini` / `fast`, and `sora2` (CA accounts). For image-to-video, set the first/last-frame image to a **local file path** (uploaded for you). Every supported parameter is documented on [POST /videos](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos). Local image paths in `prompts.json` are inputs **you** supply — they are not included in this repo.

---

Support: [Discord](https://discord.gg/w28uK3cnmF) · [Telegram](https://t.me/use_api) · [YouTube](https://www.youtube.com/@midjourneyapi)

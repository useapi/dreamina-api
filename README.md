# Dreamina API examples (useapi.net) — Seedance 2.0 video

Runnable Node.js example for the [Dreamina API](https://useapi.net/docs/api-dreamina-v1) by [useapi.net](https://useapi.net) — generate **Seedance 2.0** video (text-to-video with native audio, and first/last-frame image-to-video) through a simple REST API that drives your own Dreamina account.

📖 Full walkthrough: **[How to Generate AI Video with Seedance 2.0 via the Dreamina API](https://useapi.net/docs/articles/dreamina-bash)**

`dreamina.mjs` reads prompts from `prompts.json`, uploads any first/last-frame images, submits each job to [`POST /videos`](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos), polls [`GET /videos/{jobid}`](https://useapi.net/docs/api-dreamina-v1/get-dreamina-videos-jobid), and downloads every finished MP4.

## Prerequisites

- [Node.js](https://nodejs.org) v21 or newer (no dependencies to install — uses built-in `fetch`)
- A useapi.net [API token](https://useapi.net/docs/start-here/setup-useapi)
- A connected [Dreamina account](https://useapi.net/docs/api-dreamina-v1)

## Usage

```bash
node ./dreamina.mjs <API_TOKEN> <EMAIL> [PROMPTS_FILE]
```

`PROMPTS_FILE` defaults to `prompts.json`. The script looks the account up by email before submitting.

## Prompts

`prompts.json` is an array of prompt objects — `prompt` is the only required field; the default model is `seedance-2.0`. For image-to-video, set the first/last-frame image to a **local file path** (uploaded for you). Every supported parameter is documented on [POST /videos](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos). Local image paths in `prompts.json` are inputs **you** supply — they are not included in this repo.

---

Support: [Discord](https://discord.gg/w28uK3cnmF) · [Telegram](https://t.me/use_api) · [YouTube](https://www.youtube.com/@midjourneyapi)

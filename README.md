# Dreamina API examples (useapi.net)

Runnable Node.js examples for the [Dreamina API](https://useapi.net/docs/api-dreamina-v1) by [useapi.net](https://useapi.net) — generate **Seedance 2.0** and **Sora 2** video through a simple REST API that drives your own [Dreamina (CapCut)](https://dreamina.capcut.com/) account. The Dreamina API also generates **Seedream** and **Nano Banana** images — see the [API overview](https://useapi.net/docs/api-dreamina-v1).

Each example reads a list of prompts from `prompts.json`, submits them through the useapi.net Dreamina API, and downloads every result — so you can queue a batch and come back to the winners.

| Example | What it does | Tutorial |
|---|---|---|
| [`seedance-video/`](./seedance-video) | Batch-generate **Seedance 2.0** / **Sora 2** video — text-to-video and first/last-frame image-to-video | [How to Generate AI Video with Seedance 2.0 and Sora 2 via the Dreamina API](https://useapi.net/docs/articles/dreamina-bash) |

## Quick start

You need [Node.js](https://nodejs.org) v21 or newer (no dependencies to install), a useapi.net [API token](https://useapi.net/docs/start-here/setup-useapi), and a connected [Dreamina account](https://useapi.net/docs/start-here/setup-dreamina) (one [$15/month subscription](https://useapi.net/docs/subscription) covers every useapi.net API):

```bash
git clone https://github.com/useapi/dreamina-api.git
cd dreamina-api/seedance-video
node ./dreamina.mjs <API_TOKEN> <EMAIL>
```

Edit `prompts.json` in each folder to queue your own prompts. Every supported parameter is documented on the [POST /videos](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos) and [POST /images](https://useapi.net/docs/api-dreamina-v1/post-dreamina-images) endpoint pages.

## About useapi.net

[useapi.net](https://useapi.net) is an experimental REST API for AI services. The Dreamina API drives your own Dreamina (CapCut) account, so you spend your plan's credits at consumer rates instead of metered developer-API pricing. See the [model matrix](https://useapi.net/model-matrix) and pricing on the [API overview](https://useapi.net/docs/api-dreamina-v1).

Visit our [Discord Server](https://discord.gg/w28uK3cnmF) or [Telegram Channel](https://t.me/use_api) for any support questions and concerns.

We regularly post guides and tutorials on the [YouTube Channel](https://www.youtube.com/@midjourneyapi).

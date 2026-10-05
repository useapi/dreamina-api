# Dreamina API examples (useapi.net)

Runnable Node.js examples for the [Dreamina API](https://useapi.net/docs/api-dreamina-v1) by [useapi.net](https://useapi.net/?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) — generate video with the **Seedance** family (2.5, 2.0, 2.0 Fast, 2.0 Mini, 1.5 Pro, 1.0) and **Sora 2**, plus images with the **Seedream** family (5.0, 4.x, 3.0), **Nano Banana**, and **GPT Image**, all through a simple REST API that drives your own [Dreamina (CapCut)](https://dreamina.capcut.com/) account.

Each example reads a list of prompts from `prompts.json`, submits them through the useapi.net Dreamina API, and downloads every result — so you can queue a batch and come back to the winners. [`images/`](./images) ships both a Node.js (`.mjs`) and a Python (`.py`) script, with no dependencies to install.

| Example | What it does | Tutorial |
|---|---|---|
| [`seedance-video/`](./seedance-video) | Batch-generate **Seedance 2.0** / **Sora 2** video — text-to-video and first/last-frame image-to-video | [How to Generate AI Video with Seedance 2.0 and Sora 2 via the Dreamina API](https://useapi.net/docs/articles/dreamina-bash) |

## Quick start

You need [Node.js](https://nodejs.org) v21 or newer (no dependencies to install), a useapi.net [API token](https://useapi.net/docs/start-here/setup-useapi?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api), and a connected [Dreamina account](https://useapi.net/docs/start-here/setup-dreamina) (one [$15/month subscription](https://useapi.net/docs/subscription?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) covers every useapi.net API):

```bash
git clone https://github.com/useapi/dreamina-api.git
cd dreamina-api/seedance-video
node ./dreamina.mjs <API_TOKEN> <EMAIL>
```

Edit `prompts.json` in each folder to queue your own prompts. Every supported parameter is documented on the [POST /videos](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos) and [POST /images](https://useapi.net/docs/api-dreamina-v1/post-dreamina-images) endpoint pages.

## Common questions

- **Does Dreamina have an API?** ByteDance sells its Seedance video models through official developer APIs, [BytePlus ModelArk](https://docs.byteplus.com/en/docs/ModelArk/1544106) internationally and Volcano Engine in China, billed per generation at developer rates. This repo uses the useapi.net Dreamina API instead, a third-party REST API that drives your own Dreamina (CapCut) website account at its subscription price, with no enterprise onboarding or approval.
- **Where do I get an API key / token?** You call this API with a useapi.net [API token](https://useapi.net/docs/start-here/setup-useapi?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) and connect your Dreamina account once with its email and password through the [Dreamina setup](https://useapi.net/docs/start-here/setup-dreamina?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api). Accounts are US or CA region. You need a VPN with a US or Canadian IP only to create the account in the browser; the API handles every request after that.
- **How much does it cost?** A flat [$15/month](https://useapi.net/docs/subscription?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) to useapi.net, which covers every useapi.net API, plus your Dreamina plan's credits. On the Advanced plan, Seedance 2.0 at 720p works out to about $0.13–$0.14 per second of video and Seedance 2.0 Fast / Mini to about $0.06. The images default `seedream-4.6`, plus `seedream-5.0-lite` and `seedream-4.0`, are free to generate. See the [cost calculator](https://useapi.net/docs/api-dreamina-v1?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api).
- **Which models can I use?** Video: `seedance-2.5`, `seedance-2.0`, `seedance-2.0-fast`, `seedance-2.0-mini`, `seedance-1.5-pro`, `seedance-1.0-pro` / `mini` / `fast` and `sora2`. Images: `seedream-5.0-pro`, `seedream-5.0-lite`, `seedream-4.7`, `seedream-4.6`, `seedream-4.5`, `seedream-4.1`, `seedream-4.0`, `seedream-3.0`, `nano-banana` and `gpt-image-2`. Some models, plus 1080p and 4K video, work on CA-region accounts only; the [model tables](https://useapi.net/docs/api-dreamina-v1?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) list which.
- **How many accounts can I connect?** Each useapi.net subscription covers 3 Dreamina accounts, and each extra $10/month subscription adds 3 more. Each account runs up to 10 jobs at the same time by default (set 1–50 with `maxJobs`), and a request without an `account` goes to an account with free capacity.
- More answers: [Dreamina API questions](https://useapi.net/docs/articles/dreamina-bash?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api#frequently-asked-questions).

## About useapi.net

[useapi.net](https://useapi.net/?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) is an experimental REST API for AI services. The Dreamina API drives your own Dreamina (CapCut) account, so you spend your plan's credits at consumer rates instead of metered developer-API pricing. See the [model matrix](https://useapi.net/model-matrix?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) and pricing on the [API overview](https://useapi.net/docs/api-dreamina-v1).

Visit our [Discord Server](https://discord.gg/w28uK3cnmF) or [Telegram Channel](https://t.me/use_api) for any support questions and concerns.

We regularly post guides and tutorials on the [YouTube Channel](https://www.youtube.com/@useapi-net).

## License

The example code in this repository is released under the [MIT License](./LICENSE). It covers the example scripts only, not the useapi.net service or API.

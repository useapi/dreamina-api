# Dreamina API examples (useapi.net)

Runnable examples for the [Dreamina API](https://useapi.net/docs/api-dreamina-v1?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) by [useapi.net](https://useapi.net/?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api), a third-party REST API for [Dreamina](https://dreamina.capcut.com/) (CapCut) by [ByteDance](https://www.bytedance.com/). It uses your [Dreamina subscription](https://dreamina.capcut.com/pricing/dreamina-price): Free, Basic $15, Standard $36, Advanced $79 to $320 or Ultra $520 a month in the US (as of October 2026).

It makes video with Seedance 2.5, 2.0, 2.0 Fast, 2.0 Mini and 1.5 Pro, Seedance 1.0 Pro (CA only), 1.0 Mini (US only) and 1.0 Fast (CA only), HappyHorse 1.1 by Alibaba (CA only) and Wan 3.0 by Tongyi Lab (CA only), and images with Seedream 5.0 Pro (CA only), 5.0 Lite, 4.7 (CA only), 4.6, 4.5, 4.1, 4.0 and 3.0, Nano Banana Pro and Nano Banana (CA only), GPT Image 2.5 Flare and Sunburst, and GPT Image 2. CA only means a Canada-region Dreamina account, and US only a US one. Both regions run the same resolutions on Seedance 2.5, up to 1080p, and on the Seedance 2.0 models, up to 4K, and 1080p on Seedance 1.5 Pro is CA only.

Each example reads a list of prompts from `prompts.json`, submits them through the useapi.net Dreamina API, and downloads every result, so you can queue a batch and come back to the winners. [`images/`](./images) ships both a Node.js (`.mjs`) and a Python (`.py`) script, with no dependencies to install.

| Example | What it does | Tutorial |
|---|---|---|
| [`seedance-video/`](./seedance-video) | Batch-generate Seedance 2.5 and 2.0 video: text-to-video and first/last-frame image-to-video | [How to Generate AI Video with Seedance 2.5 and 2.0 via the Dreamina API](https://useapi.net/docs/articles/dreamina-bash?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) |
| [`images/`](./images) | Batch-generate Seedream, Nano Banana and GPT Image pictures, with optional reference images (Node.js and Python) | [POST /images](https://useapi.net/docs/api-dreamina-v1/post-dreamina-images?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) |

The same Seedance 2.0 job on Dreamina, PixVerse, Runway and MiniMax, with a sourced price dataset, is in [useapi/seedance-2-api](https://github.com/useapi/seedance-2-api).

## Quick start

You need [Node.js](https://nodejs.org) v21 or newer (no dependencies to install), a useapi.net [API token](https://useapi.net/docs/start-here/setup-useapi?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api), and a connected [Dreamina account](https://useapi.net/docs/start-here/setup-dreamina?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) (one [$15/month subscription](https://useapi.net/docs/subscription?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) covers every useapi.net API and 3 Dreamina accounts):

```bash
git clone https://github.com/useapi/dreamina-api.git
cd dreamina-api/seedance-video
node ./dreamina.mjs <API_TOKEN> <EMAIL>
```

Edit `prompts.json` in each folder to queue your own prompts. Every supported parameter is documented on the [POST /videos](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) and [POST /images](https://useapi.net/docs/api-dreamina-v1/post-dreamina-images?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) endpoint pages.

## Common questions

<!-- Figures from the Dreamina API overview (useapi.net/docs/api-dreamina-v1), read 2026-10-23, which cites https://docs.byteplus.com/en/docs/ModelArk/1544106 read 2026-10-21 (5 s, 720p, 16:9: Seedance 2.0 Fast $0.60, 2.0 Mini $0.38, 2.0 1080p $1.87), https://docs.byteplus.com/en/docs/ModelArk/2191775 (Seedance runs only with a prepaid resource pack) and https://docs.byteplus.com/en/docs/modelark/seedance-2-5 (no real human faces, up to 30 s per request). Ours: US Advanced $79 / 8,645 credits, Fast 40 cr = $0.37, Mini 25 cr = $0.23. Seedance 2.0 1080p costs $1.86 on Canada Advanced and $1.87 on US Advanced (US runs 1080p and 4K since 2026-10-23), against $1.87, so it is not quoted. Models and regions from the overview's Models table and post-dreamina-videos.md Model Capabilities (Oct 23, 2026 changelog: HappyHorse 1.1 and Wan 3.0 on CA, seedance-1.0-mini US only). The useapi.net subscription is not part of the per-video math. -->

### Does Dreamina have an API?

Yes, through useapi.net. The useapi.net Dreamina API runs Seedance 2.5, 2.0, 2.0 Fast and 2.0 Mini, HappyHorse 1.1 and Wan 3.0 on Canada accounts, and Seedream, GPT Image 2.5 and Nano Banana Pro images over REST on your Dreamina subscription, with no enterprise onboarding or approval. Dreamina itself is a website with no developer API (as of October 2026), and ByteDance's [BytePlus ModelArk](https://docs.byteplus.com/en/docs/ModelArk/1544106) runs Seedance only after you buy a prepaid resource pack.

### How much does the Dreamina API cost?

Through useapi.net, a 5-second Seedance 2.0 Fast video at 720p costs $0.37 on Dreamina Advanced, against $0.60 on ByteDance's [BytePlus ModelArk](https://docs.byteplus.com/en/docs/ModelArk/1544106), and Seedance 2.0 Mini costs $0.23 against $0.38 (as of October 2026). BytePlus also needs a prepaid resource pack before Seedance runs. The [price table](https://useapi.net/docs/api-dreamina-v1?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api#pricing) prices every model.

### Is there a Dreamina API key?

Through useapi.net, you use our [API token](https://useapi.net/docs/start-here/setup-useapi?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api), since Dreamina issues no API key, and connect your Dreamina account once with its email and password through [Setup Dreamina](https://useapi.net/docs/start-here/setup-dreamina?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api), with no BytePlus account and no prepaid token pack. Both regions run Seedance 2.5 and the Seedance 2.0 models at the same resolutions, up to 4K. Pick a Canada-region account for Seedance 1.0 Pro and 1.0 Fast, HappyHorse 1.1, Wan 3.0 and 1080p on Seedance 1.5 Pro. A US or Canadian VPN is needed only to create the account in the browser.

### Is there a Seedance 2.5 API that accepts real faces?

Yes, through useapi.net's Dreamina route, which accepts photographic portraits on Seedance 2.5 and runs long videos of 31 to 180 seconds in one job. ByteDance's own [Seedance 2.5 guide](https://docs.byteplus.com/en/docs/modelark/seedance-2-5) says it "does not support directly uploading reference images or videos containing real human faces" and caps clips at 30 seconds (as of October 2026). Send `seedance-2.5` to [POST /videos](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api).

### How many Dreamina accounts can I connect?

Through useapi.net, each $15/month subscription covers 3 Dreamina accounts, and each extra $10/month subscription adds 3 more (as of October 2026). Each account runs up to 10 jobs at the same time by default (1 to 50 with `maxJobs`), and a request without an `account` goes to an account with free capacity.

More answers: [Dreamina API questions](https://useapi.net/docs/api-dreamina-v1?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api#questions) and the [Dreamina tutorial FAQ](https://useapi.net/docs/articles/dreamina-bash?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api#frequently-asked-questions).

## Tutorials

- [How to Generate AI Video with Seedance 2.5 and 2.0 via the Dreamina API](https://useapi.net/docs/articles/dreamina-bash?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api): text-to-video and first/last-frame image-to-video on Seedance 2.5 and 2.0
- [Seedance 2.0 and 2.5 API Pricing: Every Route, Compared](https://useapi.net/docs/articles/seedance-2-api-pricing?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api): the Dreamina route next to PixVerse, Runway, MiniMax and the official API

## About useapi.net

[useapi.net](https://useapi.net/?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) is a third-party REST API for AI services. The Dreamina API runs on your [Dreamina subscription](https://dreamina.capcut.com/pricing/dreamina-price), so each video costs its share of the subscription's credits instead of metered developer-API pricing. See the models and prices on the [Dreamina API overview](https://useapi.net/docs/api-dreamina-v1?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) and every service in the [model matrix](https://useapi.net/model-matrix?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api).

Visit our [Discord Server](https://discord.gg/w28uK3cnmF) or [Telegram Channel](https://t.me/use_api) for any support questions and concerns.

We regularly post guides and tutorials on the [YouTube Channel](https://www.youtube.com/@useapi-net).

## License

The example code in this repository is released under the [MIT License](./LICENSE). It covers the example scripts only, not the useapi.net service or API.

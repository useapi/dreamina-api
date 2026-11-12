# Seedance 2.5 draft to 1080p or 4K — Dreamina API (Node.js and Python)

Make a cheap 480p Seedance 2.5 draft with your [Dreamina subscription](https://dreamina.capcut.com/pricing/dreamina-price) through the [Dreamina API](https://useapi.net/docs/api-dreamina-v1?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) by [useapi.net](https://useapi.net/?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api), watch it, then turn that same draft into a 1080p video, or 4K on a Canadian account. The full-quality video keeps the draft's shot, motion and timing, so you pay for full quality only for the take you like.

Full walkthrough with real videos: [How to Draft Seedance 2.5 Videos at 480p and Finish Them in 1080p or 4K](https://useapi.net/docs/articles/dreamina-seedance-2-5-draft?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api)

The script:
1. makes a `seedance-2.5-draft` video with [`POST /videos`](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) and saves it as `draft-<time>.mp4`
2. asks whether to make it in full quality
3. sends the draft to [`POST /videos/full-quality`](https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos-full-quality?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) and saves `full-quality-<time>.mp4`

## Prerequisites

- [Node.js](https://nodejs.org) v21 or newer, or Python 3.8 or newer (nothing to install)
- A useapi.net [API token](https://useapi.net/docs/start-here/setup-useapi?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api)
- A connected [Dreamina account](https://useapi.net/docs/start-here/setup-dreamina?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api) with a paid Dreamina plan

## Usage

```bash
node ./dreamina-draft.mjs <API_TOKEN> <EMAIL> "Pretty lady dancing" --ratio=9:16 --duration=4
python3 ./dreamina-draft.py <API_TOKEN> <EMAIL> "Pretty lady dancing" --ratio=9:16 --duration=4
```

| Option | Values | Default |
|---|---|---|
| `--ratio` | `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16` | `16:9` |
| `--duration` | 4 to 30 seconds | 5 |
| `--resolution` | `1080p`, or `4k` on a Canadian account | `1080p` |
| `--yes` | make the full-quality video without asking | ask |

Say no and the script prints the draft's `jobid`. Dreamina keeps a draft for 14 days, so you can turn it into full quality later with `POST /videos/full-quality` and that `jobid`. Prices for the draft and every resolution are in the [cost calculator](https://useapi.net/docs/start-here/setup-dreamina?utm_source=github.com&utm_medium=referral&utm_campaign=dreamina-api#cost-calculator).

---

Support: [Discord](https://discord.gg/w28uK3cnmF) · [Telegram](https://t.me/use_api) · [YouTube](https://www.youtube.com/@useapi-net)

/*

Script version 1.0, November 12, 2026

Make a 480p Seedance 2.5 draft with the Dreamina API by useapi.net, watch it, then turn that same draft into a
1080p or 4K video. For more details visit https://useapi.net/docs/articles/dreamina-seedance-2-5-draft

Running the Script:
===================

You need Node.js v21 or newer (https://nodejs.org). No dependencies to install.

Usage: node dreamina-draft.mjs <API_TOKEN> <EMAIL> "<PROMPT>" [--ratio=9:16] [--duration=5] [--resolution=1080p|4k] [--yes]

API_TOKEN   your useapi.net API token, see https://useapi.net/docs/start-here/setup-useapi
EMAIL       the email of a Dreamina account connected to useapi.net, see https://useapi.net/docs/start-here/setup-dreamina
PROMPT      what the video shows
--ratio       21:9, 16:9, 4:3, 1:1, 3:4 or 9:16 (default 16:9)
--duration    4 to 30 seconds (default 5)
--resolution  of the full-quality video: 1080p (default) or 4k (Canadian accounts only)
--yes         make the full-quality video without asking

Example:
--------

node dreamina-draft.mjs user:1234-abcdefhijklmnopqrstuv my@email.com "Pretty lady dancing" --ratio=9:16 --duration=4

The draft is saved as draft-<time>.mp4. The script then asks whether to make the full-quality video, which is saved as
full-quality-<time>.mp4. Dreamina keeps a draft for 14 days, so you can also come back later with its jobid:
POST https://api.useapi.net/v1/dreamina/videos/full-quality with { "jobid": "<draft jobid>" }.

Changelog:
==========

- November 12, 2026: Initial release.

*/

import readline from 'node:readline/promises';
import { writeFile } from 'node:fs/promises';

const API = 'https://api.useapi.net/v1/dreamina';
const POLL_EVERY = 15 * 1000; // in milliseconds
const MAX_WAIT = 30 * 60 * 1000; // give up on a job after 30 minutes

const [apiToken, email, prompt] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const option = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
if (!apiToken || !email || !prompt) {
    console.log('Usage: node dreamina-draft.mjs <API_TOKEN> <EMAIL> "<PROMPT>" [--ratio=9:16] [--duration=5] [--resolution=1080p|4k] [--yes]');
    process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const headers = { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' };

// Explain the answers a request can get, see https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos
const explain = (status) => ({
    400: 'the request was refused, see the error',
    402: 'the useapi.net subscription expired, renew at https://useapi.net/docs/subscription',
    403: 'the Dreamina account needs a paid plan for Seedance 2.5',
    412: 'the Dreamina account is out of credits',
    429: 'the account is busy, try again in a minute',
    596: 'the Dreamina session expired, re-add the account at https://useapi.net/docs/api-dreamina-v1/post-dreamina-accounts',
}[status] ?? 'unexpected error');

const post = async (path, body) => {
    const response = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error(`⛔ HTTP ${response.status}: ${explain(response.status)}`, json.error ?? '');
        process.exit(1);
    }
    return json;
};

// Poll GET /videos/<jobid> until the job ends, then download the video
const waitAndDownload = async (jobid, file) => {
    const start = Date.now();
    while (Date.now() - start < MAX_WAIT) {
        await sleep(POLL_EVERY);
        const response = await fetch(`${API}/videos/${jobid}`, { headers });
        const job = await response.json().catch(() => ({}));
        const seconds = Math.round((Date.now() - start) / 1000);
        if (job.status === 'completed') {
            const { videoUrl, width, height } = job.response;
            await writeFile(file, Buffer.from(await (await fetch(videoUrl)).arrayBuffer()));
            console.log(`✅ ${width}x${height} in ${seconds} sec, saved as ${file}`);
            return job;
        }
        if (job.status === 'failed') {
            console.error(`⛔ The job failed after ${seconds} sec: ${job.error ?? ''} ${job.errorDetails ?? ''}`);
            process.exit(1);
        }
        console.log(`⏳ ${job.status ?? `HTTP ${response.status}`} (${seconds} sec)`);
    }
    console.error(`⛔ Gave up after ${MAX_WAIT / 60000} minutes, the job may still finish: GET ${API}/videos/${jobid}`);
    process.exit(1);
};

// Find the account by its email; the key starts with its region (US: or CA:)
const accountsResponse = await fetch(`${API}/accounts`, { headers });
const accounts = await accountsResponse.json().catch(() => ({}));
if (!accountsResponse.ok) {
    console.error(`⛔ HTTP ${accountsResponse.status}: ${explain(accountsResponse.status)}`, accounts.error ?? '');
    process.exit(1);
}
const account = Object.keys(accounts).find(key => accounts[key]?.email?.toLowerCase() === email.toLowerCase());
if (!account) {
    console.error(`⛔ No Dreamina account ${email}. Connected: ${Object.keys(accounts).join(', ') || 'none'}`);
    process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const resolution = option('resolution', '1080p');

// Step 1: the 480p draft
console.log(`🎬 Draft on ${account}: "${prompt}"`);
const draft = await post('/videos', {
    account,
    model: 'seedance-2.5-draft',
    prompt,
    ratio: option('ratio', '16:9'),
    duration: Number(option('duration', 5)),
});
console.log(`🆗 draft jobid ${draft.jobid}`);
await waitAndDownload(draft.jobid, `draft-${stamp}.mp4`);

// Step 2: watch it, then the same video in full quality
if (!process.argv.includes('--yes')) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Make it in full quality at ${resolution}? [y/N] `);
    rl.close();
    if (!/^y/i.test(answer)) {
        console.log(`👋 Not now. The draft can be used for 14 days: POST ${API}/videos/full-quality with {"jobid": "${draft.jobid}"}`);
        process.exit(0);
    }
}

console.log(`🎬 Full quality at ${resolution}`);
const full = await post('/videos/full-quality', { jobid: draft.jobid, resolution });
console.log(`🆗 full-quality jobid ${full.jobid}`);
await waitAndDownload(full.jobid, `full-quality-${stamp}.mp4`);

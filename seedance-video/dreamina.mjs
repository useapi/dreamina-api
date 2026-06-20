/*

Script version 1.0, July 19, 2026

Script to batch-generate videos using prompts with the Dreamina API v1 by useapi.net 🚀
Defaults to the seedance-2.0 model and uses the asynchronous videos endpoint.
For more details visit https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos

Installation Instructions:
==========================

You need Node.js v21 or newer installed to run this script. Download and install Node.js from:

- Windows, macOS, Linux: https://nodejs.org/

After installation, verify by running the following command in a terminal:

   node -v

Running the Script:
===================

Usage: node dreamina.mjs <API_TOKEN> <EMAIL> [PROMPTS_FILE]

Replace API_TOKEN with your actual useapi.net API token, see https://useapi.net/docs/start-here/setup-useapi
Replace EMAIL with configured Dreamina email account, see https://useapi.net/docs/start-here/setup-dreamina
If optional PROMPTS_FILE not provided prompts.json will be used.

Example:
--------

node dreamina.mjs user:1234-abcdefhijklmnopqrstuv my@email.com

This command executes the script using API token user:1234-abcdefhijklmnopqrstuv with my@email.com Dreamina account email.

Changelog:
==========

- July 19, 2026: Initial release.

*/

import readline from 'node:readline';
import fs from 'fs/promises';
import path from 'path';
import { writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';


// Constants
const RESULTS_FILE = 'dreamina_results.txt';
const ERRORS_FILE = 'dreamina_errors.txt';
const DEFAULT_PROMPTS_FILE = 'prompts.json';
const DEFAULT_MODEL = 'seedance-2.0';
const SLEEP_429 = 10 * 1000; // in milliseconds
const MAX_429_RETRIES = 6;   // give up a prompt after this many consecutive 429s (all accounts busy)
const SLEEP_DOWNLOAD = 20 * 1000; // in milliseconds

const urlAccounts = 'https://api.useapi.net/v1/dreamina/accounts';
const urlVideos = 'https://api.useapi.net/v1/dreamina/videos';
const urlVideosJob = 'https://api.useapi.net/v1/dreamina/videos/';
const urlAssets = 'https://api.useapi.net/v1/dreamina/assets/';

// Supported image extensions mapped to their upload Content-Type.
// See https://useapi.net/docs/api-dreamina-v1/post-dreamina-assets-account
const imageContentTypes = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
};

const supportedFileExtensions = Object.keys(imageContentTypes);

// { filename: assetRef }
const uploadedFiles = {};

// Utility to sleep for given milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to fetch configured Dreamina API accounts
async function fetchAccounts(apiToken) {
    const response = await fetch(urlAccounts, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiToken}`
        }
    });

    if (!response.ok) {
        console.error(`⛔ Error fetching accounts (HTTP ${response.status}): ${response.statusText}`);
        process.exit(1);
    }

    return response.json();
}

const elapsedTimeSec = (start) => (Date.now() - start) / 1000;

// Upload a first/last frame image and return its reusable assetRef.
// The asset is uploaded to the account that owns the generation (REGION:email).
async function uploadAsset(apiToken, account, filename) {

    // Check if already uploaded
    if (uploadedFiles.hasOwnProperty(filename))
        return uploadedFiles[filename];

    const startTime = Date.now();

    console.log(`⬆️  Account ${account} uploading file…`, filename);

    const body = new Blob([await fs.readFile(filename)]);

    const fileExt = filename.split('.').pop().toLowerCase();
    const contentType = imageContentTypes[fileExt];

    const response = await fetch(`${urlAssets}${encodeURIComponent(account)}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': contentType
        },
        body
    });

    if (response.ok) {
        const json = await response.json();
        const { assetRef } = json;
        console.log(`🆗 assetRef (${elapsedTimeSec(startTime)} sec)`, assetRef);
        uploadedFiles[filename] = assetRef;
    }
    else {
        console.error(`❗ Unable to upload file HTTP ${response.status} (${elapsedTimeSec(startTime)} sec)`, await response.text());
        // Do not attempt to upload failed file again
        uploadedFiles[filename] = undefined;
    }

    return uploadedFiles[filename];
}

async function submit(apiToken, url, body, index, prompt) {
    const createResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
        },
        body
    });

    const createBody = await createResponse.text();

    if (createResponse.status == 200) {
        const json = JSON.parse(createBody);
        const { jobid } = json;
        if (jobid) {
            await fs.appendFile(RESULTS_FILE, `${jobid},#${index}:${prompt}\n`);
            console.log(`✅ jobid`, jobid);
            return 200;
        } else {
            const error = `No jobid found in HTTP 200 response`;
            console.log(`❓ ${error}`, createBody);
            await fs.appendFile(ERRORS_FILE, `${error},#${index}:${prompt}\n`);
            return 500;
        }
    } else {
        switch (createResponse.status) {
            case 429:
                console.log(`🔄️ Retry on HTTP ${createResponse.status} (all accounts at capacity)`);
                break;
            case 400:
                console.log(`🛑 Validation error`, createBody);
                await fs.appendFile(ERRORS_FILE, `${createResponse.status},#${index}:${prompt}\n`);
                break;
            case 402:
                console.log(`🛑 Subscription expired or insufficient credits`, createBody);
                await fs.appendFile(ERRORS_FILE, `${createResponse.status},#${index}:${prompt}\n`);
                break;
            case 596:
                console.log(`🛑 Account session expired — re-add the account at https://useapi.net/docs/api-dreamina-v1/post-dreamina-accounts`, createBody);
                await fs.appendFile(ERRORS_FILE, `${createResponse.status},#${index}:${prompt}\n`);
                break;
            default:
                console.log(`❗ FAILED with HTTP ${createResponse.status}`, createBody);
                await fs.appendFile(ERRORS_FILE, `${createResponse.status},#${index}:${prompt}\n`);
        }
        return createResponse.status;
    }
}

// Submit a single prompt to the videos endpoint.
// firstFrame → firstFrameRef (start frame), lastFrame → endFrameRef (end frame).
async function submitVideo(apiToken, account, prompt, index) {
    const { model, prompt: text, firstFrame, lastFrame, ratio, duration, resolution } = prompt;

    const useModel = model ?? DEFAULT_MODEL;

    console.log(`🚀 ${useModel} » Prompt #${index} • account ${account} • ${duration ?? 5} secs …`);

    const firstFrameRef = firstFrame ? await uploadAsset(apiToken, account, firstFrame) : undefined;
    const endFrameRef = lastFrame ? await uploadAsset(apiToken, account, lastFrame) : undefined;

    // ratio is auto-detected from image dimensions and must not be sent when frames are provided.
    const useRatio = (firstFrameRef || endFrameRef) ? undefined : ratio;

    const body = JSON.stringify({
        account,
        model: useModel,
        prompt: text,
        ratio: useRatio,
        duration,
        resolution,
        firstFrameRef,
        endFrameRef
    });

    return await submit(apiToken, urlVideos, body, index, text);
}

// Function to download videos
async function download(apiToken) {
    if (! await fileExists(RESULTS_FILE)) return;

    try {
        const resultsContent = await fs.readFile(RESULTS_FILE, 'utf8');
        const lines = resultsContent.trim().split('\n');

        for (const line of lines) {
            const [jobid, prompt] = line.split(',');
            const videoFilename = `${jobid.replace(/:/g, '_')}.mp4`;

            console.log(`👉 ${jobid}`);

            try {
                await fs.access(videoFilename);
                console.log(`⚠️ ${videoFilename} already exists. Skipping download.`);
                continue;
            } catch {
                // File does not exist, proceed with downloading
            }

            while (true) {
                const response = await fetch(`${urlVideosJob}${jobid}`, {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${apiToken}`
                    }
                });

                if (!response.ok) {
                    console.log(`🛑 Poll failed ${jobid} (HTTP ${response.status}):\n${prompt}\n`, await response.text());
                    break;
                }

                const job = await response.json();
                const { status, response: result, error, errorDetails } = job;

                if (status == 'failed') {
                    console.error(`🛑 FAILED ${jobid} (${error}${errorDetails ? ` — ${errorDetails}` : ''}):\n${prompt}\n`);
                    break;
                }

                if (status == 'completed') {
                    // Prefer the clean master; fall back to the watermarked variant.
                    const url = result?.videoUrl ?? result?.videoUrlWatermarked;

                    if (url) {
                        console.log(`✅ Downloading ${url} to ${videoFilename}`);
                        try {
                            const videoResponse = await fetch(url);
                            if (!videoResponse.ok) {
                                console.error(`⛔ Unable to download ${jobid} (HTTP ${videoResponse.status}):\n${prompt}\n`, url);
                                break;
                            }
                            const stream = Readable.fromWeb(videoResponse.body);
                            await writeFile(videoFilename, stream);
                        } catch (err) {
                            console.error(`⛔ Error during download: ${err}`);
                        }
                    } else
                        console.error(`🛑 Unable to download ${jobid}, no videoUrl in completed job:\n${prompt}\n`);

                    break;
                }

                console.log(`⌛ ${jobid} status (${status}) and is still in progress, waiting…`);
                await sleep(SLEEP_DOWNLOAD);
            }
        }
    } catch (error) {
        console.log(`⛔ Error during download:`, error.stack || error);
    }
}

// Main function
async function main() {
    const apiToken = process.argv[2];
    const email = process.argv[3];
    const promptFile = process.argv[4] || DEFAULT_PROMPTS_FILE;

    if (!apiToken || !email) {
        console.error('Usage: node dreamina.mjs <API_TOKEN> <EMAIL> [PROMPTS_FILE]');
        process.exit(1);
    }

    console.info('Script v1.0');

    console.info('Node version is: ' + process.version);

    try {
        if (await fileExists(RESULTS_FILE)) {
            let user_input;
            while (!['y', 'n'].includes(user_input)) {
                user_input = (await promptUser(`❔ ${RESULTS_FILE} file detected. Do you want to download the results now? (y/n): `))?.toLowerCase();
                if (user_input == 'y') {
                    await download(apiToken);
                    await fs.unlink(RESULTS_FILE);
                }
            }
        }

        const start = new Date();
        try {
            console.info('START EXECUTION', start);
            await execute(apiToken, email, promptFile); // Pass the promptFile to execute function
        }
        finally {
            console.info('COMPLETED', new Date());
            console.info('EXECUTION ELAPSED', diffInMinutesAndSeconds(start, new Date()));
        }

        try {
            console.info('START DOWNLOAD', start);
            await download(apiToken);
        }
        finally {
            console.info('TOTAL ELAPSED', diffInMinutesAndSeconds(start, new Date()));
        }
    } catch (error) {
        console.error('⛔ Error during execution:', error.stack || error);
    }
}

// Modify the execute function to accept promptFile as a parameter
async function execute(apiToken, email, promptFile) {
    const accounts = await fetchAccounts(apiToken);

    const accountList = Object.values(accounts);

    console.info(`Configured Dreamina API accounts (${accountList.length}):`, accountList.map(a => a.account).join(', '));

    if (accountList.length <= 0) {
        console.error(`⛔ No configured Dreamina accounts found. Please refer to https://useapi.net/docs/start-here/setup-dreamina`);
        process.exit(1);
    }

    // Dreamina accounts are keyed as REGION:email — match by email.
    const matched = accountList.find(a => a.email === email);

    if (!matched) {
        console.error(`⛔ Account with email ${email} not found. Please refer to https://useapi.net/docs/start-here/setup-dreamina`);
        process.exit(1);
    }

    if (matched.error) {
        console.error(`⛔ Account ${matched.account} has pending error. Please resolve and re-add the account at https://useapi.net/docs/api-dreamina-v1/post-dreamina-accounts`);
        process.exit(1);
    }

    const account = matched.account;

    const promptData = await fs.readFile(promptFile, 'utf8');
    const prompts = JSON.parse(promptData);
    console.log(`Total number of prompts to process`, prompts.length);

    let warnings = [];

    // Parameters accepted by this script for the videos endpoint.
    // See https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos for the full parameter set.
    const supportedParams = ['model', 'prompt', 'firstFrame', 'lastFrame', 'ratio', 'duration', 'resolution'];

    const invalidKeys = (prompt) => Object.keys(prompt).filter(key => !key.startsWith('__') && !supportedParams.includes(key))

    for (let i = 1; i <= prompts.length; i++) {
        const prompt = prompts[i - 1];
        const { prompt: text, firstFrame, lastFrame } = prompt;

        const validateImage = async (file) => {
            if (file) {
                try {
                    await fs.access(file);
                } catch {
                    warnings.push(`⚠️  Image '${file}' does not exist. Prompt ${i}`);
                }

                const ext = file.split('.').pop().toLowerCase();

                if (!supportedFileExtensions.includes(ext))
                    warnings.push(`⚠️  Image ${file} extension ${ext} not supported. Prompt ${i}`);
            }
        };

        const notSupported = invalidKeys(prompt);
        if (notSupported.length)
            warnings.push(`⚠️  Following params not supported: ${notSupported.join(',')}. Prompt ${i}`);

        if (!text && !firstFrame)
            warnings.push(`⚠️  Please specify a prompt and/or a firstFrame image. Prompt ${i}`);

        if (lastFrame && !firstFrame)
            warnings.push(`⚠️  lastFrame (endFrameRef) requires firstFrame (firstFrameRef). Prompt ${i}`);

        await Promise.all([validateImage(firstFrame), validateImage(lastFrame)]);
    }

    if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(warning));
        console.error(`⛔ Execution stopped due to warnings.`);
        process.exit(1);
    }

    for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        let retries429 = 0;
        while (true) {
            const responseCode = await submitVideo(apiToken, account, prompt, i + 1);
            if (responseCode == 429) {
                if (++retries429 > MAX_429_RETRIES) {
                    console.error(`⛔ Gave up on prompt #${i + 1} after ${MAX_429_RETRIES} retries — all accounts still busy.`);
                    await fs.appendFile(ERRORS_FILE, `429 (gave up after ${MAX_429_RETRIES} retries),#${i + 1}\n`);
                    break;
                }
                await sleep(SLEEP_429);
            }
            else
                if (responseCode == 402 || responseCode == 596) {
                    process.exit(1);
                } else
                    break;
        }
    }
}

// Utility function to check if a file exists
async function fileExists(path) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

// Function to prompt user input
async function promptUser(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => rl.question(query, answer => {
        rl.close();
        resolve(answer);
    }));
}

function diffInMinutesAndSeconds(date1, date2) {
    const diffInSeconds = Math.floor((date2 - date1) / 1000);
    return `${Math.floor(diffInSeconds / 60)} minutes ${diffInSeconds % 60} seconds`;
};

main();

/*

Script version 1.0, October 4, 2026

Script to batch-generate images using prompts with the Dreamina API by useapi.net
Defaults to the seedream-4.6 model (it runs on a free account's daily credits) and uses the asynchronous images endpoint:
POST /images returns a jobid, GET /images/{jobid} is polled until the job is final, and every image is downloaded.
For more details visit https://useapi.net/docs/api-dreamina-v1/post-dreamina-images

Installation Instructions:
==========================

You need Node.js v21 or newer installed to run this script. Download and install Node.js from:

- Windows, macOS, Linux: https://nodejs.org/

After installation, verify by running the following command in a terminal:

   node -v

Running the Script:
===================

Usage: node dreamina-images.mjs <API_TOKEN> <EMAIL> [PROMPTS_FILE]

Replace API_TOKEN with your actual useapi.net API token, see https://useapi.net/docs/start-here/setup-useapi
Replace EMAIL with configured Dreamina email account, see https://useapi.net/docs/start-here/setup-dreamina
  To pick a region when one email is connected in both, pass the account id instead, e.g. US:my@email.com
If optional PROMPTS_FILE not provided prompts.json will be used.

Example:
--------

node dreamina-images.mjs user:1234-abcdefhijklmnopqrstuv my@email.com

This command executes the script using API token user:1234-abcdefhijklmnopqrstuv with my@email.com Dreamina account email.

Changelog:
==========

- October 4, 2026: Initial release.

*/

import readline from 'node:readline';
import fs from 'fs/promises';
import { writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';


// Constants
const RESULTS_FILE = 'dreamina-images_results.txt';
const ERRORS_FILE = 'dreamina-images_errors.txt';
const DEFAULT_PROMPTS_FILE = 'prompts.json';
const DEFAULT_MODEL = 'seedream-4.6';
const SLEEP_429 = 10 * 1000; // in milliseconds
const MAX_429_RETRIES = 6;   // give up a prompt after this many consecutive 429s (account busy)
const SLEEP_POLL = 10 * 1000; // in milliseconds

const urlAccounts = 'https://api.useapi.net/v1/dreamina/accounts';
const urlImages = 'https://api.useapi.net/v1/dreamina/images';
const urlImagesJob = 'https://api.useapi.net/v1/dreamina/images/';
const urlAssets = 'https://api.useapi.net/v1/dreamina/assets/';

// Image models of POST /images. Some are CA-region only (seedream-5.0-pro, seedream-4.7, nano-banana).
// See https://useapi.net/docs/api-dreamina-v1/post-dreamina-images#models
const SUPPORTED_MODELS = ['seedream-4.6', 'seedream-5.0-lite', 'seedream-4.0', 'seedream-5.0-pro', 'seedream-4.7',
    'seedream-4.5', 'seedream-4.1', 'seedream-3.0', 'nano-banana', 'gpt-image-2', 'gpt-image-2.5-flare',
    'gpt-image-2.5-sunburst', 'nano-banana-pro'];

// Supported image extensions mapped to their upload Content-Type.
// See https://useapi.net/docs/api-dreamina-v1/post-dreamina-assets-account
const imageContentTypes = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
};

const supportedFileExtensions = Object.keys(imageContentTypes);

// imageRef_1 .. imageRef_6 are accepted by POST /images (the per-model maximum is lower for some models).
const referenceParams = Array.from({ length: 6 }, (_, i) => `imageRef_${i + 1}`);

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

// Upload a reference image and return its reusable assetRef.
// The asset is uploaded to the account that runs the generation (REGION:email).
async function uploadAsset(apiToken, account, filename) {

    // Check if already uploaded
    if (uploadedFiles.hasOwnProperty(filename))
        return uploadedFiles[filename];

    const startTime = Date.now();

    console.log(`⬆️  Account ${account} uploading file…`, filename);

    const body = new Blob([await fs.readFile(filename)]);

    const fileExt = filename.split('.').pop().toLowerCase();

    const response = await fetch(`${urlAssets}${encodeURIComponent(account)}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': imageContentTypes[fileExt]
        },
        body
    });

    if (response.ok) {
        const { assetRef } = await response.json();
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

// Submit a single prompt to POST /images. Local imageRef_N files are uploaded to assetRefs first.
async function submitImage(apiToken, account, prompt, index) {
    const { model, prompt: text = '', ratio, resolution, imageStrength } = prompt;

    const useModel = model ?? DEFAULT_MODEL;

    console.log(`🚀 ${useModel} » Prompt #${index} • account ${account} …`);

    const refs = {};
    for (const refKey of referenceParams)
        if (prompt[refKey]) {
            refs[refKey] = await uploadAsset(apiToken, account, prompt[refKey]);
            // A reference that failed to upload would silently drop out of the request. Skip the prompt instead.
            if (!refs[refKey]) {
                console.error(`🛑 Prompt #${index} skipped: ${refKey} ${prompt[refKey]} failed to upload`);
                await fs.appendFile(ERRORS_FILE, `Upload failed for ${refKey} ${prompt[refKey]},#${index}\n`);
                return 400;
            }
        }

    // Fields left undefined are omitted from the JSON body, so the API applies its own defaults.
    const body = JSON.stringify({
        account,
        model: useModel,
        prompt: text || undefined,
        ratio,
        resolution,
        imageStrength,
        ...refs
    });

    const createResponse = await fetch(urlImages, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
        },
        body
    });

    const createBody = await createResponse.text();
    const label = text.replace(/\n/g, ' / ');

    if (createResponse.status == 200) {
        const { jobid } = JSON.parse(createBody);
        if (jobid) {
            await fs.appendFile(RESULTS_FILE, `${jobid},#${index}:${label}\n`);
            console.log(`✅ jobid`, jobid);
            return 200;
        }
        console.log(`❓ No jobid found in HTTP 200 response`, createBody);
        await fs.appendFile(ERRORS_FILE, `No jobid found in HTTP 200 response,#${index}:${label}\n`);
        return 500;
    }

    switch (createResponse.status) {
        case 429:
            console.log(`🔄️ Retry on HTTP ${createResponse.status} (account at capacity)`);
            return 429;
        case 400:
            console.log(`🛑 Validation error`, createBody);
            break;
        case 402:
            console.log(`🛑 Subscription expired or insufficient credits`, createBody);
            break;
        case 596:
            console.log(`🛑 Account session expired — re-add the account at https://useapi.net/docs/api-dreamina-v1/post-dreamina-accounts`, createBody);
            break;
        default:
            console.log(`❗ FAILED with HTTP ${createResponse.status}`, createBody);
    }
    await fs.appendFile(ERRORS_FILE, `${createResponse.status},#${index}:${label}\n`);
    return createResponse.status;
}

// Poll every submitted job until it is final, then download each generated image.
async function download(apiToken) {
    if (! await fileExists(RESULTS_FILE)) return;

    try {
        const resultsContent = await fs.readFile(RESULTS_FILE, 'utf8');
        const lines = resultsContent.trim().split('\n');

        for (const line of lines) {
            const commaAt = line.indexOf(',');
            const jobid = commaAt === -1 ? line : line.slice(0, commaAt);
            const prompt = commaAt === -1 ? '' : line.slice(commaAt + 1);
            // jobid contains ':' and the account email — make a filesystem-safe base name.
            const safeJob = jobid.replace(/[:@]/g, '_');

            console.log(`👉 ${jobid}`);

            while (true) {
                const response = await fetch(`${urlImagesJob}${encodeURIComponent(jobid)}`, {
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
                    const images = result?.images ?? [];

                    if (images.length === 0)
                        console.error(`🛑 Job ${jobid} completed but returned no images:\n${prompt}\n`);

                    // A generation usually returns several images — download every one.
                    for (let i = 0; i < images.length; i++) {
                        const { imageUrl, format } = images[i] ?? {};
                        const filename = `${safeJob}_${i + 1}.${format == 'png' ? 'png' : format == 'webp' ? 'webp' : 'jpg'}`;
                        await downloadImage(imageUrl, filename, jobid, prompt);
                    }

                    break;
                }

                console.log(`⌛ ${jobid} status (${status}) and is still in progress, waiting…`);
                await sleep(SLEEP_POLL);
            }
        }
    } catch (error) {
        console.log(`⛔ Error during download:`, error.stack || error);
    }
}

// Download a single image URL to disk.
async function downloadImage(url, filename, jobid, prompt) {
    if (await fileExists(filename)) {
        console.log(`⚠️ ${filename} already exists. Skipping download.`);
        return;
    }

    if (!url) {
        console.error(`🛑 No imageUrl for ${filename} (${jobid}):\n${prompt}\n`);
        return;
    }

    console.log(`✅ Downloading ${url} to ${filename}`);
    try {
        const imageResponse = await fetch(url);
        if (!imageResponse.ok) {
            console.error(`⛔ Unable to download ${jobid} (HTTP ${imageResponse.status}):\n${prompt}\n`, url);
            return;
        }
        await writeFile(filename, Readable.fromWeb(imageResponse.body));
    } catch (err) {
        console.error(`⛔ Error during download: ${err}`);
    }
}

// Main function
async function main() {
    const apiToken = process.argv[2];
    const email = process.argv[3];
    const promptFile = process.argv[4] || DEFAULT_PROMPTS_FILE;

    if (!apiToken || !email) {
        console.error('Usage: node dreamina-images.mjs <API_TOKEN> <EMAIL> [PROMPTS_FILE]');
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
            await execute(apiToken, email, promptFile);
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

async function execute(apiToken, email, promptFile) {
    const accounts = await fetchAccounts(apiToken);

    const accountList = Object.values(accounts);

    console.info(`Configured Dreamina API accounts: ${accountList.length}`);

    if (accountList.length <= 0) {
        console.error(`⛔ No configured Dreamina accounts found. Please refer to https://useapi.net/docs/start-here/setup-dreamina`);
        process.exit(1);
    }

    // Dreamina accounts are keyed as REGION:email — match the full account id, or the email alone.
    // When one email is connected in both regions, pass US:email or CA:email to pick the region.
    const matched = accountList.find(a => a.account === email) ?? accountList.find(a => a.email === email);

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

    // Parameters accepted by this script for the images endpoint.
    // See https://useapi.net/docs/api-dreamina-v1/post-dreamina-images for the full parameter set.
    const supportedParams = ['model', 'prompt', 'ratio', 'resolution', 'imageStrength', ...referenceParams];

    const invalidKeys = (prompt) => Object.keys(prompt).filter(key => !key.startsWith('__') && !supportedParams.includes(key));

    for (let i = 1; i <= prompts.length; i++) {
        const prompt = prompts[i - 1];
        const { prompt: text, model } = prompt;
        const refs = referenceParams.filter(refKey => prompt[refKey]);

        const notSupported = invalidKeys(prompt);
        if (notSupported.length)
            warnings.push(`⚠️  Following params not supported: ${notSupported.join(',')}. Prompt ${i}`);

        if (!text && !refs.length)
            warnings.push(`⚠️  Please specify a prompt and/or an imageRef_1 image. Prompt ${i}`);

        if (text && text.length > 5000)
            warnings.push(`⚠️  prompt exceeds 5000 characters. Prompt ${i}`);

        if (model && !SUPPORTED_MODELS.includes(model))
            warnings.push(`⚠️  Unknown model "${model}" — supported: ${SUPPORTED_MODELS.join(', ')}. Prompt ${i}`);

        for (const refKey of refs) {
            const file = prompt[refKey];
            if (!await fileExists(file))
                warnings.push(`⚠️  Image '${file}' does not exist. Prompt ${i}`);
            const ext = file.split('.').pop().toLowerCase();
            if (!supportedFileExtensions.includes(ext))
                warnings.push(`⚠️  Image ${file} extension ${ext} not supported. Prompt ${i}`);
        }

        // imageRef_N must be contiguous: imageRef_2 needs imageRef_1, and so on.
        if (refs.length && refs[refs.length - 1] !== `imageRef_${refs.length}`)
            warnings.push(`⚠️  imageRef_N must be contiguous, starting at imageRef_1. Prompt ${i}`);
    }

    if (warnings.length > 0) {
        warnings.forEach(warning => console.warn(warning));
        console.error(`⛔ Execution stopped due to warnings.`);
        process.exit(1);
    }

    for (let i = 0; i < prompts.length; i++) {
        let retries429 = 0;
        while (true) {
            const responseCode = await submitImage(apiToken, account, prompts[i], i + 1);
            if (responseCode == 429) {
                if (++retries429 > MAX_429_RETRIES) {
                    console.error(`⛔ Gave up on prompt #${i + 1} after ${MAX_429_RETRIES} retries — account still busy.`);
                    await fs.appendFile(ERRORS_FILE, `429 (gave up after ${MAX_429_RETRIES} retries),#${i + 1}\n`);
                    break;
                }
                await sleep(SLEEP_429);
            }
            else if (responseCode == 402 || responseCode == 596)
                process.exit(1);
            else
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

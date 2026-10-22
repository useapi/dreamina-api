"""

Script version 1.0, October 4, 2026

Script to batch-generate images using prompts with the Dreamina API by useapi.net
Defaults to the seedream-4.6 model (it runs on a free account's daily credits) and uses the asynchronous images endpoint:
POST /images returns a jobid, GET /images/{jobid} is polled until the job is final, and every image is downloaded.
For more details visit https://useapi.net/docs/api-dreamina-v1/post-dreamina-images

Python port of dreamina-images.mjs, standard library only (no pip install needed).

Installation Instructions:
==========================

You need Python 3.x installed to run this script. Download and install Python from:

- Windows, macOS, Linux: https://www.python.org/

After installation, verify by running the following command in a terminal:

   python3 --version

Running the Script:
===================

Usage: python3 dreamina-images.py <API_TOKEN> <EMAIL> [PROMPTS_FILE]

Replace API_TOKEN with your actual useapi.net API token, see https://useapi.net/docs/start-here/setup-useapi
Replace EMAIL with configured Dreamina email account, see https://useapi.net/docs/start-here/setup-dreamina
  To pick a region when one email is connected in both, pass the account id instead, e.g. US:my@email.com
If optional PROMPTS_FILE not provided prompts.json will be used.

Example:
--------

python3 dreamina-images.py user:1234-abcdefhijklmnopqrstuv my@email.com

This command executes the script using API token user:1234-abcdefhijklmnopqrstuv with my@email.com Dreamina account email.

Changelog:
==========

- October 4, 2026: Initial release.

"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime


# Constants
SCRIPT = 'dreamina-images.py'
RESULTS_FILE = 'dreamina-images_results.txt'
ERRORS_FILE = 'dreamina-images_errors.txt'
DEFAULT_PROMPTS_FILE = 'prompts.json'
DEFAULT_MODEL = 'seedream-4.6'
SLEEP_429 = 10        # in seconds
MAX_429_RETRIES = 6   # give up a prompt after this many consecutive 429s (account busy)
SLEEP_POLL = 10       # in seconds

urlAccounts = 'https://api.useapi.net/v1/dreamina/accounts'
urlImages = 'https://api.useapi.net/v1/dreamina/images'
urlImagesJob = 'https://api.useapi.net/v1/dreamina/images/'
urlAssets = 'https://api.useapi.net/v1/dreamina/assets/'

# Image models of POST /images. Some are CA-region only (seedream-5.0-pro, seedream-4.7, nano-banana).
# See https://useapi.net/docs/api-dreamina-v1/post-dreamina-images#models
SUPPORTED_MODELS = ['seedream-4.6', 'seedream-5.0-lite', 'seedream-4.0', 'seedream-5.0-pro', 'seedream-4.7',
                    'seedream-4.5', 'seedream-4.1', 'seedream-3.0', 'nano-banana', 'gpt-image-2', 'gpt-image-2.5-flare',
                    'gpt-image-2.5-sunburst', 'nano-banana-pro']

# Supported image extensions mapped to their upload Content-Type.
# See https://useapi.net/docs/api-dreamina-v1/post-dreamina-assets-account
imageContentTypes = {
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp'
}

# imageRef_1 .. imageRef_6 are accepted by POST /images (the per-model maximum is lower for some models).
referenceParams = [f'imageRef_{i + 1}' for i in range(6)]

# { filename: assetRef }
uploadedFiles = {}


# Perform an HTTP request and return (status, body_text). HTTP errors are returned
# as their status (mirroring fetch, which does not throw on 4xx/5xx).
def http_request(url, method='GET', headers=None, data=None):
    # api.useapi.net's Cloudflare edge rejects urllib's default User-Agent (error 1010, HTTP 403).
    req = urllib.request.Request(url, data=data, method=method, headers={'User-Agent': SCRIPT, **(headers or {})})
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', errors='replace')


def appendFile(path, text):
    with open(path, 'a', encoding='utf-8') as f:
        f.write(text)


# Fetch configured Dreamina API accounts
def fetchAccounts(apiToken):
    status, body = http_request(urlAccounts, headers={
        'Accept': 'application/json',
        'Authorization': f'Bearer {apiToken}'
    })

    if not (200 <= status < 300):
        print(f'⛔ Error fetching accounts (HTTP {status}): {body}', file=sys.stderr)
        sys.exit(1)

    return json.loads(body)


# Upload a reference image and return its reusable assetRef.
# The asset is uploaded to the account that runs the generation (REGION:email).
def uploadAsset(apiToken, account, filename):
    if filename in uploadedFiles:
        return uploadedFiles[filename]

    startTime = time.time()
    print(f'⬆️  Account {account} uploading file…', filename)

    with open(filename, 'rb') as f:
        data = f.read()

    status, responseText = http_request(f'{urlAssets}{urllib.parse.quote(account, safe="")}', method='POST', headers={
        'Accept': 'application/json',
        'Authorization': f'Bearer {apiToken}',
        'Content-Type': imageContentTypes[filename.split('.').pop().lower()]
    }, data=data)

    if 200 <= status < 300:
        assetRef = json.loads(responseText).get('assetRef')
        print(f'🆗 assetRef ({time.time() - startTime:.1f} sec)', assetRef)
        uploadedFiles[filename] = assetRef
    else:
        print(f'❗ Unable to upload file HTTP {status} ({time.time() - startTime:.1f} sec)', responseText, file=sys.stderr)
        # Do not attempt to upload failed file again
        uploadedFiles[filename] = None

    return uploadedFiles[filename]


# Submit a single prompt to POST /images. Local imageRef_N files are uploaded to assetRefs first.
def submitImage(apiToken, account, prompt, index):
    useModel = prompt.get('model') or DEFAULT_MODEL
    text = prompt.get('prompt') or ''
    label = text.replace('\n', ' / ')

    print(f'🚀 {useModel} » Prompt #{index} • account {account} …')

    # Fields not in the prompt are left out of the body, so the API applies its own defaults.
    body = {'account': account, 'model': useModel}
    if text:
        body['prompt'] = text
    for key in ['ratio', 'resolution', 'imageStrength']:
        if prompt.get(key) is not None:
            body[key] = prompt[key]

    for refKey in referenceParams:
        if prompt.get(refKey):
            body[refKey] = uploadAsset(apiToken, account, prompt[refKey])
            # A reference that failed to upload would silently drop out of the request. Skip the prompt instead.
            if not body[refKey]:
                print(f'🛑 Prompt #{index} skipped: {refKey} {prompt[refKey]} failed to upload', file=sys.stderr)
                appendFile(ERRORS_FILE, f'Upload failed for {refKey} {prompt[refKey]},#{index}\n')
                return 400

    status, responseText = http_request(urlImages, method='POST', headers={
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {apiToken}'
    }, data=json.dumps(body).encode('utf-8'))

    if status == 200:
        jobid = json.loads(responseText).get('jobid')
        if jobid:
            appendFile(RESULTS_FILE, f'{jobid},#{index}:{label}\n')
            print('✅ jobid', jobid)
            return 200
        print('❓ No jobid found in HTTP 200 response', responseText)
        appendFile(ERRORS_FILE, f'No jobid found in HTTP 200 response,#{index}:{label}\n')
        return 500

    if status == 429:
        print(f'🔄️ Retry on HTTP {status} (account at capacity)')
        return 429
    elif status == 400:
        print('🛑 Validation error', responseText)
    elif status == 402:
        print('🛑 Subscription expired or insufficient credits', responseText)
    elif status == 596:
        print('🛑 Account session expired — re-add the account at https://useapi.net/docs/api-dreamina-v1/post-dreamina-accounts', responseText)
    else:
        print(f'❗ FAILED with HTTP {status}', responseText)
    appendFile(ERRORS_FILE, f'{status},#{index}:{label}\n')
    return status


# Download a single image URL to disk.
def downloadImage(url, filename, jobid, label):
    if os.path.exists(filename):
        print(f'⚠️ {filename} already exists. Skipping download.')
        return

    if not url:
        print(f'🛑 No imageUrl for {filename} ({jobid}):\n{label}\n', file=sys.stderr)
        return

    print(f'✅ Downloading {url} to {filename}')
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': SCRIPT})) as response:
            data = response.read()
        with open(filename, 'wb') as f:
            f.write(data)
    except urllib.error.HTTPError as e:
        print(f'⛔ Unable to download {jobid} (HTTP {e.code}):\n{label}\n', url, file=sys.stderr)
    except Exception as err:
        print(f'⛔ Error during download: {err}', file=sys.stderr)


# Poll every submitted job until it is final, then download each generated image.
def download(apiToken):
    if not os.path.exists(RESULTS_FILE):
        return

    with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
        lines = f.read().strip().split('\n')

    for line in lines:
        if not line:
            continue
        jobid, _, label = line.partition(',')
        # jobid contains ':' and the account email — make a filesystem-safe base name.
        safeJob = jobid.replace(':', '_').replace('@', '_')

        print(f'👉 {jobid}')

        while True:
            status, body = http_request(f'{urlImagesJob}{urllib.parse.quote(jobid, safe="")}', headers={
                'Accept': 'application/json',
                'Authorization': f'Bearer {apiToken}'
            })

            if not (200 <= status < 300):
                print(f'🛑 Poll failed {jobid} (HTTP {status}):\n{label}\n', body)
                break

            job = json.loads(body)
            jobStatus = job.get('status')

            if jobStatus == 'failed':
                details = f" — {job['errorDetails']}" if job.get('errorDetails') else ''
                print(f"🛑 FAILED {jobid} ({job.get('error')}{details}):\n{label}\n", file=sys.stderr)
                break

            if jobStatus == 'completed':
                images = (job.get('response') or {}).get('images') or []

                if not images:
                    print(f'🛑 Job {jobid} completed but returned no images:\n{label}\n', file=sys.stderr)

                # A generation usually returns several images — download every one.
                for i, image in enumerate(images):
                    fmt = (image or {}).get('format')
                    ext = 'png' if fmt == 'png' else 'webp' if fmt == 'webp' else 'jpg'
                    downloadImage((image or {}).get('imageUrl'), f'{safeJob}_{i + 1}.{ext}', jobid, label)
                break

            print(f'⌛ {jobid} status ({jobStatus}) and is still in progress, waiting…')
            time.sleep(SLEEP_POLL)


def execute(apiToken, email, promptFile):
    accountList = list(fetchAccounts(apiToken).values())

    print(f'Configured Dreamina API accounts: {len(accountList)}')

    if not accountList:
        print('⛔ No configured Dreamina accounts found. Please refer to https://useapi.net/docs/start-here/setup-dreamina', file=sys.stderr)
        sys.exit(1)

    # Dreamina accounts are keyed as REGION:email — match the full account id, or the email alone.
    # When one email is connected in both regions, pass US:email or CA:email to pick the region.
    matched = next((a for a in accountList if a.get('account') == email), None) or next((a for a in accountList if a.get('email') == email), None)

    if not matched:
        print(f'⛔ Account with email {email} not found. Please refer to https://useapi.net/docs/start-here/setup-dreamina', file=sys.stderr)
        sys.exit(1)

    if matched.get('error'):
        print(f"⛔ Account {matched.get('account')} has pending error. Please resolve and re-add the account at https://useapi.net/docs/api-dreamina-v1/post-dreamina-accounts", file=sys.stderr)
        sys.exit(1)

    account = matched['account']

    with open(promptFile, 'r', encoding='utf-8') as f:
        prompts = json.load(f)
    print('Total number of prompts to process', len(prompts))

    warnings = []

    # Parameters accepted by this script for the images endpoint.
    # See https://useapi.net/docs/api-dreamina-v1/post-dreamina-images for the full parameter set.
    supportedParams = ['model', 'prompt', 'ratio', 'resolution', 'imageStrength'] + referenceParams

    for i, prompt in enumerate(prompts, start=1):
        text = prompt.get('prompt')
        model = prompt.get('model')
        refs = [refKey for refKey in referenceParams if prompt.get(refKey)]

        notSupported = [key for key in prompt.keys() if not key.startswith('__') and key not in supportedParams]
        if notSupported:
            warnings.append(f"⚠️  Following params not supported: {','.join(notSupported)}. Prompt {i}")

        if not text and not refs:
            warnings.append(f'⚠️  Please specify a prompt and/or an imageRef_1 image. Prompt {i}')

        if text and len(text) > 5000:
            warnings.append(f'⚠️  prompt exceeds 5000 characters. Prompt {i}')

        if model and model not in SUPPORTED_MODELS:
            warnings.append(f'⚠️  Unknown model "{model}" — supported: {", ".join(SUPPORTED_MODELS)}. Prompt {i}')

        for refKey in refs:
            file = prompt[refKey]
            if not os.path.exists(file):
                warnings.append(f"⚠️  Image '{file}' does not exist. Prompt {i}")
            ext = file.split('.').pop().lower()
            if ext not in imageContentTypes:
                warnings.append(f'⚠️  Image {file} extension {ext} not supported. Prompt {i}')

        # imageRef_N must be contiguous: imageRef_2 needs imageRef_1, and so on.
        if refs and refs[-1] != f'imageRef_{len(refs)}':
            warnings.append(f'⚠️  imageRef_N must be contiguous, starting at imageRef_1. Prompt {i}')

    if warnings:
        for warning in warnings:
            print(warning, file=sys.stderr)
        print('⛔ Execution stopped due to warnings.', file=sys.stderr)
        sys.exit(1)

    for i, prompt in enumerate(prompts, start=1):
        retries429 = 0
        while True:
            status = submitImage(apiToken, account, prompt, i)
            if status == 429:
                retries429 += 1
                if retries429 > MAX_429_RETRIES:
                    print(f'⛔ Gave up on prompt #{i} after {MAX_429_RETRIES} retries — account still busy.', file=sys.stderr)
                    appendFile(ERRORS_FILE, f'429 (gave up after {MAX_429_RETRIES} retries),#{i}\n')
                    break
                time.sleep(SLEEP_429)
            elif status in (402, 596):
                sys.exit(1)
            else:
                break


def diffInMinutesAndSeconds(date1, date2):
    diffInSeconds = int((date2 - date1).total_seconds())
    return f'{diffInSeconds // 60} minutes {diffInSeconds % 60} seconds'


# Main function
def main():
    apiToken = sys.argv[1] if len(sys.argv) > 1 else None
    email = sys.argv[2] if len(sys.argv) > 2 else None
    promptFile = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_PROMPTS_FILE

    if not apiToken or not email:
        print(f'Usage: python3 {SCRIPT} <API_TOKEN> <EMAIL> [PROMPTS_FILE]', file=sys.stderr)
        sys.exit(1)

    print('Script v1.0')
    print('Python version is: ' + sys.version)

    if os.path.exists(RESULTS_FILE):
        answer = None
        while answer not in ('y', 'n'):
            answer = input(f'❔ {RESULTS_FILE} file detected. Do you want to download the results now? (y/n): ').strip().lower()
        if answer == 'y':
            download(apiToken)
            os.unlink(RESULTS_FILE)

    start = datetime.now()
    try:
        print('START EXECUTION', start)
        execute(apiToken, email, promptFile)
    finally:
        print('COMPLETED', datetime.now())
        print('EXECUTION ELAPSED', diffInMinutesAndSeconds(start, datetime.now()))

    try:
        print('START DOWNLOAD', start)
        download(apiToken)
    finally:
        print('TOTAL ELAPSED', diffInMinutesAndSeconds(start, datetime.now()))


main()

"""
Script version 1.0, November 12, 2026

Make a 480p Seedance 2.5 draft with the Dreamina API by useapi.net, watch it, then turn that same draft into a
1080p or 4K video. For more details visit https://useapi.net/docs/articles/dreamina-seedance-2-5-draft

You need Python 3.8 or newer. No packages to install.

Usage: python3 dreamina-draft.py <API_TOKEN> <EMAIL> "<PROMPT>" [--ratio=9:16] [--duration=5] [--resolution=1080p|4k] [--yes]

API_TOKEN   your useapi.net API token, see https://useapi.net/docs/start-here/setup-useapi
EMAIL       the email of a Dreamina account connected to useapi.net, see https://useapi.net/docs/start-here/setup-dreamina
PROMPT      what the video shows
--ratio       21:9, 16:9, 4:3, 1:1, 3:4 or 9:16 (default 16:9)
--duration    4 to 30 seconds (default 5)
--resolution  of the full-quality video: 1080p (default) or 4k (Canadian accounts only)
--yes         make the full-quality video without asking

Example:

python3 dreamina-draft.py user:1234-abcdefhijklmnopqrstuv my@email.com "Pretty lady dancing" --ratio=9:16 --duration=4

Changelog:

- November 12, 2026: Initial release.
"""
import datetime
import json
import sys
import time
import urllib.error
import urllib.request

API = 'https://api.useapi.net/v1/dreamina'
POLL_EVERY = 15  # seconds
MAX_WAIT = 30 * 60  # give up on a job after 30 minutes

args = [a for a in sys.argv[1:] if not a.startswith('--')]
if len(args) < 3:
    print('Usage: python3 dreamina-draft.py <API_TOKEN> <EMAIL> "<PROMPT>" [--ratio=9:16] [--duration=5] [--resolution=1080p|4k] [--yes]')
    sys.exit(1)
api_token, email, prompt = args[:3]


def option(name, fallback):
    for a in sys.argv[1:]:
        if a.startswith(f'--{name}='):
            return a.split('=', 1)[1]
    return fallback


# The answers a request can get, see https://useapi.net/docs/api-dreamina-v1/post-dreamina-videos
EXPLAIN = {
    400: 'the request was refused, see the error',
    402: 'the useapi.net subscription expired, renew at https://useapi.net/docs/subscription',
    403: 'the Dreamina account needs a paid plan for Seedance 2.5',
    412: 'the Dreamina account is out of credits',
    429: 'the account is busy, try again in a minute',
    596: 'the Dreamina session expired, re-add the account at https://useapi.net/docs/api-dreamina-v1/post-dreamina-accounts',
}


def call(method, path, body=None):
    req = urllib.request.Request(f'{API}{path}', method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': f'Bearer {api_token}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            return res.status, json.loads(res.read() or b'{}')
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b'{}')
        except ValueError:
            return e.code, {}


def must(status, data):
    if status != 200:
        print(f'⛔ HTTP {status}: {EXPLAIN.get(status, "unexpected error")}', data.get('error', ''))
        sys.exit(1)
    return data


def wait_and_download(jobid, file):
    start = time.time()
    while time.time() - start < MAX_WAIT:
        time.sleep(POLL_EVERY)
        status, job = call('GET', f'/videos/{jobid}')
        seconds = round(time.time() - start)
        if job.get('status') == 'completed':
            r = job['response']
            with urllib.request.urlopen(r['videoUrl'], timeout=300) as res, open(file, 'wb') as f:
                f.write(res.read())
            print(f'✅ {r["width"]}x{r["height"]} in {seconds} sec, saved as {file}')
            return job
        if job.get('status') == 'failed':
            print(f'⛔ The job failed after {seconds} sec: {job.get("error", "")} {job.get("errorDetails", "")}')
            sys.exit(1)
        print(f'⏳ {job.get("status", f"HTTP {status}")} ({seconds} sec)')
    print(f'⛔ Gave up after {MAX_WAIT // 60} minutes, the job may still finish: GET {API}/videos/{jobid}')
    sys.exit(1)


# Find the account by its email; the key starts with its region (US: or CA:)
accounts = must(*call('GET', '/accounts'))
account = next((k for k, v in accounts.items() if isinstance(v, dict) and str(v.get('email', '')).lower() == email.lower()), None)
if not account:
    print(f'⛔ No Dreamina account {email}. Connected: {", ".join(accounts) or "none"}')
    sys.exit(1)

stamp = datetime.datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
resolution = option('resolution', '1080p')

# Step 1: the 480p draft
print(f'🎬 Draft on {account}: "{prompt}"')
draft = must(*call('POST', '/videos', {
    'account': account,
    'model': 'seedance-2.5-draft',
    'prompt': prompt,
    'ratio': option('ratio', '16:9'),
    'duration': int(option('duration', 5)),
}))
print(f'🆗 draft jobid {draft["jobid"]}')
wait_and_download(draft['jobid'], f'draft-{stamp}.mp4')

# Step 2: watch it, then the same video in full quality
if '--yes' not in sys.argv:
    answer = input(f'Make it in full quality at {resolution}? [y/N] ')
    if not answer.lower().startswith('y'):
        print(f'👋 Not now. The draft can be used for 14 days: POST {API}/videos/full-quality with {{"jobid": "{draft["jobid"]}"}}')
        sys.exit(0)

print(f'🎬 Full quality at {resolution}')
full = must(*call('POST', '/videos/full-quality', {'jobid': draft['jobid'], 'resolution': resolution}))
print(f'🆗 full-quality jobid {full["jobid"]}')
wait_and_download(full['jobid'], f'full-quality-{stamp}.mp4')

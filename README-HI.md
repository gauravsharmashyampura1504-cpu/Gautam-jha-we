# Stock Learners Telegram Landing Page (Hindi Setup)

Is project mein mobile-friendly landing page, Meta Pixel PageView, unique Telegram join-request invite link, Telegram webhook, Upstash Redis mapping aur Meta Conversions API ka basic integration hai.

## Zaroori baat

- Is project ko deploy karne ke baad hi real webhook URL milega.
- Telegram bot ko private channel ka admin banayein aur `Invite Users` permission dein.
- `TELEGRAM_CHAT_ID` actual private channel ID hona chahiye (aksar `-100...` se shuru hota hai).
- Landing page har button click par ek naya join-request invite link banata hai.
- Telegram webhook ka `chat_join_request` update invite link se attribution lookup karta hai.
- Telegram join request aur approved channel membership alag events hain. Ye project `JoinRequest` event bhejta hai; approval event track nahi karta.
- Forwarded/reused links, browser restrictions, cookie consent aur ad blockers ki wajah se attribution/matching incomplete ho sakti hai.
- Meta event receive hona ads attribution/optimization ki guarantee nahi hai.
- Privacy Policy template ko apni actual business details aur applicable consent/legal requirements ke mutabik edit karein.
- Meta Graph API version ko deployment ke waqt Meta ke current supported version se replace karein.

## Android phone se GitHub + Vercel deploy

1. ZIP extract karein.
2. GitHub par new repository banayein, e.g. `stock-learners-telegram`.
3. Repository mein project files upload karein. Root par `package.json`, `app/`, `lib` etc. hone chahiye.
4. Vercel dashboard mein Add New -> Project -> Import Git Repository.
5. Framework preset Next.js rehne dein, root directory repository root ho.
6. Environment Variables add karein (neeche list).
7. Deploy karein.
8. Deployment URL milne ke baad `SITE_URL` ko us exact URL se set karein, aur phir redeploy karein.
9. Telegram webhook register karein using `scripts/set-webhook.sh` ke equivalent command, neeche diya hai.
10. Telegram par test join request bhejein aur Vercel Function Logs + Meta Events Manager -> Test Events check karein.

## Environment variables

`.env.example` ko reference ke roop mein use karein. Is file ko `.env.local` naam dekar local testing mein use kar sakte hain, lekin secrets GitHub par kabhi upload na karein.

- `SITE_URL`: exact deployed URL, no trailing slash.
- `TELEGRAM_BOT_TOKEN`: BotFather token, secret.
- `TELEGRAM_CHAT_ID`: private channel ID.
- `TELEGRAM_WEBHOOK_SECRET`: strong random secret; Telegram webhook secret token supports A-Z, a-z, 0-9, `_`, `-`.
- `UPSTASH_REDIS_REST_URL`: Upstash Connect -> REST API URL.
- `UPSTASH_REDIS_REST_TOKEN`: Upstash REST token, secret.
- `META_PIXEL_ID`: existing Pixel/Dataset ID.
- `META_CAPI_TOKEN`: Meta Events Manager Conversions API token, secret.
- `META_GRAPH_VERSION`: currently supported version, e.g. replace `vXX.X`.
- `NEXT_PUBLIC_CHANNEL_TITLE`, `NEXT_PUBLIC_AGENCY_NAME`: optional display text.

## Telegram webhook command

After deploy and after setting the environment variables, run this from a trusted terminal (replace placeholders; do not share the command because it contains the bot token):

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_PROJECT.vercel.app/api/telegram",
    "secret_token": "YOUR_RANDOM_SECRET",
    "allowed_updates": ["chat_join_request"]
  }'
```

Verify via `getWebhookInfo`. The secret token must exactly match `TELEGRAM_WEBHOOK_SECRET`.

## Important production improvements

This starter includes basic origin checks, secret header validation, event IDs and Redis duplicate markers. For a high-volume production campaign, add rate limiting to `/api/invite`, monitoring/alerts, a durable retry queue, consent management, cleanup for expired invite links, and robust idempotency handling. Do not send Telegram names, IDs or phone numbers to Meta unless there is a clear lawful need and disclosure.

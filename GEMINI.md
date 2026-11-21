# Dreamina via useapi.net

This extension connects the hosted useapi.net Dreamina MCP server (`useapi-dreamina`, 15 tools). The tools make Seedance video and images on the user's own Dreamina (CapCut) accounts, render drafts in full quality, upscale videos and smooth their frame rate.

- Endpoint: https://api.useapi.net/v1/dreamina/mcp (Streamable HTTP), authorized with the user's useapi.net API token in `USEAPI_TOKEN`.
- Before the tools work, the user needs a useapi.net API token (https://useapi.net/docs/start-here/setup-useapi) and an account connected at https://useapi.net/docs/start-here/setup-dreamina.
- If a tool returns 401, ask the user to check `USEAPI_TOKEN` (`gemini extensions config useapi-dreamina`). If it says no account is configured, point them to the setup page above.
- Generations spend the credits of the user's Dreamina account, except with `unlimited: true` on a plan that has Dreamina's Unlimited mode. Ask before starting paid jobs, and report job status and links when they finish.
- Full tool list and limits: https://useapi.net/docs/api-dreamina-v1/mcp

useapi.net is a paid third-party API service ($15/month, covers every useapi.net API), not affiliated with ByteDance, CapCut or Dreamina.

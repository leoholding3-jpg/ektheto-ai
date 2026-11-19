# Ektheto

Ektheto checks links and text against public sources and presents an evidence-based result.

## Requirements

- Node.js 22.12 or newer

## Run locally

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and add the API keys you use. Keep `.env` private.
3. Start the development server with `npm run dev`.

## Build and start in production

1. Install all dependencies, including build tools, with `npm ci --include=dev`.
2. Run `npm run build`.
3. Set `NODE_ENV=production` and configure the required API keys in the host's secret settings.
4. Start the server with `npm start`. The host should provide the `PORT` environment variable.

`GEMINI_API_KEY` is required for Gemini-powered verification. Search-provider keys in `.env.example` are optional. Never commit API keys.

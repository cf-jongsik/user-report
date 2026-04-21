# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Previewing the Production Build

Preview the production build locally:

```bash
npm run preview
```

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To build and deploy directly to production:

```sh
npm run deploy
```

**Security Note:**
This application queries sensitive HTTP and Firewall event logs using Cloudflare's Log Explorer SQL API. It does not enforce authentication in the code. **You must deploy this worker behind Cloudflare Access / Zero Trust** so that only authorized administrators can view the reports.

## Two-Step Query Flow

To ensure accurate footprint metrics, the report queries logs in two steps:

1. Searches `http_requests` for the specific `student-id` header to collect their unique `RayID`s.
2. Uses those `RayID`s to query `firewall_events`, fetching full rules/actions that triggered for this exact student (fixing a previous over-counting bug where it only filtered firewall events by time).

## Rich Data Fields

The report pulls various dimensions from Log Explorer:

- **Geo & Network**: `ClientCountry`, `ClientASN`, `ClientIP`
- **Device & Bot**: `ClientDeviceType`, `ClientRequestUserAgent`, `BotScore`, `VerifiedBotCategory`
- **Hosts & Referrers**: `ClientRequestHost`, `ClientRequestReferer`, `CacheCacheStatus`
- **Security & Rules**: WAF Attack scores (SQLi, XSS, RCE), triggered rule descriptions, actions, and sources.

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.

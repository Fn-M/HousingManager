# HousingManager

A modern Vite + React + TailwindCSS app that reads properties from an API and lists them in a responsive table. It also supports viewing property details and deleting a property.

## Tech Stack
- React 18
- Vite 5
- TailwindCSS 3
- Axios

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Configure environment variables:
   - Copy `.env.local.example` to `.env.local` and set your values
   - Defaults are already set for the provided API base URL and key

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open the app URL shown in the terminal (usually http://localhost:5173/).

## Environment Variables
- `VITE_API_BASE_URL` (default: `https://byyagzyd94.execute-api.eu-west-1.amazonaws.com/prod`)
- `VITE_API_KEY` (default: provided in code; you can override here)

## API
- List: `GET /ads`
- Details: `GET /ads/{id}`
- Update: `PUT /ads/{id}` (body: full payload)
- Delete: `DELETE /ads/{id}`

## Scripts
- `npm run dev` – start dev server
- `npm run build` – build for production
- `npm run preview` – preview production build

## Notes
- The UI includes a Refresh button and an Open API shortcut.
- The Details button fetches a single ad and displays its JSON in an alert.

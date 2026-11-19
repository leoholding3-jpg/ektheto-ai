# Ektheto

Ektheto has two local entry points: a web verifier for pasted text and links, and
a Streamlit tool for image AI-generation analysis.

## Requirements

- Node.js 22.15+ and npm for the web verifier (uses the Windows system CA store)
- Python 3.10 or newer for the image detector
- A Gemini API key for AI-grounded synthesis in the web verifier
- Sightengine API credentials for image analysis

## Web verifier: paste text or a link

1. In Windows PowerShell, install dependencies with `npm.cmd ci`.
2. Add `GEMINI_API_KEY` to `.env`. The key stays on the server and must not be
   exposed in frontend code.
3. Start with `npm.cmd run dev` and open `http://localhost:3000`.

For production, build with `npm.cmd run build`, then start with `npm.cmd start`.

Paste a claim or a link in **Verify**. The app searches public sources and streams
the result. Without `GEMINI_API_KEY`, it can show retrieved public sources, but it
cannot provide Gemini's grounded synthesis; the result labels this fallback.

The verifier has no app-imposed daily check cap. External providers may still
apply quotas, rate limits, or charges. History and preferences stay in the
browser's local storage; accounts and cross-device sync are not included.

## Image detector

1. Install Python dependencies with `python -m pip install -r requirements.txt`.
2. Set `SIGHTENGINE_USER` and `SIGHTENGINE_SECRET` in `.env`.
3. Start with `streamlit run app.py`.

The uploaded image is sent to Sightengine only after you select **Analyze image**.
Session history contains only the time and result and is cleared when the
Streamlit session ends.

## Tests

In Windows PowerShell, run the web checks with `npm.cmd run lint`, `npm.cmd test`,
and `npm.cmd run build`.
Run the image-detector tests with `python -m unittest discover -s tests -v`.

Analysis results are automated indicators, not proof that an image is real or fake.

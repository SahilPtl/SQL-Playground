# Optional integrations

For this side branch, use [the step-by-step trial guide](GOOGLE_SIGNIN_TRIAL.md): separate checkout, ports **15174/15001**, Google credentials, OpenAI key creation and live test checklist. The standard setup below describes the normal checkout's ports.

No `.env` is needed for local signup, login, SQL, Practice, Interview or Local Coach. Leave `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `OPENAI_API_KEY` blank in `.env.example`. Never prefix secrets with `VITE_`.

## Google OAuth setup (implemented, live flow unverified)

1. In Google Cloud Console, choose your own project, configure the Google Auth Platform consent screen, and add your account as a test user while the app is in testing.
2. Create an OAuth client of type **Web application**. Set the JavaScript origin to `http://localhost:15173` and the authorized redirect URI to `http://localhost:15000/api/auth/google/callback` for this laptop. If using standard ports elsewhere, use frontend 5173 and callback port 5000 consistently.
3. Copy the root `.env.example` to `.env` locally. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the issued values. Keep `GOOGLE_CALLBACK_URL=http://localhost:15000/api/auth/google/callback`. Do not commit `.env`.
4. Stop and restart the demo. The Google button is enabled only when ID, secret and HTTP(S) callback configuration are present; otherwise it is disabled with an explanation.
5. Use Continue with Google. The strategy requests `profile` and `email`, verifies OAuth state, and establishes the same Passport session used by local login.

Callback errors return to the login page with safe error codes for cancellation, incomplete requests, account collisions or a generic failure. If Google rejects an invalid client ID before invoking the callback, the browser is on Google's error page: return to the local login page and use email/password. The application cannot redirect a page controlled by Google.

Accounts are keyed by Google profile ID. Existing local accounts are never silently linked on an email claim. A verified-email collision returns login failure; automatic account linking is not implemented. Missing verified email can produce a Google-only account with a null email. Access/refresh tokens are not stored.

Verified: conditional route registration, authorization redirect construction, denied callback recovery, and continued local login with intentionally invalid configuration. **Unverified: successful Google consent, token exchange and profile retrieval**, because no valid credentials were provided. Setup follows the [Passport strategy documentation](https://www.passportjs.org/packages/passport-google-oauth20/).

## OpenAI (implemented, valid-key flow unverified)

Set `OPENAI_API_KEY` in the server's root `.env`; `OPENAI_MODEL` defaults to `gpt-4.1-mini` and can be changed to an available text model in your account. Express alone sends the request to `/v1/responses`. It uses a six-second abort timeout, 500 output tokens, `store:false`, and a capped response display. This uses the [OpenAI text-generation API](https://developers.openai.com/api/docs/guides/text).

Only the current practice schema and the text the learner explicitly submits are sent. Table data is not fetched for the Coach; hidden tests and other users' workspaces are never supplied. Learners should still avoid placing private data in a question. `store:false` is an API storage choice, not a guarantee about all provider-side retention policies.

Missing/blank key, invalid authentication, rate limits, provider errors, network errors, malformed response, or timeout fall back to **Local Coach**. The provider label is returned by the server and displayed with the response. No raw provider error or credential is returned.

Verified: no-key behavior, deterministic templates, mocked 401/429/500/network failures, a mocked successful response shape, and a real request with a deliberately invalid key that returned Local Coach. **Unverified: successful generation using a valid key.** Mocked success proves the response adapter, not account access or model quality.

Local Coach explains common clauses, flags `SELECT *` and unfiltered writes, gives basic index/grouping hints, explains common SQLite errors, and offers two limited natural-language templates. It explicitly declines unsupported generation requests. It is a rules engine, not an LLM. The server blocks all Coach requests while an unexpired interview attempt is active, even if another browser tab navigates to Practice.

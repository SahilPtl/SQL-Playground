# Google sign-in and local setup

Developed and tested on `feature/google-signin-setup`; the user approved merging after the live Google login succeeded. The same configuration can be used from the main checkout. Keep the filename of this guide for existing links.

Google sign-in needs an **OAuth client ID and client secret**, not a Google API key. The optional **OpenAI API key** is separate and enables model-generated Coach responses. Neither is needed for the offline demo.

## Run the main checkout in VS Code

```powershell
code "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground"
cd "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground"
npm run setup
npm run setup:google
code .env
```

In VS Code choose **Terminal → New Terminal → PowerShell**. Setup has already been run on this laptop; use `npm run dev` for everyday starts and leave that terminal running. `npm run setup` is for a fresh install or native-module repair. `setup:google` creates a blank local configuration only when `.env` does not exist; it never overwrites existing values. Existing configured credentials do not need to be re-entered. Fill new secrets directly in VS Code. `.env` is gitignored.

| Setting         | Configured value                                  |
| --------------- | ------------------------------------------------- |
| Browser         | `http://localhost:15174`                          |
| API             | `http://localhost:15001`                          |
| Google callback | `http://localhost:15001/api/auth/google/callback` |
| Session cookie  | `sql.google-side.sid`                             |
| Data            | This checkout's own `server/data`                 |

The main checkout now uses the same working ports and callback as the trial. Stop the old side checkout before starting main: run `npm run stop` from `SQL-Playground-google-signin`, then run `npm run dev` from `SQL-Playground`. Each checkout retains its own `server/data`; accounts and practice changes are not copied between them. Sign in again when switching checkouts. For simultaneous trials, use distinct ports and cookie names, separate data directories, and register each exact Google callback.

## Create Google OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/), select or create your own project, and open **Google Auth Platform**.
2. Complete **Branding** with an app name such as SQL Playground and your support/contact email. Choose the appropriate **Audience**; for a personal trial use External/Testing and add your Google account under test users if requested.
3. Open **Clients → Create client → Web application**. Name it SQL Playground local trial.
4. Set the JavaScript origin to `http://localhost:15174`. This server redirect flow relies on the authorized redirect URI: set it to exactly `http://localhost:15001/api/auth/google/callback`.
5. Create the client. Save its ID and secret directly in this checkout's `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Keep the existing callback value.

Sources: Google's [client setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server). The app requests only profile and email. Keep downloaded credential JSON outside the repository.

## Restart and try a real login

```powershell
npm run stop
npm run dev
```

Open `http://localhost:15174/login` in your normal browser. **Continue with Google** becomes active after all three Google settings are present and the server restarts. Complete Google's account chooser/consent yourself. A successful callback opens Practice and creates your workspace. Create a table, log out, sign in with the same Google account and check that the table remains.

Use a Google email not already registered through local signup in this side checkout. Existing local accounts are not automatically linked; use the existing password if a collision occurs. The development demo account is separate.

Try cancelling a Google login when Google offers that action. The local page should explain the cancellation. If Google displays an error before calling back, return manually to the local page; the app cannot control Google's error screen.

## Get an OpenAI API key (optional)

For Gemini instead, follow [Gemini SQL Coach setup](OAUTH_AND_AI.md#gemini-sql-coach). A configured Gemini key takes precedence over OpenAI.

1. Sign in to the [OpenAI API platform](https://platform.openai.com/), select your project and open [API keys](https://platform.openai.com/api-keys).
2. Create a new secret key and save it privately. Complete any access/billing setup the platform requires; creating a key alone does not prove usable API access.
3. Fill `OPENAI_API_KEY` in this checkout's `.env`. Keep `OPENAI_MODEL=gpt-4.1-mini` unless you deliberately choose another compatible model available to your project.
4. Restart. In Practice, ask SQL Coach to explain the sample JOIN. A successful provider response is labeled **AI Coach**; failed requests fall back to **Local Coach**.

See the [official OpenAI quickstart](https://developers.openai.com/api/docs/quickstart). Never prefix secrets with `VITE_`; Express reads them. Coach sends submitted practice text and schema to OpenAI, so use sample data. Google login works without an OpenAI key.

## Troubleshooting

| Symptom                    | Check                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Disabled Google button     | Fill ID, secret and callback in this folder's `.env`, then restart.                                             |
| `redirect_uri_mismatch`    | Match the callback exactly in Google Console. The callback uses API port 15001, not frontend port 15174.        |
| Access blocked             | Check project/client, audience and test-user settings; use a normal browser if an embedded browser is rejected. |
| Invalid client             | Use a Web application OAuth client, not a service account or API key.                                           |
| Incomplete/expired request | Start again from Continue with Google, use localhost consistently and allow first-party cookies.                |
| Existing-account message   | Use the existing password; account linking is not implemented.                                                  |
| Coach stays Local Coach    | Check key, model/account access, rate limits and network availability.                                          |
| Port occupied              | Run `npm run stop` from the checkout currently using the ports; it targets only that checkout's controller.     |

## Verification

`npm run check` passes **18 tests**, the client build and static-serving smoke. The four new OAuth tests replace only Google's network transport. Real Passport state verification, profile parsing, account creation, sessions, repeat login, logout, workspace persistence and isolation execute normally. They also cover account collisions, missing/wrong/cross-session/replayed state, cancellation and token failure. No mocked provider is enabled in the running demo.

On 25 September 2026, the live Google flow completed using a locally supplied OAuth client. The browser opened the authenticated Practice page, ran the sample JOIN successfully and retained the session after reload. Credentials remain in the ignored `.env`. **Valid-key OpenAI generation remains unverified**; Google login does not require it.

Automated tests cover repeat login, workspace persistence, cancellation and local login recovery. These simulated-provider tests are distinct from the live Google browser checks described above.

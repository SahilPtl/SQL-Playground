# Google sign-in: side-branch trial

Branch: `feature/google-signin-setup`. Keep it separate until the live trial is complete and you explicitly choose to merge. Main is unchanged by this work.

Google sign-in needs an **OAuth client ID and client secret**, not a Google API key. The optional **OpenAI API key** is separate and enables model-generated Coach responses. Neither is needed for the offline demo.

## Open the isolated checkout

```powershell
code "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground-google-signin"
cd "C:\Users\sahil\OneDrive\Documents\Projects\SQL-Playground-google-signin"
npm run setup
npm run setup:google
code .env
```

Setup has already been run on this laptop. `setup:google` creates a blank local configuration only when `.env` does not exist; it never overwrites existing values. Fill secrets directly in VS Code, never in chat, screenshots or shell commands. `.env` is gitignored.

| Setting         | Side-branch value                                 |
| --------------- | ------------------------------------------------- |
| Browser         | `http://localhost:15174`                          |
| API             | `http://localhost:15001`                          |
| Google callback | `http://localhost:15001/api/auth/google/callback` |
| Session cookie  | `sql.google-side.sid`                             |
| Data            | This checkout's own `server/data`                 |

The normal checkout uses 15173/15000 on this laptop. Cookies do not have port boundaries, so this trial uses a different cookie name as well as separate ports and files. Do not point DATA_DIR at the main checkout's data.

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
| Port occupied              | Run `npm run stop` from this side checkout; it targets only this checkout's controller.                         |

## Verification and merge decision

`npm run check` passes **18 tests**, the client build and static-serving smoke. The four new OAuth tests replace only Google's network transport. Real Passport state verification, profile parsing, account creation, sessions, repeat login, logout, workspace persistence and isolation execute normally. They also cover account collisions, missing/wrong/cross-session/replayed state, cancellation and token failure. No mocked provider is enabled in the running demo.

**Real Google consent/token exchange and valid-key OpenAI generation remain unverified** until credentials are supplied locally and the live trial is completed. Simulated-provider success is not a live Google success claim.

Before choosing to merge, verify real Google sign-in and persistence; cancellation; local login still works; both localhost checkouts stay signed in independently; and the AI Coach label if configured. Leave the branch unmerged until you approve the result.

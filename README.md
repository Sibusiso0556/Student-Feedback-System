# Student Feedback Automation System

React form → n8n Webhook → validation → rating classification → Google Sheets → acknowledgement email → JSON response back to React.

```
React form --POST JSON--> n8n Webhook --> Validate --> IF valid?
                                              no -> Respond 400
                                              yes -> IF rating <= 2 -> "Needs Attention" | else "Positive"
                                                  -> Google Sheets append (error -> Respond 500)
                                                  -> Send email       (error -> Respond 502, saved: true)
                                                  -> Respond 200
```

The webhook uses **Respond to Webhook** mode, so React only sees success after Sheets and email have finished.

## Prerequisites
Node.js 18+, an n8n instance (cloud or self-hosted), a Google account, and SMTP credentials (e.g. Gmail app password, Brevo, Mailgun).

## 1. Run the frontend
```bash
npm install
cp .env.example .env     # then paste your webhook URL
npm run dev
```
`VITE_N8N_WEBHOOK_URL` — Test URL while developing: `https://YOUR-N8N/webhook-test/student-feedback`. The test URL only works after you click **Listen for test event** (or Execute workflow) and handles one request. Production URL (`/webhook/student-feedback`) works only when the workflow is **Active**. Restart `npm run dev` after editing `.env`.

## 2. Google Sheets
1. Create a spreadsheet **Student Feedback Database** with a worksheet **Feedback Responses**.
2. Row 1 headers, exactly: `Student Name | Email | Course Name | Rating | Feedback Message | Status | Submitted At`.
3. In n8n: Credentials → New → Google Sheets OAuth2 → sign in.

## 3. Email
In n8n: Credentials → New → SMTP (host, port, user, password). Set the same address as the **From Email** in the email node.

## 4. Import and configure the workflow
1. n8n → Workflows → Import from File → `n8n/student-feedback-workflow.json`.
2. **Google Sheets: Append Feedback**: pick your credential, document and sheet. Check the column mapping appears (click the refresh icon on the columns if empty).
3. **Email: Send Acknowledgement**: pick the SMTP credential and set **From Email**.
4. Run a test with `n8n/sample-payloads.json` (inspect Webhook output to confirm fields sit under `body`), then toggle **Active**.
5. Switch `.env` to the production URL.

Credentials are intentionally not in the JSON. I could not verify this JSON against your n8n version (written for Webhook v2, IF v2, Set v3.4, Google Sheets v4.5, Send Email v2.1). If a node shows as unknown, delete and re-add it, then re-apply the expressions listed in the node names.

## Data contract
`{ studentName, email, courseName, rating (1-5 number), feedbackMessage }`. Status: rating ≤ 2 → `Needs Attention`, otherwise `Positive`. `submittedAt` is UTC ISO 8601. Text beginning with `= + - @` gets a leading `'` before it is stored to block spreadsheet formula injection.

## Partial failures and duplicates
- Sheets fails → 500, nothing saved, React keeps the form data so the student can retry.
- Sheets succeeds, email fails → 502 with `saved: true`. React shows a warning and does **not** invite resubmission, avoiding a duplicate row. Recovery: find the execution in n8n's Executions list and send the email manually, or add an error workflow (Workflow settings → Error workflow) to alert you.
- Double-clicks are blocked in React. Server-side idempotency (a submission ID checked against the sheet) is **not** implemented; known limitation.

## Test plan
Send each with `curl -X POST <url> -H "Content-Type: application/json" -d @file` or via the form. Check browser message, n8n execution, sheet row, inbox.

| # | Input | Expected | Row | Email |
|---|-------|----------|-----|-------|
| 1-3 | rating 5 / 4 / 3 | 200, `Positive` | yes | yes |
| 4-5 | rating 2 / 1 | 200, `Needs Attention` | yes | yes |
| 6-9 | empty name / bad email / no course / empty message | form error; direct POST gives 400 | no | no |
| 10 | rating 0 or 6 | form blocks; direct POST gives 400 | no | no |
| 11 | n8n stopped / wrong URL | "Could not reach the server…" and data kept | no | no |
| 12 | disconnect Sheets credential | 500 message, data kept | no | no |
| 13 | break SMTP credential | 502, warning shown, form cleared | yes | no |
| 14 | double-click Submit | one request in n8n Executions | one | one |

None of these have been executed by me; run them and record your results.

## Troubleshooting
- **CORS error**: the Webhook node sets Allowed Origins to `*`; restrict it to your site's origin in production. CORS is not authentication.
- **404 on webhook**: test URL used without listening, or production URL used while inactive.
- **Fields undefined in n8n**: payload is under `$json.body`, not `$json`.
- **Sheets permission/auth error**: reconnect the OAuth credential and make sure the account can edit the sheet.
- **Email auth error**: use an app password / SMTP key, not your login password.
- **Frontend hangs**: the response node never ran; check the execution for an unconnected branch.

## Deployment and security
Deploy `npm run build` output (`dist/`) to Netlify/Vercel/GitHub Pages and set `VITE_N8N_WEBHOOK_URL` in their environment settings. `VITE_` variables are visible in the built bundle, so the webhook URL is public: add rate limiting (reverse proxy), a header secret or CAPTCHA before real use, and use HTTPS. Never put SMTP or Google secrets in React.

## Rubric alignment
| Criterion | How the project meets it |
|-----------|--------------------------|
| Front-End Design | Branded header, clean card layout, star rating with labels, inline validation, loading/success/error states, responsive down to mobile, visible keyboard focus, reduced-motion support. |
| n8n Workflow Design | Left-to-right flow with descriptive node names and four colour-coded sticky notes (Receive & validate, Classify, Store, Notify & respond). One validation node, one shared Sheets node and one email node, with no duplicated steps. |
| Conditional Logic | Two IF nodes: valid vs invalid (invalid → 400, nothing stored) and rating ≤ 2 → `Needs Attention`, else `Positive`. All five ratings plus out-of-range values (0, 6) are covered by the test table. |
| Automated Notifications | Required subject and body, personalised with name, course and rating, plus a line that adapts to low vs high ratings. Sent as plain text so user input can't inject markup. Retries up to 3 times; if it still fails the student sees a clear message and the feedback stays saved. |

# Student Feedback Automation System

An automated student feedback system built with **React, n8n, Google Sheets, and SMTP email**. Students can submit feedback through a React form, while n8n validates submissions, classifies ratings, stores responses in Google Sheets, and sends acknowledgement emails.

## Overview

The application follows this workflow:

```text
React Form
    |
    | POST JSON
    v
n8n Webhook
    |
    v
Validate Input
    |
    +---- Invalid ----> Respond 400 Bad Request
    |
    v
Classify Rating
    |
    +---- Rating <= 2 ----> Needs Attention
    |
    +---- Rating > 2 -----> Positive
    |
    v
Append Feedback to Google Sheets
    |
    +---- Failure -------> Respond 500 Internal Server Error
    |
    v
Send Acknowledgement Email
    |
    +---- Failure -------> Respond 502 Bad Gateway
    |                       saved: true
    |
    v
Respond 200 OK
```

The webhook uses **Respond to Webhook** mode. The frontend receives a successful response only after the Google Sheets operation and acknowledgement email have completed.

## Features

- Responsive React form with a clean, user-friendly interface.
- Star-based rating system with descriptive labels.
- Client-side and server-side input validation.
- Automatic classification of feedback based on ratings.
- Google Sheets integration for storing submissions.
- Personalised acknowledgement emails.
- Clear success, validation, and error messages.
- Protection against spreadsheet formula injection.
- Prevention of accidental duplicate submissions caused by double-clicking.
- Error handling for failed spreadsheet and email operations.
- Support for local development and production deployment.

## Prerequisites

Before setting up the project, ensure you have:

- Node.js 18 or later.
- npm.
- An n8n instance (cloud-hosted or self-hosted).
- A Google account with access to Google Sheets.
- SMTP credentials from a provider such as Gmail, Brevo, or Mailgun.

## 1. Run the React Frontend

Install the project dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Open `.env` and configure the n8n webhook URL:

```env
VITE_N8N_WEBHOOK_URL=https://YOUR-N8N/webhook-test/student-feedback
```

Replace the example URL with your actual n8n webhook URL.

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

### Test and Production Webhook URLs

**Test URL**

```text
https://YOUR-N8N/webhook-test/student-feedback
```

The test URL works when the workflow is listening for a test event. Depending on your n8n version and execution mode, it may handle only the request associated with the active test listener.

**Production URL**

```text
https://YOUR-N8N/webhook/student-feedback
```

The production URL requires the workflow to be **Active**.

> **Important:** Restart the development server after changing `.env` so Vite loads the updated environment variables.

## 2. Configure Google Sheets

### Create the Spreadsheet

1. Create a Google spreadsheet named **Student Feedback Database**.
2. Create a worksheet named **Feedback Responses**.
3. Add the following headers to the first row, using the exact names and order shown below.

| Column | Header |
|---|---|
| A | Student Name |
| B | Email |
| C | Course Name |
| D | Rating |
| E | Feedback Message |
| F | Status |
| G | Submitted At |

### Connect Google Sheets to n8n

1. Open n8n.
2. Navigate to **Credentials** and create a Google Sheets OAuth2 credential.
3. Sign in to Google and authorize access.
4. Save the credential.
5. Select it in the workflow's **Google Sheets: Append Feedback** node.

Ensure that the connected Google account has permission to edit the spreadsheet.

## 3. Configure SMTP Email

The system sends an acknowledgement email after saving feedback.

1. Open n8n and navigate to **Credentials**.
2. Create a new SMTP credential.
3. Enter your SMTP host, port, username, and password.
4. Save the credential.
5. Select it in the **Email: Send Acknowledgement** node.
6. Configure the **From Email** field to use an address authorized by your SMTP provider.

For Gmail, use an appropriate app password where required. Other providers may require an SMTP key or provider-specific credentials.

## 4. Import and Configure the n8n Workflow

### Import the Workflow

1. Open n8n.
2. Navigate to **Workflows**.
3. Select **Import from File**.
4. Import the following file:

   `n8n/student-feedback-workflow.json`

### Configure the Google Sheets Node

Open **Google Sheets: Append Feedback** and:

- Select your Google Sheets credential.
- Select the **Student Feedback Database** spreadsheet.
- Select the **Feedback Responses** worksheet.
- Verify that all seven columns map to the correct values.
- Refresh the column list if the fields do not appear.

### Configure the Email Node

Open **Email: Send Acknowledgement** and:

- Select your SMTP credential.
- Set the sender address in **From Email**.
- Verify the recipient address.
- Check the email subject and body expressions.
- Confirm that the email is personalised using the student's name, course, and rating.

### Test and Activate the Workflow

1. Open the imported workflow.
2. Start a test execution or listen for a test webhook event.
3. Send a sample submission using `n8n/sample-payloads.json`.
4. Inspect the Webhook node output to confirm that incoming fields are available under `$json.body`.
5. Verify that the rating is classified correctly.
6. Confirm that the submission appears in Google Sheets.
7. Check that the acknowledgement email arrives.
8. Verify that the workflow returns the expected JSON response.
9. Activate the workflow.
10. Update `.env` to use the production webhook URL.

**Compatibility note:** The workflow JSON was written for the following node versions:

- Webhook v2
- IF v2
- Set v3.4
- Google Sheets v4.5
- Send Email v2.1

The workflow has not been verified against every n8n version. If a node is reported as unknown or unsupported, replace it with the equivalent node available in your version and reconfigure its parameters and expressions.

Credentials are intentionally excluded from the workflow JSON and must be configured separately.

## 5. Data Contract and Validation

### Incoming Request

The React frontend sends a JSON object containing:

```json
{
  "studentName": "Jane Doe",
  "email": "jane@example.com",
  "courseName": "Software Development",
  "rating": 5,
  "feedbackMessage": "The course was informative and engaging."
}
```

### Field Requirements

| Field | Requirement |
|---|---|
| `studentName` | Required; must not be empty |
| `email` | Required; must contain a valid email address |
| `courseName` | Required; must not be empty |
| `rating` | Required number from 1 to 5 |
| `feedbackMessage` | Required; must not be empty |

Invalid submissions are rejected with HTTP `400 Bad Request` and are not stored or emailed.

### Rating Classification

| Rating | Classification |
|---|---|
| 1–2 | `Needs Attention` |
| 3–5 | `Positive` |

### Submission Timestamp

The `submittedAt` value is generated in UTC using ISO 8601 format.

Example:

```text
2026-10-15T12:30:00.000Z
```

### Spreadsheet Formula Injection Protection

Before storing text in Google Sheets, values beginning with any of the following characters are prefixed with an apostrophe:

```text
= + - @
```

This helps prevent user-supplied text from being interpreted as spreadsheet formulas.

## 6. Error Handling and Partial Failures

The workflow handles failures according to the stage at which they occur.

| Scenario | HTTP Status | Feedback Saved? | Email Sent? |
|---|---:|---|---|
| Invalid submission | 400 | No | No |
| Google Sheets failure | 500 | Not confirmed | No |
| Email failure after saving | 502 | Yes | No |
| Successful submission | 200 | Yes | Yes |

### Google Sheets Failure

If Google Sheets fails to save the submission:

- The workflow returns HTTP `500`.
- The frontend displays an error message.
- The form retains the student's data so they can retry.
- No successful save is reported.

### Email Failure

If Google Sheets saves the feedback but the email fails:

- The workflow returns HTTP `502`.
- The response indicates `saved: true`.
- The frontend displays a warning that the feedback was saved but the acknowledgement email could not be sent.
- The form is cleared to discourage the student from resubmitting the same feedback.

To recover, locate the failed execution in n8n's **Executions** list and send the acknowledgement email manually. Alternatively, configure an error workflow to notify an administrator.

### Duplicate Submissions

The React frontend blocks repeated clicks on the Submit button while a request is in progress.

However, **server-side idempotency is not implemented**. Repeated requests, network retries, or submissions from different clients may create duplicate rows. A future improvement would be to assign each submission a unique ID and check it before inserting a row.

## 7. Testing Plan

Run these tests using the frontend or `curl`. Replace `<webhook-url>` with the appropriate test or production URL.

Example command:

```bash
curl -X POST "<webhook-url>" \
  -H "Content-Type: application/json" \
  -d @n8n/sample-payloads.json
```

Use a file containing a single JSON object for each individual test.

| Test | Input or Scenario | Expected Result | Sheet Row | Email |
|---|---|---|---|---|
| 1 | Rating 5 | HTTP 200, `Positive` | Yes | Yes |
| 2 | Rating 4 | HTTP 200, `Positive` | Yes | Yes |
| 3 | Rating 3 | HTTP 200, `Positive` | Yes | Yes |
| 4 | Rating 2 | HTTP 200, `Needs Attention` | Yes | Yes |
| 5 | Rating 1 | HTTP 200, `Needs Attention` | Yes | Yes |
| 6 | Empty student name | Validation error; direct POST returns 400 | No | No |
| 7 | Invalid email | Validation error; direct POST returns 400 | No | No |
| 8 | Missing course name | Validation error; direct POST returns 400 | No | No |
| 9 | Empty feedback message | Validation error; direct POST returns 400 | No | No |
| 10 | Rating 0 or 6 | Rejected; direct POST returns 400 | No | No |
| 11 | n8n unavailable or incorrect URL | Connection error; form data retained | No | No |
| 12 | Invalid Google Sheets credentials | HTTP 500; form data retained | No | No |
| 13 | Invalid SMTP credentials | HTTP 502; warning displayed; feedback retained in Sheets | Yes | No |
| 14 | Double-click Submit | One request during the in-progress state | One | One |

**Testing status:** These tests have not yet been executed. Run them in your environment and record the actual results before treating the workflow as verified.

## 8. Troubleshooting

### CORS Errors

- Check the Webhook node's **Allowed Origins** configuration.
- Configure the frontend's actual origin instead of allowing every origin in production.
- Remember that CORS is not authentication and does not prevent direct requests to a public webhook.

### Webhook Returns 404

- Confirm that you are using the test URL only while the workflow is listening for a test event.
- Confirm that the workflow is active when using the production URL.
- Verify the webhook path and HTTP method.

### Fields Are Undefined in n8n

The incoming request body is generally available under:

```javascript
$json.body
```

Check the Webhook node's output and update downstream expressions to match the actual data structure.

### Google Sheets Authentication Errors

- Reconnect the Google Sheets OAuth2 credential.
- Confirm that the connected account can edit the spreadsheet.
- Verify that the correct document and worksheet are selected.

### SMTP Authentication Errors

- Check the SMTP hostname and port.
- Verify the username and password or provider-specific SMTP key.
- Use an app password where required.
- Confirm that the sender address is authorized.

### Frontend Hangs or Never Receives a Response

- Inspect the n8n execution for failed nodes.
- Check that every relevant success and error branch reaches an appropriate response node.
- Verify that the Webhook node is configured to use **Respond to Webhook** mode.
- Check that no execution path terminates before sending the response.

## 9. Deployment and Security

### Deploy the React Frontend

Build the production application:

```bash
npm run build
```

The generated static files are placed in the `dist/` directory.

Deploy this directory to a static hosting provider such as Netlify, Vercel, or GitHub Pages.

Configure `VITE_N8N_WEBHOOK_URL` in the hosting provider's environment settings using the production webhook URL.

### Security Recommendations

Before making the application publicly available:

- **Use HTTPS** for the frontend and webhook endpoint.
- **Restrict CORS** to the trusted frontend origin.
- **Apply rate limiting** using a reverse proxy or suitable infrastructure.
- **Consider CAPTCHA or equivalent abuse protection** for public submissions.
- **Add appropriate authentication or request verification** where practical.
- **Protect student information** by limiting spreadsheet access to authorised users.
- **Never place SMTP passwords, Google credentials, or other private secrets in React environment variables.**

Variables prefixed with `VITE_` are exposed to the frontend bundle. The webhook URL should therefore be treated as public.

## 10. Project Rubric Alignment

| Criterion | Implementation |
|---|---|
| Front-End Design | Branded header, clean card layout, labelled star ratings, inline validation, loading/success/error states, responsive mobile layout, visible keyboard focus, and reduced-motion support. |
| n8n Workflow Design | Left-to-right workflow with descriptive node names and four colour-coded sticky notes: Receive & Validate, Classify, Store, and Notify & Respond. Shared Google Sheets and email nodes avoid duplicated processing steps. |
| Conditional Logic | One validation decision separates valid and invalid submissions. A second IF node classifies ratings of 1–2 as `Needs Attention` and ratings of 3–5 as `Positive`. Tests cover all five valid ratings and out-of-range values. |
| Automated Notifications | Personalised acknowledgement email containing the student's name, course, and rating, with content adapted to the rating category. Plain-text email content reduces markup-injection risks. Retries are configured for up to three attempts; persistent failures are handled separately. |

## 11. Future Improvements

Potential enhancements include:

- Server-side idempotency to prevent duplicate submissions.
- Automated alerts for failed acknowledgement emails.
- A feedback dashboard with rating summaries and trends.
- Improved retry and recovery mechanisms.
- Authentication and stronger abuse prevention.
- Automated integration tests for the React frontend and n8n workflow.

## License

Add your preferred license information here if you intend to distribute the project publicly.

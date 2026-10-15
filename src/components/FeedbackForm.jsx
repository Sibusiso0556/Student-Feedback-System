import { useRef, useState } from "react";
import RatingInput from "./RatingInput.jsx";
import SubmissionStatus from "./SubmissionStatus.jsx";
import { LIMITS, toPayload, validateFeedback } from "../utils/validation.js";
import { submitFeedback } from "../services/feedbackService.js";

const EMPTY = { studentName: "", email: "", courseName: "", rating: 0, feedbackMessage: "" };
const SUCCESS_TEXT = "Thank you for your feedback! Your response has been received successfully.";

export default function FeedbackForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const inFlight = useRef(false);
  const submitting = status.state === "submitting";
  const done = status.state === "success" || status.state === "warning";

  const setField = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (inFlight.current) return;

    const found = validateFeedback(values);
    setErrors(found);
    if (Object.keys(found).length) {
      setStatus({ state: "error", message: "Fix the highlighted fields and submit again." });
      return;
    }

    inFlight.current = true;
    setStatus({ state: "submitting", message: "" });
    try {
      const result = await submitFeedback(toPayload(values));
      if (result.ok) {
        setValues(EMPTY);
        setStatus({ state: "success", message: SUCCESS_TEXT });
      } else if (result.saved) {
        setValues(EMPTY);
        setStatus({ state: "warning", message: result.message });
      } else {
        setStatus({ state: "error", message: result.message });
      }
    } finally {
      inFlight.current = false;
    }
  }

  const field = (id, label, input, error) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {input}
      {error && <p id={`${id}-error`} className="error-text">{error}</p>}
    </div>
  );
  const common = (id) => ({
    id, disabled: submitting, "aria-invalid": errors[id] ? "true" : undefined,
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
  });

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      {done ? (
        <SubmissionStatus state={status.state} message={status.message} onReset={() => setStatus({ state: "idle", message: "" })} />
      ) : (
        <>
          {field("studentName", "Student name",
            <input type="text" autoComplete="name" value={values.studentName} onChange={setField("studentName")} {...common("studentName")} />, errors.studentName)}
          {field("email", "Email address",
            <input type="email" autoComplete="email" value={values.email} onChange={setField("email")} {...common("email")} />, errors.email)}
          {field("courseName", "Course name",
            <input type="text" placeholder="e.g. Web Development" value={values.courseName} onChange={setField("courseName")} {...common("courseName")} />, errors.courseName)}
          <RatingInput value={values.rating} disabled={submitting} error={errors.rating}
            onChange={(n) => { setValues((v) => ({ ...v, rating: n })); setErrors((er) => ({ ...er, rating: undefined })); }} />
          {field("feedbackMessage", "Feedback message",
            <textarea rows={5} placeholder="What worked well? What could be better?"
              value={values.feedbackMessage} onChange={setField("feedbackMessage")} {...common("feedbackMessage")} />, errors.feedbackMessage)}
          <p className="counter">{values.feedbackMessage.length}/{LIMITS.message}</p>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Submitting feedback..." : "Submit feedback"}
          </button>
          <SubmissionStatus state={status.state} message={status.message} />
        </>
      )}
    </form>
  );
}

export default function SubmissionStatus({ state, message, onReset }) {
  if (state === "idle") return <div role="status" aria-live="polite" />;
  const isError = state === "error";
  return (
    <div role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"} className={`status ${state}`}>
      <p>{state === "submitting" ? "Submitting feedback..." : message}</p>
      {(state === "success" || state === "warning") && (
        <button type="button" className="btn secondary" onClick={onReset}>Submit another response</button>
      )}
    </div>
  );
}

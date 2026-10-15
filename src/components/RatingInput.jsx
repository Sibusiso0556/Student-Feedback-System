export const RATING_LABELS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function RatingInput({ value, onChange, error, disabled }) {
  return (
    <fieldset className="field rating" disabled={disabled} aria-describedby={error ? "rating-error" : undefined}>
      <legend>Rating</legend>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= value ? "star on" : "star"}>
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{n} out of 5, {RATING_LABELS[n - 1]}</span>
          </label>
        ))}
        <span className="rating-text" aria-live="polite">
          {value ? `${value}/5 · ${RATING_LABELS[value - 1]}` : "Select a rating"}
        </span>
      </div>
      {error && <p id="rating-error" className="error-text">{error}</p>}
    </fieldset>
  );
}

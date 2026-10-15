export default function Header() {
  return (
    <header className="site-header">
      <div className="brand">
        <svg className="logo" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path fill="currentColor" d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v3.6c0 1.5 3.1 3.2 7 3.2s7-1.7 7-3.2v-3.6l-7 3.8-7-3.8z" />
        </svg>
        <div>
          <h1>Student Feedback Portal</h1>
          <p>Your feedback helps us improve.</p>
        </div>
      </div>
    </header>
  );
}

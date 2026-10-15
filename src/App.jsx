import Header from "./components/Header.jsx";
import FeedbackForm from "./components/FeedbackForm.jsx";

export default function App() {
  return (
    <>
      <Header />
      <main className="page">
        <section className="intro">
          <h2>Share Your Learning Experience</h2>
          <p>Tell us about your course experience. Your feedback helps us make our training better.</p>
        </section>
        <FeedbackForm />
      </main>
    </>
  );
}

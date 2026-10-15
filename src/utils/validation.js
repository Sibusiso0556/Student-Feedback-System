export const LIMITS = { name: 100, course: 150, message: 1000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateFeedback(v) {
  const errors = {};
  const name = v.studentName.trim();
  const email = v.email.trim();
  const course = v.courseName.trim();
  const message = v.feedbackMessage.trim();

  if (!name) errors.studentName = "Enter your name.";
  else if (name.length > LIMITS.name) errors.studentName = `Keep your name under ${LIMITS.name} characters.`;
  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address, like jane@example.com.";
  if (!course) errors.courseName = "Enter the course name.";
  else if (course.length > LIMITS.course) errors.courseName = `Keep the course name under ${LIMITS.course} characters.`;
  if (!Number.isInteger(v.rating) || v.rating < 1 || v.rating > 5) errors.rating = "Choose a rating from 1 to 5.";
  if (!message) errors.feedbackMessage = "Write a feedback message.";
  else if (message.length > LIMITS.message) errors.feedbackMessage = `Keep your message under ${LIMITS.message} characters.`;
  return errors;
}

export function toPayload(v) {
  return {
    studentName: v.studentName.trim(),
    email: v.email.trim(),
    courseName: v.courseName.trim(),
    rating: v.rating,
    feedbackMessage: v.feedbackMessage.trim(),
  };
}

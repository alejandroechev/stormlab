/**
 * Feedback button — opens a Google Form in a new tab.
 * Replace FORM_URL with the actual published Google Form link.
 */

const FORM_URL =
  import.meta.env.VITE_FEEDBACK_URL ||
  "https://docs.google.com/forms/d/e/1FAIpQLScgxE72NCOusF_6VMx6tVgkPmTSHplSdYVgswuxPinI4mbnOQ/viewform";

export function FeedbackButton() {
  return (
    <a
      href={FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="feedback-btn"
      title="Send feedback — tell us what's missing!"
    >
      💬 Feedback
    </a>
  );
}

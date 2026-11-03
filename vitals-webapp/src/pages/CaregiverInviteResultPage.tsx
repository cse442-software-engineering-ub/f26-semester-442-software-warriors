import { useLocation, useNavigate } from "react-router-dom";
import "./CaregiverInviteResultPage.css";

const CaregiverInviteResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);

  const status = params.get("status");
  const reason = params.get("reason");

  const accepted = status === "accepted";

  let title = "Invalid Invitation";
  let message =
    "This caregiver invitation is invalid. Please ask the patient to send you a new invitation.";

  if (reason === "expired") {
    title = "Invitation Expired";
    message =
      "This caregiver invitation has expired. Please ask the patient to send you a new invitation.";
  }

  if (reason === "used") {
    title = "Invitation Already Used";
    message =
      "This caregiver invitation has already been accepted and cannot be used again.";
  }

  if (reason === "missing") {
    title = "Invitation Not Found";
    message =
      "The caregiver invitation link is missing the information needed to continue.";
  }

  if (accepted) {
    title = "Invitation Accepted";
    message =
      "You have successfully been added as a caregiver. You can now view the patient's health information.";
  }

  return (
    <div className="caregiver-invite-result-page">

      <aside className="caregiver-invite-brand">
        <div className="caregiver-invite-logo">
          <svg
            viewBox="0 0 40 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M1 12h7l3-8 5 16 5-12 4 8 3-4h11" />
          </svg>

          <span>VITALS</span>
        </div>
      </aside>

      <main className="caregiver-invite-main">

        <section className="caregiver-invite-card">

          <div
            className={
              accepted
                ? "caregiver-invite-icon caregiver-invite-icon-success"
                : "caregiver-invite-icon caregiver-invite-icon-error"
            }
            aria-hidden="true"
          >
            {accepted ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 7v6" />
                <path d="M12 17h.01" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            )}
          </div>

          <p className="caregiver-invite-label">
            CAREGIVER INVITATION
          </p>

          <h1>{title}</h1>

          <p className="caregiver-invite-message">
            {message}
          </p>

          <button
            className="caregiver-invite-button"
            type="button"
            onClick={() =>
              navigate(accepted ? "/dashboard" : "/login")
            }
          >
            {accepted ? "Go to Home" : "Go to Login"}
          </button>

        </section>

      </main>

    </div>
  );
};

export default CaregiverInviteResultPage;
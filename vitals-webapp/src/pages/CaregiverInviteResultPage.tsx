import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SplitLayout from "../components/Layout";
import Button from "../components/Button";
import VitalLogo from "../assets/logo.png";

const CaregiverInviteResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);

  const status = params.get("status");
  const reason = params.get("reason");

  const accepted = status === "accepted";
  const alreadyUsed = reason === "used";
  const expired = reason === "expired";
  const missing = reason === "missing";

  let title = "Invalid Caregiver Invitation";
  let message =
    "This caregiver invitation is invalid. Please ask the patient to send you a new invitation.";
  let buttonText = "Go to Login";
  let buttonPath = "/login";

  if (accepted) {
    title = "You're now a caregiver!";
    message = "Caregiver invitation accepted successfully.";
    buttonText = "Go to your patient's Home";
    buttonPath = "/dashboard";
  }
  else if (alreadyUsed) {
    title = "Invitation already used";
    message =
      "This caregiver invitation has already been accepted and cannot be used again.";
    buttonText = "Go to Login";
    buttonPath = "/login";
  }
  else if (expired) {
    title = "Invitation expired";
    message =
      "This caregiver invitation has expired. Please ask the patient to send you a new invitation.";
  }
  else if (missing) {
    title = "Invitation not found";
    message =
      "The caregiver invitation link is missing the information needed to continue.";
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SplitLayout
        left_css="auth-left-panel"
        right_css="auth-right-panel"
        mobileBrand
        leftContent={
          <div className="leftWrap">
            <div className="leftBox">

              <img
                src={VitalLogo}
                alt="VITALS Logo"
                className="logoImg"
              />

              <div className="infoText">
                <h1 className="leftTitle">
                  Caregiver Invitation
                </h1>

                <p className="leftSubtitle">
                  Accepting links your account to your patient, so you can
                  follow their readings, medications and appointments.
                </p>
              </div>

            </div>
          </div>
        }
        rightContent={
          <div className="formBox">

            <div className="text-center">
              <h2 className="formTitle">
                {title}
              </h2>

              <h3 className="formSubtitle">
                {message}
              </h3>
            </div>

            <Button
              type="button"
              variant="primary"
              className="submitBtn"
              onClick={() => navigate(buttonPath)}
            >
              {buttonText}
            </Button>

          </div>
        }
      />
    </div>
  );
};

export default CaregiverInviteResultPage;
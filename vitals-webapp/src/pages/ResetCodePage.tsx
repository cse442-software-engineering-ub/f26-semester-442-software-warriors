// src/pages/ResetCodePage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SplitLayout from "../components/Layout";
import InputField from "../components/InputField";
import Button from "../components/Button";
import VitalLogo from "../assets/logo.png";
import RegisterIcon from "../assets/register_page_icon.png";

const ResetCodePage: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [overflow, setOverflow] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const tooLong = digits.length > 8;
    setCode(tooLong ? digits.slice(0, 8) : digits);
    setOverflow(tooLong);
    setError(tooLong ? "Character limit exceeded." : "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (overflow) {
      setError("Character limit exceeded.");
      return;
    }
    if (!code) {
      setError("This field is required");
      return;
    }
    try {
      const res = await fetch("api/verify_otp.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code }),
      });
      const data = await res.json();
      if (data.status === "success") {
        navigate("/new-password");
      } else {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  };


  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SplitLayout
        left_css="leftPanel"
        right_css="rightPanel"
        leftContent={
          <div className="leftWrap">
            <div className="leftBox">
              <img
                src={VitalLogo}
                alt="Vital Logo Illustration"
                className="logoImg"
              />
              <div className="infoText">
                <h1 className="leftTitle">
                  Track and Manage Your Health, Effortlessly.
                </h1>
                <p className="leftSubtitle">
                  Sign in to view your vitals, medication schedule, and
                  upcoming appointments. All in one place.
                </p>
              </div>
              <img
                src={RegisterIcon}
                alt="Blood Pressure 120/80 updated today and Lisinopril (10mg): Taken at 8:00 AM"
                className="previewImg"
              />
            </div>
          </div>
        }
        rightContent={
          <div className="formBox">
            <h2 className="formTitle">Reset Code</h2>
            <h3 className="formSubtitle">
              Enter the code we sent to your email address to be directed to set
              your new password.
            </h3>
            <form onSubmit={handleSubmit} noValidate>
              <InputField
                label="Enter Reset Code"
                type="text"
                name="code"
                value={code}
                onChange={handleChange}
                placeholder="12345678"
                error={error}
              />

              <Button
                type="submit"
                variant="primary"
                className="submitBtn"
              >
                Submit Reset Code
              </Button>

              <div className="btnRow">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => navigate("/forgot-password")}
                >
                  Re-Send Code
                </button>
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => navigate("/login")}
                >
                  Back to Login
                </button>
              </div>
            </form>

            <p className="helpNote">
              Didn't receive a code yet? It may take a moment. If you do not
              receive within 10 minutes, click the resend code button above.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default ResetCodePage;

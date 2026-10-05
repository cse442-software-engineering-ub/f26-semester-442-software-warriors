// src/pages/ForgotPasswordPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SplitLayout from "../components/Layout";
import InputField from "../components/InputField";
import Button from "../components/Button";
import VitalLogo from "../assets/logo.png";
import RegisterIcon from "../assets/register_page_icon.png";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const [overflow, setOverflow] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const tooLong = raw.length > 254;
    setEmail(tooLong ? raw.slice(0, 254) : raw);
    setOverflow(tooLong);
    setError(tooLong ? "Character limit exceeded." : "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (overflow) {
      setError("Character limit exceeded.");
      return;
    }
    const value = email.trim();
    if (!value) {
      setError("This field is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Please enter a valid email address");
      return;
    }
    
    try {
    const res = await fetch("api/forgot_password.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      if (data.status === "success") {
        navigate("/reset-code", { state: { email: value } });
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
            <h2 className="formTitle">
              Forgot Password?
            </h2>
            <h3 className="formSubtitle">
              No worries, enter your account's email here and we'll send you a
              link to reset it
            </h3>
            <form onSubmit={handleSubmit} noValidate>
              <InputField
                label="Email Address"
                type="email"
                name="email"
                value={email}
                onChange={handleChange}
                placeholder="example.address@email.com"
                error={error}
              />

              <Button
                type="submit"
                variant="primary"
                className="submitBtn"
              >
                Send Reset Code
              </Button>

              <div className="btnRow">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => navigate("/register")}
                >
                  Create Account
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
              Don't have an account yet? You can create one! Or, head back to
              login if you remembered your password after all.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default ForgotPasswordPage;

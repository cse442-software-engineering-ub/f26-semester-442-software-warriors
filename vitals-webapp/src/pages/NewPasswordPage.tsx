// src/pages/NewPasswordPage.tsx
import React, { useState } from "react";
import SplitLayout from "../components/Layout";
import InputField from "../components/InputField";
import Button from "../components/Button";
import VitalLogo from "../assets/logo.png";
import RegisterIcon from "../assets/register_page_icon.png";
import "./forgotPass.css";

const NewPasswordPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // BACKEND: send the new password to the backend to update the account.
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
            <h2 className="formTitle">Set New Password</h2>
            <h3 className="formSubtitle">
              Please enter your new password below.
            </h3>
            <form onSubmit={handleSubmit} noValidate>
              <InputField
                label="New Password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <InputField
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button type="submit" variant="primary" className="submitBtn">
                Set Password
              </Button>
            </form>

            <p className="helpNote">
              Create a new password for your account. Use at least 8
              characters, including at least one number.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default NewPasswordPage;

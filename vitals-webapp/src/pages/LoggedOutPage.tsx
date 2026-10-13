// src/pages/LoggedOutPage.tsx
// "You're Logged Out!" page (Figma: vitals-logout-desktop / Logout-Mobile), card #56.
// It only shows a message; the actual logout already happened in LogoutButton.
import React from "react";
import { Link } from "react-router-dom";
import SplitLayout from "../components/Layout";
import VitalLogo from "../assets/logo.png";
import RegisterIcon from "../assets/register_page_icon.png";

const LoggedOutPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SplitLayout
        left_css="auth-left-panel"
        right_css="auth-right-panel"
        spacer_css="hidden"
        mobileBrand
        leftContent={
          <div className="flex p-8">
            <div className="max-w-md w-full text-white">
              <img
                src={VitalLogo}
                alt="Vital Logo Illustration"
                className="w-full h-auto rounded-lg mb-6 p-6 justify-items-start"
              />
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-4">
                  Track and Manage Your Health, Effortlessly.
                </h1>
                <p className="text-gray-200">
                  You&apos;ve been securely signed out. Sign back in anytime to
                  continue managing your health.
                </p>
              </div>
              <img
                src={RegisterIcon}
                alt="Blood Pressure 120/80 updated today and Lisinopril (10mg): Taken at 8:00 AM"
                className="p-4 mb-6"
              />
            </div>
          </div>
        }
        rightContent={
          <div className="logged-out-content">
            {/* Blue circle with a white check mark */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-800">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-11 w-11"
                fill="none"
                stroke="white"
                strokeWidth="3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12.5 10 17.5 19 7"
                />
              </svg>
            </div>

            <div className="mb-6 text-center">
              <h1 className="formTitle">
                You&apos;re Logged Out!
              </h1>
              <p className="formSubtitle logged-out-subtitle">
                For your security, we&apos;ve signed you out. Log in again to
                access your dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
              <Link
                to="/login"
                className="auth-primary-link"
              >
                Sign In
              </Link>
              <Link
                to="/"
                className="outlineBtn auth-secondary-link"
              >
                Return Home
              </Link>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default LoggedOutPage;

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
        left_css="hidden lg:w-1/2 lg:bg-blue-800 lg:flex lg:items-center lg:justify-center lg:p-45 lg:h-screen"
        left_css_mobile="w-full sm:p-60 min-h-[500px]"
        right_css="lg:w-1/2 bg-white flex items-center justify-center lg:p-8 lg:h-screen"
        right_css_mobile="w-full min-h-screen px-7 py-10 lg:min-h-0"
        spacer_css="hidden lg:block p-10"
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
                  Sign in to view your vitals, medication schedule, and upcoming
                  appointments. All in one place.
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
          <div className="mx-auto w-full max-w-[18rem] lg:max-w-md">
            {/* Mobile only: blue VITALS logo at the top (same trick as LoginPage) */}
            <div
              role="img"
              aria-label="Vitals"
              className="mx-auto mb-16 h-[36px] w-[166px] bg-blue-800 lg:hidden"
              style={{
                maskImage: `url(${VitalLogo})`,
                maskPosition: "center",
                maskRepeat: "no-repeat",
                maskSize: "contain",
                WebkitMaskImage: `url(${VitalLogo})`,
                WebkitMaskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
              }}
            />

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
              <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">
                You&apos;re Logged Out!
              </h1>
              <p className="mt-1 text-xs font-semibold text-gray-600 lg:text-sm">
                For your security, we&apos;ve signed you out. Log in again to
                access your dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
              <Link
                to="/login"
                className="flex flex-1 items-center justify-center rounded-xl bg-blue-800 px-3 py-2.5 text-center text-base font-semibold text-white transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/"
                className="flex flex-1 items-center justify-center rounded-xl border border-blue-800 px-3 py-2.5 text-center text-base font-semibold text-blue-800 transition hover:bg-blue-50 lg:rounded-lg"
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

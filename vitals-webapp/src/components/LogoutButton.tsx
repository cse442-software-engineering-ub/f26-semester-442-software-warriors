// src/components/LogoutButton.tsx
// The Logout item for the navbar (PM decision 10/08: navbar = Home, Settings, Logout).
// All logout logic lives here (#56); the navbar only places <LogoutButton variant="..." />.
//   variant="sidebar"   -> desktop sidebar tab (white outline on blue, like "Home")
//   variant="bottomnav" -> mobile bottom navbar item (icon above label)
//   variant="page"      -> outline button on a white page (default)
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../api";

type LogoutVariant = "sidebar" | "bottomnav" | "page";

interface LogoutButtonProps {
  variant?: LogoutVariant;
  className?: string; // lets the navbar control width/placement
}

const VARIANT_CLASSES: Record<LogoutVariant, string> = {
  sidebar:
    "flex h-12 w-full items-center gap-3 rounded-lg border border-white px-4 text-lg font-medium text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-60",
  bottomnav:
    "flex w-full flex-col items-center gap-1 py-1 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-60",
  page: "flex w-full items-center justify-center gap-2 rounded-xl border border-blue-800 bg-white px-6 py-2.5 text-base font-semibold text-blue-800 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-lg",
};

// Error text must be readable on the blue navbar as well as on a white page
const ERROR_CLASSES: Record<LogoutVariant, string> = {
  sidebar: "mt-1 text-sm text-red-200",
  bottomnav: "mt-1 text-center text-xs text-red-200",
  page: "mt-1 text-sm text-red-600",
};

// "Arrow leaving a door" icon, drawn in the current text color
const LogoutIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={`shrink-0 ${className}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 17l5-5-5-5M21 12H9"
    />
  </svg>
);

const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = "page",
  className = "",
}) => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setError("");
    setIsLoggingOut(true);
    try {
      await logoutUser();
      // replace: true removes the current (logged-in) page from history,
      // so the browser Back button doesn't return to it
      navigate("/logged-out", { replace: true });
    } catch (err: any) {
      setError(err?.error || "Couldn't log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={VARIANT_CLASSES[variant]}
      >
        {variant === "sidebar" && <LogoutIcon className="h-[22px] w-[22px]" />}
        {variant === "bottomnav" && <LogoutIcon className="h-6 w-6" />}
        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
      </button>
      {error && (
        <p role="alert" className={ERROR_CLASSES[variant]}>
          {error}
        </p>
      )}
    </div>
  );
};

export default LogoutButton;

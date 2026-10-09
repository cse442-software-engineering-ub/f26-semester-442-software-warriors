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
    "app-sidebar-logout flex h-12 w-full items-center gap-3 rounded-lg border border-white px-4 text-lg font-medium text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-60",
  bottomnav:
    "app-sidebar-link app-sidebar-mobile-logout flex w-full flex-col items-center gap-1 py-1 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-60",
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
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setError("");
    setIsLoggingOut(true);
    setIsConfirming(false);
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
        onClick={() => {
          setError("");
          setIsConfirming(true);
        }}
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
      {isConfirming && (
        <div
          className="app-logout-dialog-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setIsConfirming(false)
          }
        >
          <section
            className="app-logout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-logout-dialog-title"
          >
            <button
              className="app-logout-dialog-close"
              type="button"
              aria-label="Cancel logout"
              onClick={() => setIsConfirming(false)}
            >
              <svg
                className="app-dialog-close-icon"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="m7 7 10 10M17 7 7 17" />
              </svg>
            </button>
            <h2 id="app-logout-dialog-title">
              Are you sure you want to log out?
            </h2>
            <div className="app-logout-dialog-actions">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Confirm"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default LogoutButton;

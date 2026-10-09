import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import VitalsLogo from "../assets/logo.png";
import LogoutButton from "./LogoutButton";
import "./AppLayout.css";

// Shared layout for signed-in pages; set activeItem to highlight the current section.
// <AppLayout activeItem="Medications">
//   <MedicationsPage />
// </AppLayout>
export type SidebarSection =
  | "Home"
  | "Caregivers"
  | "Medications"
  | "Appointments"
  | "Journal"
  | "My Profile";

const sidebarSections: SidebarSection[] = [
  "Home",
  // Re-enable these links when their routes are added to App.tsx.
  // "Caregivers",
  // "Medications",
  // "Appointments",
  // "Journal",
  "My Profile",
];

const defaultDestinations: Partial<Record<SidebarSection, string>> = {
  Home: "/home",
  // Restore destinations when the corresponding routes are implemented.
  // Caregivers: "/caregivers",
  // Medications: "/medications",
  // Appointments: "/appointments",
  // Journal: "/journal",
  "My Profile": "/settings",
};

const sectionIcons: Record<SidebarSection, ReactNode> = {
  Home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  Caregivers: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
  Medications: <><path d="m7 17 10-10" /><path d="M5 15a4 4 0 0 0 6 6l8-8a4 4 0 0 0-6-6Z" /></>,
  Appointments: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  Journal: <><path d="M6 4h10a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4Z" /><path d="M6 4v14a2 2 0 0 0 2 2M10 8h5M10 11h5" /></>,
  "My Profile": <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

const mobileLabels: Record<SidebarSection, string> = {
  Home: "Home",
  Caregivers: "Caregivers",
  Medications: "Meds.",
  Appointments: "Appts.",
  Journal: "Journal",
  "My Profile": "Profile",
};

interface AppLayoutProps {
  activeItem: SidebarSection;
  children: ReactNode;
  userName?: string;
  accountLabel?: string;
  destinations?: Partial<Record<SidebarSection, string>>;
}

const AppSidebar = ({
  activeItem,
  userName = "Jane Doe",
  accountLabel = "Personal account",
  destinations,
}: Omit<AppLayoutProps, "children">) => (
  <aside className="app-sidebar">
    <div className="app-sidebar-brand">
      <img src={VitalsLogo} alt="Vitals" />
    </div>
    <nav className="app-sidebar-navigation" aria-label="Main navigation">
      {sidebarSections.map((section) => (
        <Link
          className={`app-sidebar-link${activeItem === section ? " app-sidebar-link-active" : ""}`}
          to={destinations?.[section] ?? defaultDestinations[section] ?? "/"}
          key={section}
          aria-current={activeItem === section ? "page" : undefined}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {sectionIcons[section]}
          </svg>
          <span className="app-sidebar-link-label">{section}</span>
          <span className="app-sidebar-link-mobile-label">{mobileLabels[section]}</span>
        </Link>
      ))}
      <LogoutButton
        variant="bottomnav"
        className="app-logout-control app-logout-control-bottomnav"
      />
    </nav>
    <LogoutButton
      variant="sidebar"
      className="app-logout-control app-logout-control-sidebar"
    />
    <div className="app-sidebar-account">
      <div className="app-sidebar-account-copy">
        <strong>{userName}</strong>
        <span>{accountLabel}</span>
      </div>
    </div>
  </aside>
);

const AppLayout = ({
  activeItem,
  children,
  userName = "Jane Doe",
  accountLabel = "Personal account",
  destinations,
}: AppLayoutProps) => (
  <div className="app-layout">
    <AppSidebar
      activeItem={activeItem}
      userName={userName}
      accountLabel={accountLabel}
      destinations={destinations}
    />
    <main className="app-layout-main">{children}</main>
  </div>
);

export default AppLayout;

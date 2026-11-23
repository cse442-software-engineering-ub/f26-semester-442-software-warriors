import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { FieldErrorMessage } from "../components/InputField";
import {
  ACCOUNT_UPDATED_EVENT,
  type CaregiverPermissions,
  changeAccountPassword,
  deleteAccount,
  getAccount,
  setViewingMode,
  updateCaregiverPermissions,
  updateAccount,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../api";
import "./SettingsPage.css";
type ModalName = "password" | "delete" | "saved" | "password-saved" | null;
type ProfileFields = "name" | "phone" | "email";
type FieldErrors = Partial<Record<ProfileFields, string>>;
interface SettingsApiError {
  status: number;
  error?: string;
  errors?: Record<string, string>;
}
const isSettingsApiError = (error: unknown): error is SettingsApiError =>
  typeof error === "object" && error !== null && "status" in error && typeof error.status === "number";
const isUnauthorized = (error: unknown) =>
  isSettingsApiError(error) && (error.status === 401 || error.error === "Not logged in.");
const defaultPermissions: CaregiverPermissions = {
  can_edit_medications: true,
  can_edit_appointments: true,
  can_view_medication_history: true,
};
const frequencyChoices = [
  { value: "once_daily_noon", label: "Once a day (12:00 PM)" },
  { value: "twice_daily", label: "Twice a day (8:00 AM and 8:00 PM)" },
  { value: "every_hour", label: "Every hour" },
  { value: "every_30_minutes", label: "Every 30 minutes" },
  { value: "none", label: "Never" },
];
const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error
    ? error.message
    : isSettingsApiError(error) && error.error
      ? error.error
      : fallback;
interface Profile {
  name: string;
  phone: string;
  email: string;
}
interface SettingsFieldProps {
  id: ProfileFields;
  label: string;
  value: string;
  type?: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}
const SettingsField = ({
  id,
  label,
  value,
  type = "text",
  error,
  onChange,
}: SettingsFieldProps) => (
  <label className="settings-field" htmlFor={id}>
    <span>{label}</span>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={
        id === "name"
          ? "Jane Doe"
          : id === "phone"
            ? "(123) 456-7890"
            : "jane.doe@example.com"
      }
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      autoComplete={id === "name" ? "name" : id === "phone" ? "tel" : "email"}
      className={error ? "auth-field-input-error" : undefined}
    />
    {error && <FieldErrorMessage id={`${id}-error`} message={error} />}
  </label>
);
const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}${digits.slice(10)}`;
};
const SettingsPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", email: "" });
  const [savedName, setSavedName] = useState("");
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [permissionsPatientName, setPermissionsPatientName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"personal" | "caregiver">("personal");
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [viewModeError, setViewModeError] = useState("");
  const [permissions, setPermissions] = useState<CaregiverPermissions>(defaultPermissions);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationsMessage, setNotificationsMessage] = useState("");
  const [notificationsError, setNotificationsError] = useState("");
  const [messageFrequency, setMessageFrequency] = useState("none");
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionsMessage, setPermissionsMessage] = useState("");
  const [permissionsError, setPermissionsError] = useState("");
  const [modal, setModal] = useState<ModalName>(null);
  const [passwordErrors, setPasswordErrors] = useState<{ oldPassword?: string; newPassword?: string }>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [emailLimitExceeded, setEmailLimitExceeded] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  useEffect(() => {
    let isCurrent = true;
    getAccount()
      .then((account) => {
        if (!isCurrent) return;
        setProfile({
          name: account.name,
          phone: formatPhoneNumber(account.phone),
          email: account.email,
        });
        setSavedName(account.name);
        setIsCaregiver(account.isCaregiver);
        setPermissionsPatientName(account.relatedPersonName);
        setViewMode(account.viewMode ?? (account.isCaregiver ? "caregiver" : "personal"));
        setPermissions(account.permissions ?? defaultPermissions);
        setRequestError("");
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setRequestError(
          getErrorMessage(error, "Unable to load your account information."),
        );
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [navigate]);
  
  //grabs preferences from api.ts for notifications
  //sets error if preferences couldn't be loaded
  useEffect(() => {
    let isCurrent = true;
    getNotificationPreferences()
      .then((prefs) => {
        if (!isCurrent) return;
        setEmailNotifications(prefs.emailNotifications);

        setMessageFrequency(prefs.messageFrequency);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setNotificationsError("Unable to load your notification preferences.");
      });
    return () => {
      isCurrent = false;
    };
  }, [navigate]);

  const updateProfile = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name !== "name" && name !== "phone" && name !== "email") return;
    if (name === "email") {
      setEmailLimitExceeded(value.length > 254);
      setProfile((current) => ({ ...current, email: value.slice(0, 254) }));
    } else {
      setProfile((current) => ({
        ...current,
        [name]: name === "phone" ? formatPhoneNumber(value) : value,
      }));
    }
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setRequestError("");
  };
  const closeModal = () => {
    setModal(null);
    setPasswordErrors({});
  };
  const validateProfile = () => {
    // Reject invalid values before sending an account update.
    const errors: FieldErrors = {};
    const phoneDigits = profile.phone.replace(/\D/g, "");
    if (!profile.name.trim()) errors.name = "Name is required.";
    if (!profile.phone.trim()) {
      errors.phone = "Phone Number is required.";
    } else if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      errors.phone = "Please enter a valid phone number.";
    }
    if (emailLimitExceeded) {
      errors.email = "Character limit exceeded.";
    } else if (!profile.email.trim()) {
      errors.email = "Email Address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.email = "Please enter a valid email address.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const saveChanges = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateProfile() || isSaving) return;
    setIsSaving(true);
    setRequestError("");
    try {
      await updateAccount({
        name: profile.name.trim(),
        phone: profile.phone.replace(/\D/g, ""),
        email: profile.email.trim(),
      });
      setSavedName(profile.name.trim());
      window.dispatchEvent(new Event(ACCOUNT_UPDATED_EVENT));
      setModal("saved");
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        navigate("/login", { replace: true });
        return;
      }
      if (isSettingsApiError(error) && error.errors && Object.keys(error.errors).length > 0) {
        const serverFieldErrors: FieldErrors = {};
        for (const field of ["name", "phone", "email"] as const) {
          if (error.errors[field]) serverFieldErrors[field] = error.errors[field];
        }
        setFieldErrors(serverFieldErrors);
      } else {
        setRequestError(getErrorMessage(error, "Unable to save your changes. Please try again."));
      }
    } finally {
      setIsSaving(false);
    }
  };
  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const oldPassword = String(form.get("oldPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const errors: { oldPassword?: string; newPassword?: string } = {};
    if (!oldPassword.trim()) errors.oldPassword = "Old password is required.";
    if (!newPassword.trim()) errors.newPassword = "New password is required.";
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0 || isChangingPassword) return;
    setIsChangingPassword(true);
    try {
      await changeAccountPassword(oldPassword, newPassword);
      setPasswordErrors({});
      setModal("password-saved");
    } catch (error: unknown) {
      if (isSettingsApiError(error) && error.errors && Object.keys(error.errors).length > 0) {
        setPasswordErrors({
          oldPassword: error.errors.oldPassword,
          newPassword: error.errors.newPassword,
        });
      } else if (isSettingsApiError(error) && error.error === "Current password is incorrect.") {
        setPasswordErrors({ oldPassword: error.error ?? "Old password is incorrect." });
      } else if (isUnauthorized(error)) {
        navigate("/login", { replace: true });
      } else {
        setPasswordErrors({ newPassword: getErrorMessage(error, "Unable to change your password.") });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };
  const showModal = (name: Exclude<ModalName, null | "saved">) => {
    setPasswordErrors({});
    setModal(name);
  };
  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    setRequestError("");
    try {
      await deleteAccount();
      navigate("/login", { replace: true });
    } catch (error: unknown) {
      setModal(null);
      setRequestError(getErrorMessage(error, "Unable to delete your account. Please try again."));
    } finally {
      setIsDeletingAccount(false);
    }
  };
  const switchViewingMode = async () => {
    if (!isCaregiver || isSwitchingMode) return;
    const newMode = viewMode === "caregiver" ? "personal" : "caregiver";
    setIsSwitchingMode(true);
    setViewModeError("");
    try {
      await setViewingMode(newMode);
      setViewMode(newMode);
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        navigate("/login", { replace: true });
        return;
      }
      setViewModeError(getErrorMessage(error, "Unable to switch viewing modes. Please try again."));
    } finally {
      setIsSwitchingMode(false);
    }
  };
  const togglePermission = (key: keyof CaregiverPermissions) => {
    setPermissions((current) => ({ ...current, [key]: !current[key] }));
    setPermissionsMessage("");
    setPermissionsError("");
  };
  const savePermissions = async () => {
    if (isSavingPermissions) return;
    setIsSavingPermissions(true);
    setPermissionsMessage("");
    setPermissionsError("");
    try {
      await updateCaregiverPermissions(permissions);
      const patientFirstName = permissionsPatientName?.trim().split(/\s+/)[0];
      setPermissionsMessage(`Permissions updated for ${patientFirstName || "your patient"}.`);
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        navigate("/login", { replace: true });
        return;
      }
      setPermissionsError("Could not save. Please try again.");
    } finally {
      setIsSavingPermissions(false);
    }
  };
  
  //save function for when user updates their preferences for notifications
    const saveNotifications = async () => {
    if (isSavingNotifications) return;
    setIsSavingNotifications(true);
    setNotificationsMessage("");
    setNotificationsError("");
    try {
      await updateNotificationPreferences({ emailNotifications, messageFrequency });
      const saved = await getNotificationPreferences();
      setEmailNotifications(saved.emailNotifications);
      setMessageFrequency(saved.messageFrequency);
      setNotificationsMessage("Notification preferences updated.");
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        navigate("/login", { replace: true });
        return;
      }
      setNotificationsError("Could not save. Please try again.");
    } finally {
      setIsSavingNotifications(false);
    }
  };
  return (
    <AppLayout
      activeItem="My Profile"
      userName={savedName || "Account"}
      accountLabel="Personal account"
    >
      <div className="settings-content">
        <header className="settings-page-heading">
          <div>
            <h1>{isCaregiver ? "Caregiver Settings" : "Account Settings"}</h1>
            <p className="settings-intro">View and modify your account information. Make sure you save all changes by pressing the "Save Changes" button at the bottom of the page.</p>
          </div>
        </header>
        <div className="settings-panel">
          <form className="settings-card" onSubmit={saveChanges} noValidate>
            {isLoading ? (
              <p className="settings-loading" role="status">Loading account information...</p>
            ) : (
              <>
                <div className="settings-profile-column">
                  <div className="settings-fields">
                    <SettingsField id="name" label="NAME" value={profile.name} error={fieldErrors.name} onChange={updateProfile} />
                    <SettingsField id="phone" label="PHONE NUMBER" value={profile.phone} error={fieldErrors.phone} onChange={updateProfile} />
                    <SettingsField id="email" label="EMAIL ADDRESS" type="text" value={profile.email} error={fieldErrors.email} onChange={updateProfile} />
                  </div>
                  {/*
                  <section className="settings-preference-row" id="notification-settings" aria-labelledby="notification-title">
                    <div>
                      <h2 id="notification-title">Notifications</h2>
                      <p>Receive reminders and important account updates.</p>
                    </div>
                    <button className="settings-button settings-button-outline settings-notification-button" type="button" onClick={() => navigate("/notification-settings")}>
                      Go To Notification Settings
                    </button>
                  </section>
                  */}
                  {requestError && <p className="login-server-error" role="alert">{requestError}</p>}
                  <footer className="settings-card-footer">
                    <button className="settings-button settings-button-primary" type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </footer>
                </div>
                <div className="settings-account-actions-column">
              {isCaregiver && (
                <>
                  <section className="settings-preference-row settings-security-row">
                    <div>
                      <h2>Viewing Mode</h2>
                      <p>
                        {viewMode === "caregiver"
                          ? "You are currently viewing your patient's health information."
                          : "You are currently viewing your personal health information."}
                      </p>
                      <button
                        className="settings-button settings-button-outline settings-change-password"
                        type="button"
                        onClick={switchViewingMode}
                        disabled={isSwitchingMode}
                      >
                        {isSwitchingMode
                          ? "Switching..."
                          : viewMode === "caregiver"
                            ? "Switch to Personal Mode"
                            : "Switch to Caregiver Mode"}
                      </button>
                      {viewModeError && <p className="login-server-error" role="alert">{viewModeError}</p>}
                    </div>
                  </section>
                </>
              )}

                  {!isCaregiver && (
                    <section className="settings-preference-row settings-security-row">
                      <div>
                        <h2>Caregivers</h2>
                        <p>Add caregivers who can help you manage your health information.</p>
                        <button className="settings-button settings-button-outline settings-change-password" type="button" onClick={() => navigate("/caregivers")}>
                          Manage Caregivers
                        </button>
                      </div>
                    </section>
                  )}
                  <section className="settings-preference-row settings-security-row">
                    <div>
                      <h2>Password</h2>
                      <p>Update your password to help keep your account secure.</p>
                      <button className="settings-button settings-button-outline settings-change-password" type="button" onClick={() => showModal("password")}>
                        Change Password
                      </button>
                    </div>
                  </section>
                  <section className="settings-danger-card" aria-labelledby="delete-account-heading">
                    <div>
                      <h2 id="delete-account-heading">Delete Account</h2>
                      <p>Permanently remove your account and associated information.</p>
                    </div>
                    <button className="settings-button settings-button-danger" type="button" onClick={() => showModal("delete")}>
                      Delete Account
                    </button>
                  </section>
                </div>
              </>
            )}
          </form>
          {/* Notifications Section */}
          <div className="settings-preference-row settings-security-row settings-notifications">
            <div className="settings-field">
              <h2 id="notifications-heading">NOTIFICATION PREFERENCES</h2>
              <p>Send reminders and important account updates to your email address.</p>
            </div>
            <div className="settings-permission-list">
              <div className="settings-permission-row">
                <span className="settings-permission-label">
                  <span>Email Notifications</span>
                </span>
                <button
                  className="settings-permission-switch settings-field"
                  type="button"
                  role="switch"
                  aria-label="Email Notifications"
                  aria-checked={emailNotifications}
                  onClick={() => {
                    setEmailNotifications((current) => {
                      const next = !current;
                      if (next && messageFrequency === "none") {
                        setMessageFrequency("once_daily_noon");
                      }
                      return next;
                    });
                    setNotificationsMessage("");
                    setNotificationsError("");
                  }}
                >
                  <span className="settings-permission-switch-knob" />
                  <span className="settings-permission-switch-state">
                    {emailNotifications ? "On" : "Off"}
                  </span>
                </button>
              </div>

              {emailNotifications && (
                <div className="settings-permission-row settings-field">
                  <label className="settings-permission-label" htmlFor="message-frequency">
                    <span className="">Reminder Email Frequency</span>
                  </label>
                  <select
                    id="message-frequency"
                    className="settings-select settings-field"
                    value={messageFrequency}
                    onChange={(event) => {
                      setMessageFrequency(event.target.value);
                      setNotificationsMessage("");
                      setNotificationsError("");
                    }}
                  >
                    {frequencyChoices.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              className="settings-button settings-button-primary settings-permissions-save settings-notifications-save"
              type="button"
              onClick={saveNotifications}
              disabled={isSavingNotifications}
            >
              {isSavingNotifications ? "Saving..." : "Save Preferences"}
            </button>
            {notificationsMessage && <p className="settings-permissions-success" role="status">{notificationsMessage}</p>}
            {notificationsError && <p className="settings-permissions-error" role="alert">{notificationsError}</p>}
          </div>
        </div>
        {isCaregiver && (
          <section className="settings-panel settings-permissions-panel" aria-labelledby="permissions-heading">
            <div className="settings-permissions-row">
              <h2 id="permissions-heading">
                {permissionsPatientName ? `${permissionsPatientName.trim().split(/\s+/)[0]}’s Permissions` : "Patient Permissions"}
              </h2>
              <div className="settings-permission-list">
                {([
                  ["can_edit_medications", "Can edit medications", "Allows the patient to add, change, or remove medications. Marking a dose as taken remains available."],
                  ["can_edit_appointments", "Can edit appointments", "Allows the patient to add, change, or remove appointments."],
                  ["can_view_medication_history", "Can view medication history", "Controls whether the patient can see their medication history."],
                ] as const).map(([key, label, description]) => (
                  <div className="settings-permission-row" key={key}>
                    <span className="settings-permission-label">
                      <span>{label}</span>
                      <span className="settings-permission-info">
                        <button
                          className="settings-permission-info-button"
                          type="button"
                          aria-label={`More information about ${label}`}
                          aria-describedby={`${key}-tooltip`}
                        >
                          <span aria-hidden="true">i</span>
                        </button>
                        <span className="settings-permission-tooltip" id={`${key}-tooltip`} role="tooltip">
                          {description}
                        </span>
                      </span>
                    </span>
                    <button
                      className="settings-permission-switch"
                      type="button"
                      role="switch"
                      aria-label={label}
                      aria-checked={permissions[key]}
                      onClick={() => togglePermission(key)}
                    >
                      <span className="settings-permission-switch-knob" />
                      <span className="settings-permission-switch-state">
                        {permissions[key] ? "On" : "Off"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="settings-button settings-button-primary settings-permissions-save"
                type="button"
                onClick={savePermissions}
                disabled={isSavingPermissions}
              >
                {isSavingPermissions ? "Saving..." : "Save Permissions"}
              </button>
              {permissionsMessage && <p className="settings-permissions-success" role="status">{permissionsMessage}</p>}
              {permissionsError && <p className="settings-permissions-error" role="alert">{permissionsError}</p>}
            </div>
          </section>
        )}
      </div>

      {modal && (
        <div className="settings-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          {modal === "saved" || modal === "password-saved" ? (
            <section className="settings-modal settings-modal-success" role="dialog" aria-modal="true" aria-labelledby="settings-saved-title">
              <h2 id="settings-saved-title">
                {modal === "password-saved" ? "Your password has been changed!" : "Your changes have been saved!"}
              </h2>
              <button className="settings-button settings-modal-action-button" type="button" onClick={closeModal}>Confirm</button>
            </section>
          ) : (
            <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
              <button className="settings-modal-close" type="button" aria-label="Close dialog" onClick={closeModal}>
                <svg
                  className="app-dialog-close-icon"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="m5 5 14 14M19 5 5 19" />
                </svg>
              </button>
              {modal === "password" && (
                <>
                  <h2 id="settings-modal-title">Change Password</h2>
                  <p className="settings-modal-description">Enter a new password for your account.</p>
                  <form className="settings-password-form" onSubmit={changePassword}>
                    <label className="settings-field" htmlFor="old-password">
                      <span>OLD PASSWORD</span>
                      <input id="old-password" name="oldPassword" type="password" placeholder="••••••••" autoComplete="current-password" aria-invalid={Boolean(passwordErrors.oldPassword)} aria-describedby={passwordErrors.oldPassword ? "old-password-error" : undefined} className={passwordErrors.oldPassword ? "auth-field-input-error" : undefined} />
                      {passwordErrors.oldPassword && <FieldErrorMessage id="old-password-error" message={passwordErrors.oldPassword} />}
                    </label>
                    <label className="settings-field" htmlFor="new-password">
                      <span>NEW PASSWORD</span>
                      <input id="new-password" name="newPassword" type="password" placeholder="••••••••" maxLength={128} autoComplete="new-password" aria-invalid={Boolean(passwordErrors.newPassword)} aria-describedby={passwordErrors.newPassword ? "new-password-error" : undefined} className={passwordErrors.newPassword ? "auth-field-input-error" : undefined} />
                      {passwordErrors.newPassword && <FieldErrorMessage id="new-password-error" message={passwordErrors.newPassword} />}
                    </label>
                    <div className="settings-modal-actions">
                      <button className="settings-button settings-modal-action-button" type="submit" disabled={isChangingPassword}>
                        {isChangingPassword ? "Updating..." : "Confirm"}
                      </button>
                    </div>
                  </form>
                </>
              )}
              {modal === "delete" && (
                <>
                  <h2 id="settings-modal-title">Are you sure you want to delete your account?</h2>
                  <p className="settings-modal-description">This action is permanent and cannot be undone.</p>
                  <div className="settings-modal-actions">
                    <button className="settings-button settings-delete-confirm" type="button" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                      {isDeletingAccount ? "Deleting..." : "Delete Account"}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
};
export default SettingsPage;

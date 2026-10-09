import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import {
  changeAccountPassword,
  deleteAccount,
  getAccount,
  logoutUser,
  updateAccount,
} from "../api";
import "./SettingsPage.css";

type ModalName = "password" | "delete" | "saved" | null;
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
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      autoComplete={id === "name" ? "name" : id === "phone" ? "tel" : "email"}
    />
    {error && <span className="settings-field-error" id={`${id}-error`} role="alert">{error}</span>}
  </label>
);

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}${digits.slice(10)}`;
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", email: "" });
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
    if (!profile.name.trim()) errors.name = "Name is required.";
    if (!profile.phone.trim()) {
      errors.phone = "Phone Number is required.";
    } else if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(profile.phone)) {
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
      closeModal();
    } catch (error: unknown) {
      if (isSettingsApiError(error) && error.errors && Object.keys(error.errors).length > 0) {
        setPasswordErrors({
          oldPassword: error.errors.oldPassword,
          newPassword: error.errors.newPassword,
        });
      } else if (isSettingsApiError(error) && error.status === 401) {
        setPasswordErrors({ oldPassword: error.error ?? "Old password is incorrect." });
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

  const handleLogout = async () => {
    setRequestError("");
    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch (error: unknown) {
      setRequestError(getErrorMessage(error, "Unable to log out. Please try again."));
    }
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

  return (
    <AppLayout
      activeItem="My Profile"
      userName={profile.name || "Account"}
      accountLabel="Personal account"
    >
      <div className="settings-content">
        <header className="settings-page-heading">
          <div>
            <h1>Account Settings</h1>
            <p className="settings-intro">View and modify your account information. Make sure you save all changes by pressing the "Save Changes" button at the bottom of the page.</p>
          </div>
        </header>

        <div className="settings-panel">
          <form className="settings-card" onSubmit={saveChanges} noValidate>
            {isLoading ? (
              <p className="settings-loading" role="status">Loading account information...</p>
            ) : (
              <>
                <div className="settings-fields">
                  <SettingsField id="name" label="NAME" value={profile.name} error={fieldErrors.name} onChange={updateProfile} />
                  <SettingsField id="phone" label="PHONE NUMBER" value={profile.phone} error={fieldErrors.phone} onChange={updateProfile} />
                  <SettingsField id="email" label="EMAIL ADDRESS" type="text" value={profile.email} error={fieldErrors.email} onChange={updateProfile} />
                </div>

                <div className="settings-card-divider" />

                <section className="settings-preference-row" id="notification-settings" aria-labelledby="notification-title">
                  <div>
                    <h2 id="notification-title">Notifications</h2>
                    <p>Receive reminders and important account updates.</p>
                  </div>
                  <button className="settings-button settings-button-outline settings-notification-button" type="button" onClick={() => navigate("/notification-settings")}>
                    Go To Notification Settings
                  </button>
                </section>

                <div className="settings-card-divider" />

                <section className="settings-preference-row settings-security-row">
                  <div>
                    <h2>Password</h2>
                    <p>Update your password to help keep your account secure.</p>
                    <button className="settings-button settings-button-outline settings-change-password" type="button" onClick={() => showModal("password")}>
                      Change Password
                    </button>
                  </div>
                </section>

                {requestError && <p className="settings-request-error" role="alert">{requestError}</p>}

                <footer className="settings-card-footer">
                  <button className="settings-button settings-button-logout" type="button" onClick={handleLogout}>Logout</button>
                  <button className="settings-button settings-button-primary" type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </footer>
              </>
            )}
            <section className="settings-danger-card" aria-labelledby="delete-account-heading">
              <div>
                <h2 id="delete-account-heading">Delete Account</h2>
                <p>Permanently remove your account and associated information.</p>
              </div>
              <button className="settings-button settings-button-danger" type="button" onClick={() => showModal("delete")}>
                Delete Account
              </button>
            </section>
          </form>
        </div>
      </div>

      {modal && (
        <div className="settings-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          {modal === "saved" ? (
            <section className="settings-modal settings-modal-success" role="dialog" aria-modal="true" aria-labelledby="settings-saved-title">
              <h2 id="settings-saved-title">Your changes have been saved!</h2>
              <button className="settings-button settings-confirm-button" type="button" onClick={closeModal}>Confirm</button>
            </section>
          ) : (
            <section className={`settings-modal${modal === "delete" || modal === "password" ? " settings-modal-blue" : ""}`} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
              <button className="settings-modal-close" type="button" aria-label="Close dialog" onClick={closeModal}>×</button>

              {modal === "password" && (
                <>
                  <h2 id="settings-modal-title">Change Password</h2>
                  <p className="settings-modal-description">Enter a new password for your account.</p>
                  <form className="settings-password-form" onSubmit={changePassword}>
                    <label className="settings-field" htmlFor="old-password">
                      <span>OLD PASSWORD</span>
                      <input id="old-password" name="oldPassword" type="password" autoComplete="current-password" aria-invalid={Boolean(passwordErrors.oldPassword)} aria-describedby={passwordErrors.oldPassword ? "old-password-error" : undefined} />
                      {passwordErrors.oldPassword && <span className="settings-field-error" id="old-password-error" role="alert">{passwordErrors.oldPassword}</span>}
                    </label>
                    <label className="settings-field" htmlFor="new-password">
                      <span>NEW PASSWORD</span>
                      <input id="new-password" name="newPassword" type="password" autoComplete="new-password" aria-invalid={Boolean(passwordErrors.newPassword)} aria-describedby={passwordErrors.newPassword ? "new-password-error" : undefined} />
                      {passwordErrors.newPassword && <span className="settings-field-error" id="new-password-error" role="alert">{passwordErrors.newPassword}</span>}
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
                  <div className="settings-modal-actions">
                    <button className="settings-button settings-delete-confirm" type="button" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                      {isDeletingAccount ? "Deleting..." : "Confirm"}
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

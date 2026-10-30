import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { addCaregiver, getAccount, getCaregivers } from "../api";
import type { CaregiverRecord } from "../api";
import "./MedicationsPage.css";
import "./CaregiversPage.css";

const isUnauthorized = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error && error.status === 401;

const getErrorMessage = (error: unknown) =>
  typeof error === "object" && error !== null && "error" in error && typeof error.error === "string"
    ? error.error
    : "Something went wrong. Please try again later.";

const maxNameLength = 100;
const maxEmailLength = 150;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;

// Same as the register page: keeps only digits and fills in "(123) 456-7890" while typing
const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

// "7165551234" -> "(716) 555-1234"
const formatPhone = (phone: string) =>
  /^\d{10}$/.test(phone) ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : phone;

const CaregiversPage = () => {
  const navigate = useNavigate();
  const [accountName, setAccountName] = useState("");
  const [caregivers, setCaregivers] = useState<CaregiverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  const [isAdding, setIsAdding] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getAccount()
      .then((account) => setAccountName(account.name))
      .catch((error: unknown) => {
        if (isUnauthorized(error)) navigate("/login", { replace: true });
      });
  }, [navigate]);

  useEffect(() => {
    getCaregivers()
      .then((records) => {
        setCaregivers(records);
        setRequestError("");
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setRequestError(getErrorMessage(error));
      })
      .finally(() => setIsLoading(false));
  }, [navigate, reloadCount]);

  const clearErrors = () => {
    setNameError("");
    setPhoneError("");
    setEmailError("");
    setFormError("");
  };

  const openAddModal = () => {
    setNameInput("");
    setPhoneInput("");
    setEmailInput("");
    clearErrors();
    setIsAdding(true);
  };

  // Shows a backend message under the input it is about
  const showServerError = (message: string) => {
    const text = message.toLowerCase();
    if (text.includes("name")) setNameError(message);
    else if (text.includes("email")) setEmailError(message);
    else if (text.includes("phone")) setPhoneError(message);
    else setFormError(message);
  };

  const submitCaregiver = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const phone = phoneInput.replace(/\D/g, "");
    clearErrors();
    let hasError = false;
    if (!nameInput.trim()) { setNameError("Name is required"); hasError = true; }
    if (!phonePattern.test(phoneInput)) { setPhoneError("Please enter a valid phone number"); hasError = true; }
    if (!emailPattern.test(emailInput.trim())) { setEmailError("Please enter a valid email address"); hasError = true; }
    if (hasError) return;

    setIsSaving(true);
    addCaregiver({ name: nameInput, email: emailInput, phone_number: phone })
      .then(() => {
        setIsAdding(false);
        setReloadCount((count) => count + 1);
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        showServerError(getErrorMessage(error));
      })
      .finally(() => setIsSaving(false));
  };

  return (
  <AppLayout activeItem="Caregivers" userName={accountName || "Account"} accountLabel="Personal account">
    <div className="medications-content caregivers-content">
      <button className="caregivers-back-button" type="button">Back to Profile</button>

      <header className="medications-page-heading">
        <h1>Caregivers</h1>
        <p className="medications-intro">Below are cards for your caregivers information</p>
      </header>

      <button className="caregivers-add-button" type="button" onClick={openAddModal}>+ Add Caregiver</button>

      <section className="medications-list" aria-label="Your caregivers">
        {isLoading && <p className="home-empty">Loading...</p>}
        {requestError && <p className="home-empty" role="alert">{requestError}</p>}
        {!isLoading && !requestError && caregivers.length === 0 && (
          <p className="home-empty">No caregivers. Add a caregiver to get started.</p>
        )}
        {caregivers.map((caregiver) => (
          <article className="home-card home-medication-card medications-card" key={caregiver.cid}>
            <div className="medications-main">
              <span className="home-medication-icon grid place-items-center rounded-lg bg-blue-800 text-white" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              </span>
              <div className="home-medication-details">
                <h3>{caregiver.name}</h3>
                <p>{caregiver.email}</p>
                <p>{formatPhone(caregiver.phone_number)}</p>
              </div>
            </div>
            <div className="medications-controls">
              <button className="medications-remove-button" type="button">Remove</button>
            </div>
          </article>
        ))}
      </section>
    </div>

    {isAdding && (
      <div className="medications-modal-backdrop">
        <section className="medications-modal caregivers-modal" role="dialog" aria-modal="true" aria-labelledby="caregivers-modal-title">
          <button className="medications-modal-close" type="button" aria-label="Close dialog" onClick={() => setIsAdding(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="m5 5 14 14M19 5 5 19" />
            </svg>
          </button>
          <h2 id="caregivers-modal-title">New Caregiver</h2>
          <form className="medications-modal-form" onSubmit={submitCaregiver} noValidate>
            <label className="medications-modal-field" htmlFor="caregiver-name">
              <span>CAREGIVER NAME</span>
              <input id="caregiver-name" name="name" type="text" placeholder="Caregiver Name" value={nameInput} onChange={(event) => { const value = event.target.value; if (value.length > maxNameLength) { setNameInput(value.slice(0, maxNameLength)); setNameError(`Name cannot be longer than ${maxNameLength} characters.`); return; } setNameInput(value); setNameError(""); }} aria-invalid={Boolean(nameError)} />
              {nameError && <p className="medications-modal-error" role="alert">{nameError}</p>}
            </label>
            <label className="medications-modal-field" htmlFor="caregiver-phone">
              <span>PHONE NUMBER</span>
              <input id="caregiver-phone" name="phone_number" type="tel" placeholder="(123) 345-5678" inputMode="numeric" value={phoneInput} onChange={(event) => { setPhoneInput(formatPhoneNumber(event.target.value)); setPhoneError(""); }} aria-invalid={Boolean(phoneError)} />
              {phoneError && <p className="medications-modal-error" role="alert">{phoneError}</p>}
            </label>
            <label className="medications-modal-field" htmlFor="caregiver-email">
              <span>EMAIL ADDRESS</span>
              <input id="caregiver-email" name="email" type="email" placeholder="Email Address" value={emailInput} onChange={(event) => { const value = event.target.value; if (value.length > maxEmailLength) { setEmailInput(value.slice(0, maxEmailLength)); setEmailError(`Email cannot be longer than ${maxEmailLength} characters.`); return; } setEmailInput(value); setEmailError(""); }} aria-invalid={Boolean(emailError)} />
              {emailError && <p className="medications-modal-error" role="alert">{emailError}</p>}
            </label>
            {formError && <p className="medications-modal-error" role="alert">{formError}</p>}
            <div className="medications-modal-actions">
              <button className="medications-modal-submit" type="submit" disabled={isSaving}>
                <span aria-hidden="true">+</span> {isSaving ? "Adding..." : "Add Caregiver"}
              </button>
            </div>
          </form>
        </section>
      </div>
    )}
  </AppLayout>
  );
};

export default CaregiversPage;

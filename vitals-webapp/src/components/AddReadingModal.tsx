// src/components/AddReadingModal.tsx
// "Log Reading" popup (Figma: vitals-reading-add-mobile / blood pressure tracking - add - desktop).
// Opened from the homepage. The server checks the numbers and decides the status.
import React, { useEffect, useRef, useState } from "react";
import { addReading } from "../api";
import type { ReadingInput, SavedReading } from "../api";
import "./AddReadingModal.css";

interface AddReadingModalProps {
  onClose: () => void;
  onSaved: (reading: SavedReading) => void;
}

type FieldErrors = Partial<Record<keyof ReadingInput, string>>;

const FIELDS: { key: keyof ReadingInput; label: string }[] = [
  { key: "systolic", label: "SYSTOLIC" },
  { key: "diastolic", label: "DIASTOLIC" },
  { key: "pulse", label: "PULSE RATE" },
];

// Quick checks in the browser so the user gets instant feedback.
// The server repeats every check, because the browser can be bypassed.
const validate = (values: ReadingInput): FieldErrors => {
  const errors: FieldErrors = {};
  for (const { key, label } of FIELDS) {
    const name = label.charAt(0) + label.slice(1).toLowerCase();
    if (!values[key].trim()) errors[key] = `${name} is required.`;
    else if (!/^\d+$/.test(values[key].trim()))
      errors[key] = `${name} must be a whole number.`;
  }
  return errors;
};

const AddReadingModal: React.FC<AddReadingModalProps> = ({
  onClose,
  onSaved,
}) => {
  const [values, setValues] = useState<ReadingInput>({
    systolic: "",
    diastolic: "",
    pulse: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInput.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const key = event.target.name as keyof ReadingInput;
    setValues((prev) => ({ ...prev, [key]: event.target.value.slice(0, 3) }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      const reading = await addReading(values);
      onSaved(reading);
    } catch (err: any) {
      if (err?.errors) setErrors(err.errors);
      else
        setFormError(
          err?.status === 401
            ? "Your session has ended. Please log in again."
            : err?.error || "Could not save your reading. Please try again.",
        );
    } finally {
      setIsSaving(false);
    }
  };

  const field = (
    key: keyof ReadingInput,
    label: string,
    ref?: React.Ref<HTMLInputElement>,
  ) => (
    <label className="reading-field" htmlFor={`reading-${key}`}>
      <span>{label}</span>
      <input
        id={`reading-${key}`}
        name={key}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={values[key]}
        onChange={handleChange}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `reading-${key}-error` : undefined}
      />
      {errors[key] && <small id={`reading-${key}-error`}>{errors[key]}</small>}
    </label>
  );

  return (
    <div
      className="reading-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="reading-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-title"
      >
        <button
          className="reading-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <h2 id="reading-title">Log Reading</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="reading-row">
            {field("systolic", "SYSTOLIC", firstInput)}
            <span className="reading-slash" aria-hidden="true">
              /
            </span>
            {field("diastolic", "DIASTOLIC")}
          </div>
          <div className="reading-row reading-row-center">
            {field("pulse", "PULSE RATE")}
          </div>

          {formError && (
            <p className="reading-form-error" role="alert">
              {formError}
            </p>
          )}

          <button className="reading-submit" type="submit" disabled={isSaving}>
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <span aria-hidden="true">+</span> Add Reading
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
};

export default AddReadingModal;

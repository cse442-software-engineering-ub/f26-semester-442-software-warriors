import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { getAccount, getHomepage } from "../api";
import type { AccountInfo, HomepageData } from "../api";

const splitAppointmentDate = (value: string) => {
  const separator = value.lastIndexOf(", ");
  if (separator === -1) return { date: value, time: "" };
  return { date: value.slice(0, separator), time: value.slice(separator + 2).toUpperCase() };
};

const isUnauthorized = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  error.status === 401;

const LOAD_ERROR_MESSAGE = "Could not retrieve account data";

const HomePage = () => {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [data, setData] = useState<HomepageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const loadHomepage = async () => {
      setIsLoading(true);
      setRequestError("");

      try {
        const [homepage, accountInfo] = await Promise.all([
          getHomepage(),
          getAccount(),
        ]);
        if (!isCurrent) return;
        setData(homepage);
        setAccount(accountInfo);
      } catch (error: unknown) {
        if (!isCurrent) return;
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setRequestError(LOAD_ERROR_MESSAGE);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadHomepage();
    return () => {
      isCurrent = false;
    };
  }, [navigate, reloadCount]);

  const userName = account?.name ?? "";
  const firstName = userName.trim().split(/\s+/)[0];
  const bp = data?.bp_reading ?? null;
  const medications = data?.medications ?? [];
  const appointment = data?.next_appointment ?? null;
  const appointmentWhen = appointment ? splitAppointmentDate(appointment.appointment_date) : null;

  return (
    <AppLayout activeItem="Home" userName={userName || "Account"} accountLabel="Personal account">
      <div className="home-content">
        <header className="home-heading">
          <h1 className="formTitle home-page-title">
            {firstName ? `Hello, ${firstName}` : "Hello"}
          </h1>
          <p className="mt-1.5 text-base text-gray-600">Here is your health overview for today.</p>
        </header>

        {requestError && (
          <div className="home-request-error" role="alert">
            <p>{requestError}</p>
            <button
              className="mt-2 rounded-lg bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              Try again
            </button>
          </div>
        )}

        <section className="mt-6 min-w-0" aria-labelledby="home-bp-title">
        <h2 className="mb-3 text-xl font-bold text-gray-900" id="home-bp-title">Blood Pressure</h2>
          <div className="home-card home-bp-card">
            <span className="home-bp-label">Last Reading</span>
            {isLoading ? (
              <p className="home-empty" role="status">Loading...</p>
            ) : bp ? (
              <>
                <p className="home-bp-value">
                  {bp.systolic}/{bp.diastolic}
                  <span className="home-bp-unit">mmHg</span>
                </p>
              </>
            ) : (
              <p className="home-empty">No blood pressure readings. Visit the Journal page to add a reading</p>
            )}
          </div>
        </section>

        <div className="home-columns grid grid-cols-1 gap-x-6">
          <section className="mt-6 min-w-0" aria-labelledby="home-meds-title">
            <div className="home-section-header flex items-baseline justify-between gap-3">
              <h2 className="mb-3 text-xl font-bold text-gray-900" id="home-meds-title">Medication Schedule</h2>
            </div>
            <div className="home-card-list grid gap-3">
              {isLoading ? (
                <div className="home-card"><p className="home-empty" role="status">Loading...</p></div>
              ) : medications.length > 0 ? (
                medications.map((medication) => (
                  <article className="home-card home-medication-card flex items-center gap-3.5" key={`${medication.medication_name}-${medication.time}`}>
                    <span className="home-medication-icon grid place-items-center rounded-lg bg-blue-800 text-white" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m7 17 10-10" />
                        <path d="M5 15a4 4 0 0 0 6 6l8-8a4 4 0 0 0-6-6Z" />
                      </svg>
                    </span>
                    <div className="home-medication-details">
                      <h3>{medication.medication_name}</h3>
                      <p>{medication.dosage}</p>
                    </div>
                    <div className="home-pill-box home-medication-time grid justify-items-center gap-1 rounded-lg bg-white text-center">
                      <span>TIME</span>
                      <strong>{medication.time}</strong>
                    </div>
                  </article>
                ))
              ) : (
                <div className="home-card"><p className="home-empty">No medications. Visit the Medications page to add a medication</p></div>
              )}
            </div>
          </section>

          <section className="mt-6 min-w-0" aria-labelledby="home-appointment-title">
            <div className="home-section-header flex items-baseline justify-between gap-3">
              <h2 className="mb-3 text-xl font-bold text-gray-900" id="home-appointment-title">Next Appointment</h2>
            </div>
            <div className="home-card-list grid gap-3">
              {isLoading ? (
                <div className="home-card"><p className="home-empty" role="status">Loading...</p></div>
              ) : appointment && appointmentWhen ? (
                <article className="home-card home-appointment-card flex items-center gap-3.5">
                  <div className="home-appointment-details">
                    <h3>{appointment.doctors_name}</h3>
                    {appointment.notes && <p>{appointment.notes}</p>}
                  </div>
                  <div className="home-pill-box home-appointment-time grid justify-items-center gap-1 rounded-lg bg-white text-center">
                    <strong>{appointmentWhen.date}</strong>
                    {appointmentWhen.time && <span>{appointmentWhen.time}</span>}
                  </div>
                </article>
              ) : (
                <div className="home-card"><p className="home-empty">No appointments. Visit the Appointments page to add an appointment</p></div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;

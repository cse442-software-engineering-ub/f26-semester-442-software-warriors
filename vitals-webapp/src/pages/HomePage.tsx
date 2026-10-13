import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import AddReadingModal from "../components/AddReadingModal";
import { useNavigate } from "react-router-dom";
import { getAccount, getHomepage } from "../api";
import type { AccountInfo, HomepageData } from "../api";
import HealthCard from "../components/HealthCard";

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
  const [isAddingReading, setIsAddingReading] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

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

  return (
    <AppLayout
      activeItem="Home"
      userName={userName || "Account"}
      accountLabel="Personal account"
    >
      <div className="home-content">
        <header className="home-heading">
          <h1 className="formTitle home-page-title">
            {firstName ? `Hello, ${firstName}` : "Hello"}
          </h1>
          <p className="home-intro">
            Here is your health overview for today.
          </p>
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
        <HealthCard
          isLoading={isLoading}
          type="BPCard"
          emptyString="No blood pressure readings. Visit the Journal page to add a reading"
          bloodPressureReading={bp}
        />
        <button
            className="home-add-reading"
            type="button"
            onClick={() => {
              setSavedMessage("");
              setIsAddingReading(true);
            }}
          >
            <span aria-hidden="true">+</span> Add Blood Pressure Reading
          </button>
          {savedMessage && (
            <p className="home-reading-saved" role="status">
              {savedMessage}
            </p>
          )}
        </section>

        <div className="home-columns grid grid-cols-1 gap-x-6">
          <section className="mt-6 min-w-0" aria-labelledby="home-meds-title">
            <div className="home-section-header flex items-baseline justify-between gap-3">
              <h2
                className="mb-3 text-xl font-bold text-gray-900"
                id="home-meds-title"
              >
                Medication Schedule
              </h2>
            </div>
            {medications ? (medications.map((medication) => (
              <div>
              <HealthCard 
                  isLoading={isLoading}
                  type="MedicationCard"
                  emptyString="No medications. Visit the Medications page to add a medication"
                  medication={medication}
                />
                <div className="p-1"/>
              </div>
              ))) : (<div className="home-card"><p className="home-empty">No medications. Visit the Medications page to add a medication</p></div>
            )}
          </section>

          <section className="mt-6 min-w-0" aria-labelledby="home-appointment-title">
          <div className="home-section-header flex items-baseline justify-between gap-3">
            <h2 className="mb-3 text-xl font-bold text-gray-900" id="home-appointment-title">Next Appointment</h2>
          </div>
          <HealthCard 
            isLoading={isLoading}
            type="AppointmentCard"
            emptyString="No appointments. Visit the Appointments page to add an appointment"
            nextAppointment={appointment}
          />
        </section>
        </div>
      </div>
      {isAddingReading && (
        <AddReadingModal
          onClose={() => setIsAddingReading(false)}
          onSaved={(reading) => {
            setIsAddingReading(false);
            setSavedMessage(
              `Reading saved: ${reading.systolic}/${reading.diastolic} mmHg, pulse ${reading.pulse}.`,
            );
            setReloadCount((count) => count + 1); // reload so "Last Reading" shows the new one
          }}
        />
      )}
    </AppLayout>
  );
};

export default HomePage;

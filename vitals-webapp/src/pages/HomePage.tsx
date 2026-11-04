import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import AddReadingModal from "../components/AddReadingModal";
import { Link, useNavigate } from "react-router-dom";
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
  const patientFirstName =
    account?.relatedPersonName?.trim().split(/\s+/)[0] || "your patient";
  const bp = data?.bp_reading ?? null;
  const medications = data?.medications ?? [];
  const appointment = data?.next_appointment ?? null;
  const isCaregiver = account?.isCaregiver ?? Boolean(data?.caregiver_info);
  const canAddReading = !isLoading && data !== null && !isCaregiver;

  return (
    <AppLayout
      activeItem="Home"
      userName={userName || "Account"}
      accountLabel={isCaregiver ? "Caregiver account" : "Personal account"}
    >
      <div className="home-content">
        <header className="home-heading">
          <h1 className="formTitle home-page-title">
            {firstName ? `Hello, ${firstName}` : "Hello"}
          </h1>
          <p className="home-intro">
            {isCaregiver
              ? `Here is ${patientFirstName}’s health overview for today.`
              : "Here is your health overview for today."}
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
          emptyString={
            isCaregiver
              ? "No blood pressure readings."
              : "No blood pressure readings. Add a new reading."
          }
          bloodPressureReading={bp}
        />
        {canAddReading && (
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
        )}
        {canAddReading && savedMessage && (
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
              <Link className="home-see-all" to="/medications">
                See all
              </Link>
            </div>
            {medications && medications.length > 0 ? (
              <div className="home-dashboard-card-list">
                {medications.map((medication) => (
                  <HealthCard
                    key={`${medication.medication_name}-${medication.time}`}
                    isLoading={isLoading}
                    type="MedicationCard"
                    emptyString="No medications. Visit the Medications page to add a medication"
                    medication={medication}
                  />
                ))}
              </div>
            ) : (
              <HealthCard
                isLoading={isLoading}
                type="MedicationCard"
                emptyString="No medications."
              />
            )}
          </section>

          <section className="mt-6 min-w-0" aria-labelledby="home-appointment-title">
          <div className="home-section-header flex items-baseline justify-between gap-3">
            <h2 className="mb-3 text-xl font-bold text-gray-900" id="home-appointment-title">Next Appointment</h2>
            <Link className="home-see-all" to="/appointments">
              See all
            </Link>
          </div>
          <HealthCard 
            isLoading={isLoading}
            type="AppointmentCard"
            emptyString="No appointments."
            nextAppointment={appointment}
          />
        </section>
        </div>
      </div>
      {canAddReading && isAddingReading && (
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

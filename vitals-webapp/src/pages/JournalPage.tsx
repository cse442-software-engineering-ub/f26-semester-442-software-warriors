import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import AddReadingModal from "../components/AddReadingModal";
import { getAccount, getJournal } from "../api";
import type { AccountInfo, JournalData, JournalReading } from "../api";
import "./JournalPage.css";

const EMPTY_MESSAGE = "No blood pressure readings have been recorded yet.";
const PATIENT_EMPTY_MESSAGE = "No blood pressure readings. Add a new reading.";

const isUnauthorized = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (("status" in error && error.status === 401) ||
    ("error" in error && error.error === "You must be logged in."));

const errorMessage = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "error" in error &&
  typeof error.error === "string"
    ? error.error
    : "Could not retrieve journal data.";

const parseReadingDate = (value: string) => {
  const normalized = value
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/,\s*(\d{1,2}:\d{2}\s*[ap]m)$/i, " $1");
  const isSqlDateTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  const date = new Date(
    isSqlDateTime ? value.replace(" ", "T") : normalized,
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatReadingTime = (value: string) => {
  const date = parseReadingDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const dayPeriod =
    parts.find((part) => part.type === "dayPeriod")?.value?.toLowerCase() ?? "";
  return `${hour}:${minute} ${dayPeriod}`;
};

const formatReadingDate = (value: string, month: "short" | "long") => {
  const date = parseReadingDate(value);
  if (!date) return value;
  const monthName = new Intl.DateTimeFormat("en-US", { month }).format(date);
  const day = date.getDate();
  const ordinal =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  return `${monthName} ${day}${ordinal}, ${date.getFullYear()}`;
};

const formatLastMeasured = (reading: JournalReading) =>
  `Last measured ${formatReadingDate(reading.date_time, "long")}, ${formatReadingTime(reading.date_time)}`;

const statusClassName = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized.includes("WITHIN RANGE") || normalized === "NORMAL")
    return "home-status-badge";
  if (normalized.includes("ELEVATED"))
    return "home-status-badge home-status-badge-warn";
  return "home-status-badge home-status-badge-alert";
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={statusClassName(status)}>
    {status.toUpperCase()}
  </span>
);

const ReadingDate = ({
  dateTime,
  month = "long",
}: {
  dateTime: string;
  month?: "short" | "long";
}) => (
  <span className="journal-reading-date">
    <strong>{formatReadingDate(dateTime, month)},</strong>
    <small>{formatReadingTime(dateTime)}</small>
  </span>
);

const ReadingCard = ({ reading }: { reading: JournalReading }) => (
  <article className="journal-mobile-reading">
    <ReadingDate dateTime={reading.date_time} month="short" />
    {reading.pulse !== undefined && (
      <span className="journal-mobile-pulse">
        {reading.pulse} <small>bpm</small>
      </span>
    )}
    <strong className="journal-mobile-pressure">
      {reading.systolic}/{reading.diastolic} <small>mmHg</small>
    </strong>
    <StatusBadge status={reading.status} />
  </article>
);

const JournalPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<JournalData | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [isAddingReading, setIsAddingReading] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadJournal = async () => {
      setIsLoading(true);
      setRequestError("");
      try {
        const [journal, accountInfo] = await Promise.all([
          getJournal(),
          getAccount(),
        ]);
        if (isCurrent) {
          setData(journal);
          setAccount(accountInfo);
        }
      } catch (error: unknown) {
        if (!isCurrent) return;
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setRequestError(errorMessage(error));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadJournal();
    return () => {
      isCurrent = false;
    };
  }, [navigate, reloadCount]);

  const readings = data?.readings ?? [];
  const lastReading = data?.last_reading ?? null;
  const averages = data?.averages ?? null;
  const isCaregiver = account?.isCaregiver ?? Boolean(data?.caregiver_info);
  const patientName =
    account?.relatedPersonName?.trim().split(/\s+/)[0] || null;
  const emptyReadingsMessage = isCaregiver
    ? EMPTY_MESSAGE
    : PATIENT_EMPTY_MESSAGE;
  const canAddReading = !isLoading && data !== null && !isCaregiver;

  return (
    <AppLayout activeItem="Journal">
      <div className="home-content journal-content" aria-busy={isLoading}>
        <header className="home-heading">
          <h1 className="formTitle home-page-title">
            {isCaregiver && patientName
              ? `${patientName}’s Health Journal`
              : "Health Journal"}
          </h1>
          <p className="home-intro">
            {isCaregiver && patientName
              ? `Verify and track ${patientName}’s past and recent readings.`
              : "Measure and track your blood pressure over time."}
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

        <section className="journal-summary-grid" aria-label="Blood pressure summary">
          <article className="home-card home-bp-card journal-last-reading">
            <div className="journal-last-reading-heading">
              <span className="home-bp-label">Last Reading</span>
              {!isLoading && lastReading?.status && (
                <StatusBadge status={lastReading.status} />
              )}
            </div>
            {isLoading ? (
              <p className="home-empty" role="status">Loading...</p>
            ) : lastReading ? (
              <>
                <p className="home-bp-value">
                  {lastReading.systolic}/{lastReading.diastolic}
                  <span className="home-bp-unit">mmHg</span>
                </p>
                <p className="journal-last-measured">
                  {formatLastMeasured(lastReading)}
                </p>
              </>
            ) : (
              <p className="home-empty">{emptyReadingsMessage}</p>
            )}
          </article>

          <article className="journal-average-card">
            <h3>Systolic Average</h3>
            <p><strong>{averages?.systolic ?? "—"}</strong> mmHg</p>
            {typeof averages?.systolic === "number" && (
              <StatusBadge status="WITHIN RANGE" />
            )}
          </article>
          <article className="journal-average-card">
            <h3>Diastolic Average</h3>
            <p><strong>{averages?.diastolic ?? "—"}</strong> mmHg</p>
            {typeof averages?.diastolic === "number" && (
              <StatusBadge status="WITHIN RANGE" />
            )}
          </article>
          <article className="journal-average-card">
            <h3>Pulse Rate Average</h3>
            <p><strong>{averages?.pulse ?? "—"}</strong> bpm</p>
            {typeof averages?.pulse === "number" && (
              <StatusBadge status="WITHIN RANGE" />
            )}
          </article>
        </section>

        <section className="min-w-0" aria-label="Journal actions">
          {canAddReading && (
            <button
              className="home-add-reading"
              type="button"
              onClick={() => setIsAddingReading(true)}
            >
              <span aria-hidden="true">+</span> Add Blood Pressure Reading
            </button>
          )}
        </section>

        <section
          className="mt-6 min-w-0"
          aria-labelledby="journal-log-title"
        >
          <h2
            className="mb-3 text-xl font-bold text-gray-900"
            id="journal-log-title"
          >
            Recent Readings Log
          </h2>
          <div className="home-card journal-log">
            {isLoading ? (
              <p className="home-empty" role="status">
                Loading readings...
              </p>
            ) : readings.length === 0 ? (
              <p className="home-empty">
                {emptyReadingsMessage}
              </p>
            ) : (
              <>
                <div className="journal-table-wrapper">
                  <table className="journal-table">
                    <thead>
                      <tr>
                        <th scope="col">Date &amp; Time</th>
                        <th scope="col">Systolic</th>
                        <th scope="col">Diastolic</th>
                        <th scope="col">Pulse Rate</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.map((reading, index) => (
                        <tr key={`${reading.date_time}-${index}`}>
                          <td>
                            <ReadingDate dateTime={reading.date_time} />
                          </td>
                          <td>{reading.systolic}</td>
                          <td>{reading.diastolic}</td>
                          <td>{reading.pulse ?? ""}</td>
                          <td>
                            <StatusBadge status={reading.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="journal-mobile-readings">
                  {readings.map((reading, index) => (
                    <ReadingCard
                      key={`${reading.date_time}-${index}`}
                      reading={reading}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {canAddReading && isAddingReading && (
        <AddReadingModal
          onClose={() => setIsAddingReading(false)}
          onSaved={() => {
            setIsAddingReading(false);
            setReloadCount((count) => count + 1);
          }}
        />
      )}
    </AppLayout>
  );
};

export default JournalPage;
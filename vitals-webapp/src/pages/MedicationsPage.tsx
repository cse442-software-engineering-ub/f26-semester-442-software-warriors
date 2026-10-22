import AppLayout from "../components/AppLayout";
import "./MedicationsPage.css";

const MedicationsPage = () => (
  <AppLayout activeItem="Medications">
    <div className="medications-content">
      <header className="medications-page-heading">
        <h1>My Medications</h1>
        <p className="medications-intro">Track, organize, and manage your daily medication schedules.</p>
      </header>
    </div>
  </AppLayout>
);

export default MedicationsPage;

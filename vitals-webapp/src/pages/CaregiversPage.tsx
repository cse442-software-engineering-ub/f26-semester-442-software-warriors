import AppLayout from "../components/AppLayout";
import "./MedicationsPage.css";
import "./CaregiversPage.css";

const CaregiversPage = () => (
  <AppLayout activeItem="Caregivers" userName="Account" accountLabel="Personal account">
    <div className="medications-content caregivers-content">
      <button className="caregivers-back-button" type="button">Back to Profile</button>

      <header className="medications-page-heading">
        <h1>Caregivers</h1>
        <p className="medications-intro">Below are cards for your caregivers information</p>
      </header>

      <div className="medications-toolbar">
        <button className="medications-filter-button" type="button">Remove Caregiver</button>
        <button className="medications-add-button" type="button">Add Caregiver</button>
      </div>

      <section className="medications-list" aria-label="Your caregivers">
        <p className="home-empty">No caregivers. Add a caregiver to get started.</p>
      </section>
    </div>
  </AppLayout>
);

export default CaregiversPage;

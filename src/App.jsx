import { Navigate, Route, Routes } from "react-router-dom";
import PublicVenuePage from "./pages/PublicVenuePage.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminReservations from "./pages/AdminReservations.jsx";
import AdminCalendar from "./pages/AdminCalendar.jsx";
import AdminPricing from "./pages/AdminPricing.jsx";
import AdminConfiguration from "./pages/AdminConfiguration.jsx";
import { venues } from "./data/venues.js";

const paraiso = venues.find((venue) => venue.slug === "paraiso-escondido");

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicVenuePage venue={paraiso} />} />
      <Route
        path="/quinta/paraiso-escondido"
        element={<PublicVenuePage venue={paraiso} />}
      />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="reservas" element={<AdminReservations />} />
        <Route path="calendario" element={<AdminCalendar />} />
        <Route path="precios" element={<AdminPricing />} />
        <Route path="configuracion" element={<AdminConfiguration />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

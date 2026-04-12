import { useEffect, useState } from 'react';
import { fetchReservations } from '../api/backend';

export default function ReservationList({ from, to }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!from || !to) return;
    fetchReservations(from, to)
      .then(setReservations)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return <div>Loading reservations...</div>;
  if (error) return <div>Error loading reservations.</div>;

  return (
    <div>
      <h2>Reservations</h2>
      <ul>
        {reservations.map(res => (
          <li key={res.id}>{res.guestName} - {res.suiteName} ({res.status})</li>
        ))}
      </ul>
    </div>
  );
}

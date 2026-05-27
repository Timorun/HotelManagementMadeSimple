import { useEffect, useState } from 'react';
import { fetchReservations } from '../api/backend';
import { useI18n } from '../context/I18nContext';

export default function ReservationList({ from, to }) {
  const { tr } = useI18n();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!from || !to) return;
    fetchReservations(from, to)
      .then(setReservations)
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return <div>{tr('Loading reservations...', 'Cargando reservas...')}</div>;
  if (error) return <div>{tr('Error loading reservations.', 'Error al cargar reservas.')}</div>;

  return (
    <div>
      <h2>{tr('Reservations', 'Reservas')}</h2>
      <ul>
        {reservations.map(res => (
          <li key={res.id}>{res.guestName} - {res.suiteName} ({res.status})</li>
        ))}
      </ul>
    </div>
  );
}

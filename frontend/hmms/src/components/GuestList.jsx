import { useEffect, useState } from 'react';
import { fetchGuests } from '../api/backend';
import { useI18n } from '../context/I18nContext';

export default function GuestList() {
  const { tr } = useI18n();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGuests()
      .then(setGuests)
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>{tr('Loading guests...', 'Cargando huespedes...')}</div>;
  if (error) return <div>{tr('Error loading guests.', 'Error al cargar huespedes.')}</div>;

  return (
    <div>
      <h2>{tr('Guests', 'Huespedes')}</h2>
      <ul>
        {guests.map(guest => (
          <li key={guest.id}>{guest.firstName} {guest.lastName} ({guest.email})</li>
        ))}
      </ul>
    </div>
  );
}

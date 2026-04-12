import { useEffect, useState } from 'react';
import { fetchGuests } from '../api/backend';

export default function GuestList() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGuests()
      .then(setGuests)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading guests...</div>;
  if (error) return <div>Error loading guests.</div>;

  return (
    <div>
      <h2>Guests</h2>
      <ul>
        {guests.map(guest => (
          <li key={guest.id}>{guest.firstName} {guest.lastName} ({guest.email})</li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { fetchNationalities } from '../api/backend';

export default function NationalityList() {
  const [nationalities, setNationalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNationalities()
      .then(setNationalities)
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading nationalities...</div>;
  if (error) return <div>Error loading nationalities.</div>;

  return (
    <div>
      <h2>Nationalities</h2>
      <ul>
        {nationalities.map(nat => (
          <li key={nat.id}>{nat.name}</li>
        ))}
      </ul>
    </div>
  );
}

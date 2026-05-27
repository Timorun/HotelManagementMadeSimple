import { useEffect, useState } from 'react';
import { fetchNationalities } from '../api/backend';
import { useI18n } from '../context/I18nContext';

export default function NationalityList() {
  const { tr } = useI18n();
  const [nationalities, setNationalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNationalities()
      .then(setNationalities)
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>{tr('Loading nationalities...', 'Cargando nacionalidades...')}</div>;
  if (error) return <div>{tr('Error loading nationalities.', 'Error al cargar nacionalidades.')}</div>;

  return (
    <div>
      <h2>{tr('Nationalities', 'Nacionalidades')}</h2>
      <ul>
        {nationalities.map(nat => (
          <li key={nat.id}>{nat.name}</li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { fetchSuites } from '../api/backend';
import { useI18n } from '../context/I18nContext';

export default function SuiteList() {
  const { tr } = useI18n();
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSuites()
      .then(setSuites)
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>{tr('Loading suites...', 'Cargando suites...')}</div>;
  if (error) return <div>{tr('Error loading suites.', 'Error al cargar suites.')}</div>;

  return (
    <div>
      <h2>{tr('Suites', 'Suites')}</h2>
      <ul>
        {suites.map(suite => (
          <li key={suite.id}>{suite.name} ({suite.type})</li>
        ))}
      </ul>
    </div>
  );
}

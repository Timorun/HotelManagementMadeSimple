import { useEffect, useState } from 'react';
import { fetchSuites } from '../api/backend';

export default function SuiteList() {
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSuites()
      .then(setSuites)
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading suites...</div>;
  if (error) return <div>Error loading suites.</div>;

  return (
    <div>
      <h2>Suites</h2>
      <ul>
        {suites.map(suite => (
          <li key={suite.id}>{suite.name} ({suite.type})</li>
        ))}
      </ul>
    </div>
  );
}

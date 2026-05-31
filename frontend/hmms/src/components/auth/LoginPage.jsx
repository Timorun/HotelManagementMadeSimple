import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/today';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(usernameOrEmail, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || t('auth.invalid'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-content" style={{ maxWidth: '480px' }}>
      <div className="card" style={{ marginTop: '4rem' }}>
        <div className="card-header">
          <h2>{t('auth.heading')}</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.usernameOrEmail')}</label>
            <input
              type="text"
              className="form-input"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-accent" disabled={submitting}>
            {submitting ? '...' : t('auth.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { fetchPublicHotel } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';

/**
 * Minimal chrome for guest-facing pages (booking, preferences): hotel name and language switch.
 */
export default function PublicLayout({ children }) {
  const { t, language, setLanguage } = useI18n();
  const [hotelName, setHotelName] = useState(t('appTitle'));

  useEffect(() => {
    fetchPublicHotel()
      .then((hotel) => hotel?.name && setHotelName(hotel.name))
      .catch(() => {});
  }, []);

  return (
    <div className="public-page">
      <header className="public-header">
        <div>
          <div className="public-hotel-name">{hotelName}</div>
          <div className="public-hotel-sub">{t('appSubtitle')}</div>
        </div>
        <select
          className="form-select public-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.label}</option>
          ))}
        </select>
      </header>
      <main className="public-content">{children}</main>
    </div>
  );
}

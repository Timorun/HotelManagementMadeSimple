import { useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { updateSuite } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';
import { AMENITY_KEYS, amenityIcon, amenityLabel } from '../../utils/amenities';
import { isValidPhotoUrl } from '../../utils/suites';

/**
 * Edit what the public booking page shows about a suite: descriptions, size, amenities, photos.
 */
export default function SuiteDetailsModal({ suite, onClose, onSaved }) {
  const { tr } = useI18n();
  const [descriptionEn, setDescriptionEn] = useState(suite.descriptionEn || '');
  const [descriptionEs, setDescriptionEs] = useState(suite.descriptionEs || '');
  const [sizeM2, setSizeM2] = useState(suite.sizeM2 ?? '');
  const [amenities, setAmenities] = useState(suite.amenities || []);
  const [photoUrls, setPhotoUrls] = useState(suite.photoUrls || []);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Keys already on the suite that the editor doesn't know are kept and shown too
  const amenityOptions = [...AMENITY_KEYS, ...amenities.filter((key) => !AMENITY_KEYS.includes(key))];

  const toggleAmenity = (key) => {
    setAmenities((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const movePhoto = (index, offset) => {
    setPhotoUrls((current) => {
      const next = [...current];
      const target = index + offset;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addPhoto = () => {
    const url = newPhotoUrl.trim();
    if (!isValidPhotoUrl(url)) {
      setError(tr('Photo links must start with / or https://', 'Los enlaces de fotos deben empezar por / o https://'));
      return;
    }
    if (!photoUrls.includes(url)) {
      setPhotoUrls((current) => [...current, url]);
    }
    setNewPhotoUrl('');
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // Keep the amenity order of the editor list, so chips always appear in the same order
      const orderedAmenities = amenityOptions.filter((key) => amenities.includes(key));
      await updateSuite(suite.suiteId, {
        suiteName: suite.suiteName,
        capacity: suite.capacity,
        active: suite.active,
        descriptionEn,
        descriptionEs,
        sizeM2: sizeM2 === '' ? 0 : Number(sizeM2),
        amenities: orderedAmenities,
        photoUrls,
      });
      await onSaved(tr(`${suite.suiteName} details saved.`, `Detalles de ${suite.suiteName} guardados.`));
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal suite-details-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">{tr(`${suite.suiteName}: booking page details`, `${suite.suiteName}: detalles para la página de reservas`)}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={tr('Close', 'Cerrar')}>×</button>
        </div>
        <div className="modal-body">
          <label className="form-group">
            <span className="form-label">{tr('Description (English)', 'Descripción (inglés)')}</span>
            <textarea className="form-textarea" rows={4} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
          </label>
          <label className="form-group">
            <span className="form-label">{tr('Description (Spanish)', 'Descripción (español)')}</span>
            <textarea className="form-textarea" rows={4} value={descriptionEs} onChange={(e) => setDescriptionEs(e.target.value)} />
          </label>
          <label className="form-group">
            <span className="form-label">{tr('Size (m²)', 'Tamaño (m²)')}</span>
            <input type="number" min={0} max={1000} className="form-input settings-capacity" value={sizeM2} onChange={(e) => setSizeM2(e.target.value)} />
          </label>

          <div className="form-group">
            <span className="form-label">{tr('Amenities', 'Servicios')}</span>
            <div className="amenity-picker">
              {amenityOptions.map((key) => {
                const Icon = amenityIcon(key);
                return (
                  <label key={key} className={`amenity-option ${amenities.includes(key) ? 'checked' : ''}`}>
                    <input type="checkbox" checked={amenities.includes(key)} onChange={() => toggleAmenity(key)} />
                    <Icon size={15} />
                    {amenityLabel(key, tr)}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <span className="form-label">{tr('Photos (first one is shown first)', 'Fotos (la primera se muestra primero)')}</span>
            <ul className="photo-editor-list">
              {photoUrls.map((url, index) => (
                <li key={url}>
                  <img src={url} alt="" loading="lazy" />
                  <span className="photo-editor-url" title={url}>{url}</span>
                  <span className="photo-editor-actions">
                    <button type="button" className="btn btn-outline btn-sm btn-icon" disabled={index === 0} onClick={() => movePhoto(index, -1)} aria-label={tr('Move up', 'Subir')}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" className="btn btn-outline btn-sm btn-icon" disabled={index === photoUrls.length - 1} onClick={() => movePhoto(index, 1)} aria-label={tr('Move down', 'Bajar')}>
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => setPhotoUrls((current) => current.filter((item) => item !== url))} aria-label={tr('Remove photo', 'Quitar foto')}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              ))}
              {photoUrls.length === 0 && <li className="field-hint">{tr('No photos yet.', 'Aún no hay fotos.')}</li>}
            </ul>
            <div className="calendar-sync-input">
              <input
                className="form-input"
                placeholder="https://… / /suites/…"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPhoto();
                  }
                }}
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={addPhoto}>
                <ImagePlus size={14} /> {tr('Add', 'Añadir')}
              </button>
            </div>
            <span className="field-hint">
              {tr(
                'Paste a link to an image, e.g. from your website. Photos shipped with the app start with /suites/.',
                'Pega un enlace a una imagen, p. ej. de tu web. Las fotos incluidas en la app empiezan por /suites/.',
              )}
            </span>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>{tr('Cancel', 'Cancelar')}</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{tr('Save details', 'Guardar detalles')}</button>
        </div>
      </div>
    </div>
  );
}

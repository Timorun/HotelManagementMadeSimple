import { useState } from 'react';
import { Check, Maximize2, Users } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { amenityIcon, amenityLabel } from '../../utils/amenities';
import { suiteDescription } from '../../utils/suites';
import PhotoGallery from '../common/PhotoGallery';

// Descriptions longer than this are folded behind "Read more"
const SHORT_DESCRIPTION_CHARS = 220;

/**
 * A suite on the public booking page: photos, key facts, amenities and description.
 */
export default function SuiteCard({ suite, selected, onChoose }) {
  const { tr, language } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const description = suiteDescription(suite, language);
  const isLong = description.length > SHORT_DESCRIPTION_CHARS;
  const clamped = isLong && !expanded;

  return (
    <article className={`suite-card ${selected ? 'selected' : ''}`}>
      <PhotoGallery photos={suite.photoUrls || []} alt={suite.suiteName} />
      <div className="suite-card-body">
        <h4 className="suite-card-title">{suite.suiteName}</h4>
        <div className="suite-card-facts">
          <span><Users size={15} /> {tr(`Up to ${suite.capacity} guests`, `Hasta ${suite.capacity} huéspedes`)}</span>
          {suite.sizeM2 > 0 && <span><Maximize2 size={15} /> {suite.sizeM2} m²</span>}
        </div>

        {suite.amenities?.length > 0 && (
          <ul className="amenity-chips">
            {suite.amenities.map((key) => {
              const Icon = amenityIcon(key);
              return (
                <li key={key}>
                  <Icon size={14} />
                  {amenityLabel(key, tr)}
                </li>
              );
            })}
          </ul>
        )}

        {description && (
          <>
            {/* Folded: paragraphs run on, so the four visible lines are all text */}
            <p className={`suite-card-description ${clamped ? 'clamped' : ''}`}>
              {clamped ? description.replace(/\s*\n+\s*/g, ' ') : description}
            </p>
            {isLong && (
              <button type="button" className="link-button" onClick={() => setExpanded((value) => !value)}>
                {expanded ? tr('Show less', 'Mostrar menos') : tr('Read more', 'Leer más')}
              </button>
            )}
          </>
        )}

        <button type="button" className={`btn ${selected ? 'btn-success' : 'btn-accent'} suite-card-choose`} onClick={onChoose}>
          {selected ? <><Check size={16} /> {tr('Selected', 'Seleccionada')}</> : tr('Choose this suite', 'Elegir esta suite')}
        </button>
      </div>
    </article>
  );
}

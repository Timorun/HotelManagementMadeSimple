import { useEffect, useMemo, useState } from 'react';
import { fetchGuests, createGuest, updateGuest, fetchNationalities, anonymizeGuest } from '../api/backend';
import { Users, Plus, Edit, Search, Globe, UserX, Download, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { exportRowsToExcel } from '../utils/excelExport';
import { useI18n } from '../context/I18nContext';
import { copyTextToClipboard } from '../utils/clipboard';

function normalizeNamePart(value) {
  return String(value || '').trim().toLowerCase();
}

function buildWhatsAppLink(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned.replace(/^0+/, '');
  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized}`;
}

export default function GuestManagement() {
  const { t } = useI18n();
  const [guests, setGuests] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [anonymizeTarget, setAnonymizeTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [guestTypeFilter, setGuestTypeFilter] = useState('all');
  const [marketingFilter, setMarketingFilter] = useState('all');
  const [nationalityFilter, setNationalityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [copiedContactKey, setCopiedContactKey] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalityCode: '',
    notes: '',
    marketingConsent: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const guestsMatchingPrimaryFilters = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    return guests.filter((guest) => {
      const fullName = `${guest.firstName || ''} ${guest.lastName || ''}`.toLowerCase();
      const email = (guest.email || '').toLowerCase();
      const searchMatches = !searchTerm || fullName.includes(normalizedSearch) || email.includes(normalizedSearch);

      const guestTypeMatches = guestTypeFilter === 'all'
        || (guestTypeFilter === 'anonymized' && guest.anonymized)
        || (guestTypeFilter === 'active' && !guest.anonymized);

      const marketingMatches = marketingFilter === 'all'
        || (marketingFilter === 'yes' && guest.marketingConsent)
        || (marketingFilter === 'no' && !guest.marketingConsent);

      return searchMatches && guestTypeMatches && marketingMatches;
    });
  }, [guests, searchTerm, guestTypeFilter, marketingFilter]);

  const availableNationalityOptions = useMemo(() => {
    const optionMap = new Map();

    guestsMatchingPrimaryFilters.forEach((guest) => {
      const rawCode = String(guest.nationalityCode || '').trim();
      const rawName = String(guest.nationalityName || '').trim();
      const value = (rawCode || rawName).toLowerCase();
      const label = rawName || rawCode;

      if (!value || !label) {
        return;
      }

      if (!optionMap.has(value)) {
        optionMap.set(value, label);
      }
    });

    return Array.from(optionMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));
  }, [guestsMatchingPrimaryFilters]);

  useEffect(() => {
    const selectedNationality = nationalityFilter.toLowerCase();

    const filtered = guestsMatchingPrimaryFilters.filter((guest) => {
      const guestNationalityCode = String(guest.nationalityCode || '').toLowerCase();
      const guestNationalityName = String(guest.nationalityName || '').toLowerCase();
      return selectedNationality === 'all'
        || guestNationalityCode === selectedNationality
        || guestNationalityName === selectedNationality;
    });

    const sorted = [...filtered].sort((left, right) => {
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortBy === 'reservations') {
        const leftCount = Number(left.reservationCount || 0);
        const rightCount = Number(right.reservationCount || 0);

        if (leftCount === rightCount) {
          return (Number(left.guestId || 0) - Number(right.guestId || 0)) * directionMultiplier;
        }

        return (leftCount - rightCount) * directionMultiplier;
      }

      const leftName = left.anonymized
        ? `Anonymous guest #${left.guestId}`
        : `${left.firstName || ''} ${left.lastName || ''}`.trim();
      const rightName = right.anonymized
        ? `Anonymous guest #${right.guestId}`
        : `${right.firstName || ''} ${right.lastName || ''}`.trim();

      return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' }) * directionMultiplier;
    });

    setFilteredGuests(sorted);
  }, [guestsMatchingPrimaryFilters, nationalityFilter, sortBy, sortDirection]);

  useEffect(() => {
    if (nationalityFilter === 'all') {
      return;
    }

    if (!availableNationalityOptions.some((option) => option.value === nationalityFilter)) {
      setNationalityFilter('all');
    }
  }, [availableNationalityOptions, nationalityFilter]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchGuests(),
      fetchNationalities(),
    ])
      .then(([guestsData, nationalitiesData]) => {
        setGuests(guestsData);
        setFilteredGuests(guestsData);
        setNationalities(nationalitiesData);
      })
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  };

  const openNewGuestModal = () => {
    setEditingGuest(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationalityCode: '',
      notes: '',
      marketingConsent: false,
    });
    setShowModal(true);
  };

  const openEditModal = (guest) => {
    setEditingGuest(guest);
    setFormData({
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone || '',
      nationalityCode: guest.nationalityCode || '',
      notes: guest.notes || '',
      marketingConsent: guest.marketingConsent || false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedFirst = normalizeNamePart(formData.firstName);
    const normalizedLast = normalizeNamePart(formData.lastName);
    const duplicateNameExists = guests.some((guest) => {
      if (guest.anonymized) {
        return false;
      }

      if (editingGuest && Number(guest.guestId) === Number(editingGuest.guestId)) {
        return false;
      }

      return normalizeNamePart(guest.firstName) === normalizedFirst
        && normalizeNamePart(guest.lastName) === normalizedLast;
    });

    if (duplicateNameExists) {
      const duplicateMessage = 'A guest with this first and last name already exists.';
      setError(duplicateMessage);
      window.alert(duplicateMessage);
      return;
    }

    try {
      if (editingGuest) {
        const updatedGuest = await updateGuest(editingGuest.guestId, formData);
        setGuests((prev) => prev.map((guest) => (
          Number(guest.guestId) === Number(editingGuest.guestId) ? updatedGuest : guest
        )));
      } else {
        const createdGuest = await createGuest(formData);
        setGuests((prev) => [createdGuest, ...prev]);
      }

      setError(null);
      setShowModal(false);
    } catch (err) {
      const errorMessage = err?.message || 'Failed to save guest';
      setError(errorMessage);
      if (errorMessage.toLowerCase().includes('already exists')) {
        window.alert(errorMessage);
      }
    }
  };

  const handleAnonymize = (guest) => {
    setAnonymizeTarget(guest);
  };

  const confirmAnonymize = async () => {
    if (!anonymizeTarget) return;
    try {
      const anonymizedGuest = await anonymizeGuest(anonymizeTarget.guestId);
      setGuests((prev) => prev.map((guest) => (
        Number(guest.guestId) === Number(anonymizeTarget.guestId) ? anonymizedGuest : guest
      )));
      setAnonymizeTarget(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const cancelAnonymize = () => {
    setAnonymizeTarget(null);
  };

  const handleExport = () => {
    const rows = filteredGuests.map((guest) => ({
      id: guest.guestId,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email || '',
      phone: guest.phone || '',
      nationality: guest.nationalityName || '',
      reservationCount: guest.reservationCount || 0,
      marketingConsent: guest.marketingConsent ? 'Yes' : 'No',
      anonymized: guest.anonymized ? 'Yes' : 'No',
      anonymizedAt: guest.anonymizedAt || '',
    }));

    exportRowsToExcel(rows, 'guests-export.xlsx', 'Guests');
  };

  const activeGuestFilterCount = useMemo(() => {
    return [
      Boolean(searchTerm.trim()),
      guestTypeFilter !== 'all',
      marketingFilter !== 'all',
      nationalityFilter !== 'all',
    ].filter(Boolean).length;
  }, [searchTerm, guestTypeFilter, marketingFilter, nationalityFilter]);

  const clearGuestListFilters = () => {
    setSearchTerm('');
    setGuestTypeFilter('all');
    setMarketingFilter('all');
    setNationalityFilter('all');
  };

  const handleTableSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(field);
    setSortDirection('asc');
  };

  const getSortIndicator = (field) => {
    if (sortBy !== field) {
      return '↕';
    }

    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getAriaSort = (field) => (
    sortBy === field
      ? (sortDirection === 'asc' ? 'ascending' : 'descending')
      : 'none'
  );

  const handleCopyContact = async (value, contactKey) => {
    const copied = await copyTextToClipboard(value);
    if (!copied) {
      setError('Unable to copy to clipboard. Please copy manually.');
      return;
    }

    setCopiedContactKey(contactKey);
    window.setTimeout(() => {
      setCopiedContactKey((current) => (current === contactKey ? null : current));
    }, 1400);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading guests...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>
            <Users size={28} />
            Guest Management
          </h2>
          <button onClick={openNewGuestModal} className="btn btn-accent">
            <Plus size={16} />
            New Guest
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-group reservation-filters-panel guest-filters-panel">
          <div className="list-filters-head">
            <div>
              <h3 className="list-filters-title">Filter Guests</h3>
              <p className="list-filters-subtitle">Search by identity and refine by profile tags or activity.</p>
            </div>
            <div className="list-filters-actions">
              <span className="list-filters-count">{filteredGuests.length} shown</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleExport}>
                <Download size={16} />
                {t('filters.exportExcel')}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={clearGuestListFilters}
                disabled={activeGuestFilterCount === 0}
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="guest-filters-grid">
            <div className="guest-search-field" style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search guests by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', color: 'var(--gray)' }} size={20} />
            </div>
            <select className="form-select" value={guestTypeFilter} onChange={(e) => setGuestTypeFilter(e.target.value)}>
              <option value="all">{t('filters.all')}</option>
              <option value="active">{t('filters.active')}</option>
              <option value="anonymized">{t('filters.anonymized')}</option>
            </select>
            <select className="form-select" value={marketingFilter} onChange={(e) => setMarketingFilter(e.target.value)}>
              <option value="all">Marketing: {t('filters.all')}</option>
              <option value="yes">Marketing: Yes</option>
              <option value="no">Marketing: No</option>
            </select>
            <select className="form-select" value={nationalityFilter} onChange={(e) => setNationalityFilter(e.target.value)}>
              <option value="all">Nationality: {t('filters.all')}</option>
              {availableNationalityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredGuests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>{searchTerm ? 'No guests found matching your search' : 'No guests in the system'}</p>
          </div>
        ) : (
          <table className="data-table guest-table">
            <thead>
              <tr>
                <th>ID</th>
                <th aria-sort={getAriaSort('name')}>
                  <button
                    type="button"
                    className={`sort-header-btn ${sortBy === 'name' ? 'active' : ''}`}
                    onClick={() => handleTableSort('name')}
                  >
                    <span>Name</span>
                    <span className="sort-indicator" aria-hidden="true">{getSortIndicator('name')}</span>
                  </button>
                </th>
                <th>Email</th>
                <th>Phone</th>
                <th>Nationality</th>
                <th aria-sort={getAriaSort('reservations')}>
                  <button
                    type="button"
                    className={`sort-header-btn ${sortBy === 'reservations' ? 'active' : ''}`}
                    onClick={() => handleTableSort('reservations')}
                  >
                    <span>Reservations</span>
                    <span className="sort-indicator" aria-hidden="true">{getSortIndicator('reservations')}</span>
                  </button>
                </th>
                <th>Marketing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => {
                const whatsappLink = buildWhatsAppLink(guest.phone);
                const emailCopyKey = `guest-email-${guest.guestId}`;
                const phoneCopyKey = `guest-phone-${guest.guestId}`;

                return (
                  <tr key={guest.guestId}>
                    <td>#{guest.guestId}</td>
                    <td style={{ fontWeight: 600 }}>
                      {guest.anonymized && (
                        <span style={{ color: 'var(--dark-gray)' }}>Anonymized/Deleted</span>
                      )}
                      {!guest.anonymized && (
                        <span>{guest.firstName} {guest.lastName}</span>
                      )}
                    </td>
                    <td>
                      <div className="contact-cell">
                        {guest.anonymized ? 'Anonymized' : (
                          guest.email
                            ? (
                              <span className="contact-data-group">
                                <span className="contact-value" title={guest.email}>{guest.email}</span>
                                <span className="contact-actions-inline guest-contact-actions">
                                  <a
                                    className="contact-action-btn action-primary compact"
                                    href={`mailto:${guest.email}`}
                                    aria-label={`Send email to ${guest.firstName} ${guest.lastName}`}
                                    title="Send email"
                                  >
                                    <Send size={12} />                                    
                                  </a>
                                  <button
                                    type="button"
                                    className="contact-action-btn action-copy compact"
                                    onClick={() => handleCopyContact(guest.email, emailCopyKey)}
                                    aria-label={`Copy email for ${guest.firstName} ${guest.lastName}`}
                                    title={copiedContactKey === emailCopyKey ? 'Copied' : 'Copy email'}
                                  >
                                    {copiedContactKey === emailCopyKey ? <Check size={11} /> : <Copy size={11} />}
                                  </button>
                                </span>
                              </span>
                            )
                            : '-'
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        {guest.anonymized ? 'Anonymized' : (
                          guest.phone
                            ? (
                              <span className="contact-data-group">
                                <span className="contact-value" title={guest.phone}>{guest.phone}</span>
                                <span className="contact-actions-inline guest-contact-actions">
                                  {whatsappLink ? (
                                    <a
                                      className="contact-action-btn action-whatsapp compact"
                                      href={whatsappLink}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      aria-label={`Open WhatsApp chat for ${guest.firstName} ${guest.lastName}`}
                                      title="Open WhatsApp"
                                    >
                                      <MessageCircle size={11} />
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="contact-action-btn action-copy compact"
                                    onClick={() => handleCopyContact(guest.phone, phoneCopyKey)}
                                    aria-label={`Copy phone for ${guest.firstName} ${guest.lastName}`}
                                    title={copiedContactKey === phoneCopyKey ? 'Copied' : 'Copy phone'}
                                  >
                                    {copiedContactKey === phoneCopyKey ? <Check size={11} /> : <Copy size={11} />}
                                  </button>
                                </span>
                              </span>
                            )
                            : '-'
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={14} color="var(--dark-gray)" />
                        {guest.nationalityName || '-'}
                      </div>
                    </td>
                    <td>
                      <span className="status-badge status-confirmed">
                        {guest.reservationCount || 0}
                      </span>
                    </td>
                    <td>
                      {guest.marketingConsent ? (
                        <span className="status-badge status-checked-in">Yes</span>
                      ) : (
                        <span className="status-badge status-cancelled">No</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEditModal(guest)}
                          className="btn btn-primary btn-sm"
                          disabled={guest.anonymized}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleAnonymize(guest)}
                          className="btn btn-danger btn-sm"
                          disabled={guest.anonymized}
                          title="Anonymize guest"
                        >
                          <UserX size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="mt-3" style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Total Guests: {guests.length}</span>
          </div>
        </div>
      </div>

      {anonymizeTarget && (
        <div className="modal-overlay" onClick={cancelAnonymize}>
          <div className="modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                <UserX size={22} />
                Anonymize Guest
              </h3>
              <button className="modal-close" onClick={cancelAnonymize}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                You are about to anonymize <strong>{anonymizeTarget.firstName} {anonymizeTarget.lastName}</strong>.
              </p>
              <div
                style={{
                  background: 'rgba(231, 76, 60, 0.08)',
                  border: '1px solid rgba(231, 76, 60, 0.35)',
                  borderRadius: '8px',
                  padding: '0.9rem',
                }}
              >
                <p style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: '0.5rem' }}>
                  This action cannot be undone.
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.5 }}>
                  <li>Personal details such as name, email, and phone will be removed.</li>
                  <li>Reservation history remains available for reporting and accounting.</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={cancelAnonymize} className="btn btn-outline">
                Keep Guest Data
              </button>
              <button type="button" onClick={confirmAnonymize} className="btn btn-danger">
                <UserX size={16} />
                Yes, Anonymize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingGuest ? 'Edit Guest' : 'New Guest'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+31 6 12345678"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nationality</label>
                  <select
                    className="form-select"
                    value={formData.nationalityCode}
                    onChange={(e) => setFormData({ ...formData, nationalityCode: e.target.value })}
                  >
                    <option value="">Select nationality</option>
                    {nationalities.map(nat => (
                      <option key={nat.nationalityCode} value={nat.nationalityCode}>{nat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Guest Notes</label>
                  <textarea
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Guest profile notes (preferences, allergies, communication reminders)."
                  />
                  <small style={{ color: 'var(--dark-gray)' }}>
                    Saved on the guest profile and visible on all reservations for this guest.
                  </small>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.marketingConsent}
                      onChange={(e) => setFormData({ ...formData, marketingConsent: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    <span>Marketing consent (emails, newsletters)</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent">
                  {editingGuest ? 'Update' : 'Create'} Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

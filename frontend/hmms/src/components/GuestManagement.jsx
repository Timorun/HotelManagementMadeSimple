import { useEffect, useState } from 'react';
import { fetchGuests, createGuest, updateGuest, fetchNationalities, anonymizeGuest } from '../api/backend';
import { Users, Plus, Edit, Search, Mail, Phone, Globe, UserX, Download } from 'lucide-react';
import { exportRowsToExcel } from '../utils/excelExport';
import { useI18n } from '../context/I18nContext';

export default function GuestManagement() {
  const { t } = useI18n();
  const [guests, setGuests] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [guestTypeFilter, setGuestTypeFilter] = useState('all');
  const [marketingFilter, setMarketingFilter] = useState('all');

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

  useEffect(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    const filtered = guests.filter((guest) => {
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

    setFilteredGuests(filtered);
  }, [searchTerm, guests, guestTypeFilter, marketingFilter]);

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
    try {
      if (editingGuest) {
        await updateGuest(editingGuest.guestId, formData);
      } else {
        await createGuest(formData);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAnonymize = async (guest) => {
    const confirmed = window.confirm(`Anonymize ${guest.firstName} ${guest.lastName}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await anonymizeGuest(guest.guestId);
      loadData();
    } catch (err) {
      setError(err.message);
    }
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

        <div className="form-group">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
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
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={16} />
              {t('filters.exportExcel')}
            </button>
          </div>
        </div>

        {filteredGuests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>{searchTerm ? 'No guests found matching your search' : 'No guests in the system'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Nationality</th>
                <th>Reservations</th>
                <th>Marketing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr key={guest.guestId}>
                  <td>#{guest.guestId}</td>
                  <td style={{ fontWeight: 600 }}>
                    {guest.anonymized ? `Anonymous guest #${guest.guestId}` : `${guest.firstName} ${guest.lastName}`}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={14} color="var(--dark-gray)" />
                      {guest.anonymized ? 'Anonymized' : guest.email || '-'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={14} color="var(--dark-gray)" />
                      {guest.anonymized ? 'Anonymized' : guest.phone || '-'}
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
                        <UserX size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-3" style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Total Guests: {guests.length}</span>
            <span>Marketing Opt-in: {guests.filter(g => g.marketingConsent).length}</span>
          </div>
        </div>
      </div>

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
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes, preferences, special requirements..."
                  />
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

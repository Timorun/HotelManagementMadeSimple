import { useEffect, useState } from 'react';
import { fetchReservations, fetchSuites, fetchNationalities, createReservation, updateReservation, cancelReservation, searchGuests } from '../api/backend';
import { Calendar, Plus, Edit, X, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function ReservationManagement() {
  const [reservations, setReservations] = useState([]);
  const [suites, setSuites] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [dateFrom, setDateFrom] = useState(format(new Date(2026, 0, 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(2026, 0, 31), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [guestSearchResults, setGuestSearchResults] = useState([]);

  const [formData, setFormData] = useState({
    suiteId: '',
    checkIn: '',
    checkOut: '',
    numGuests: 2,
    priceTotal: '',
    channel: 'direct',
    guestId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalityCode: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchReservations(dateFrom, dateTo),
      fetchSuites(),
      fetchNationalities(),
    ])
      .then(([reservationsData, suitesData, nationalitiesData]) => {
        setReservations(reservationsData);
        setSuites(suitesData);
        setNationalities(nationalitiesData);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  const handleSearchGuests = async (lastName) => {
    if (lastName.length < 2) {
      setGuestSearchResults([]);
      return;
    }
    try {
      const results = await searchGuests(lastName);
      setGuestSearchResults(results);
    } catch (err) {
      console.error('Guest search failed:', err);
    }
  };

  const handleSelectGuest = (guest) => {
    setFormData({
      ...formData,
      guestId: guest.guestId,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      nationalityCode: guest.nationalityCode,
    });
    setGuestSearchResults([]);
    setSearchTerm('');
  };

  const openNewReservationModal = () => {
    setEditingReservation(null);
    setFormData({
      suiteId: '',
      checkIn: '',
      checkOut: '',
      numGuests: 2,
      priceTotal: '',
      channel: 'direct',
      guestId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationalityCode: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (reservation) => {
    setEditingReservation(reservation);
    setFormData({
      suiteId: reservation.suiteId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      numGuests: reservation.numGuests,
      priceTotal: reservation.priceTotal,
      channel: reservation.channel,
      guestId: reservation.guestId,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationalityCode: '',
      notes: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReservation) {
        await updateReservation(editingReservation.reservationId, {
          suiteId: parseInt(formData.suiteId),
          guestId: formData.guestId ? parseInt(formData.guestId) : undefined,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          numGuests: parseInt(formData.numGuests),
          priceTotal: parseFloat(formData.priceTotal),
          channel: formData.channel,
        });
      } else {
        await createReservation({
          suiteId: parseInt(formData.suiteId),
          guestId: formData.guestId ? parseInt(formData.guestId) : undefined,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          numGuests: parseInt(formData.numGuests),
          priceTotal: parseFloat(formData.priceTotal),
          channel: formData.channel,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          nationalityCode: formData.nationalityCode,
          notes: formData.notes,
        });
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = async (id) => {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      try {
        await cancelReservation(id);
        loadData();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      confirmed: 'status-confirmed',
      checked_in: 'status-checked-in',
      cancelled: 'status-cancelled',
      pending: 'status-pending',
    };
    return `status-badge ${statusMap[status] || ''}`;
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading reservations...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>
            <Calendar size={28} />
            Reservation Management
          </h2>
          <button onClick={openNewReservationModal} className="btn btn-accent">
            <Plus size={16} />
            New Reservation
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-group">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label className="form-label">From:</label>
              <input
                type="date"
                className="form-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">To:</label>
              <input
                type="date"
                className="form-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        {reservations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No reservations found for this date range</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Guest</th>
                <th>Suite</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Guests</th>
                <th>Price</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => (
                <tr key={res.reservationId}>
                  <td>#{res.reservationId}</td>
                  <td style={{ fontWeight: 600 }}>{res.guestName}</td>
                  <td>{res.suiteName}</td>
                  <td>{res.checkIn}</td>
                  <td>{res.checkOut}</td>
                  <td>{res.numGuests}</td>
                  <td>€{res.priceTotal}</td>
                  <td style={{ textTransform: 'capitalize' }}>{res.channel}</td>
                  <td>
                    <span className={getStatusBadgeClass(res.status)}>
                      {res.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(res)}
                        className="btn btn-primary btn-sm"
                        disabled={res.status === 'cancelled'}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleCancel(res.reservationId)}
                        className="btn btn-danger btn-sm"
                        disabled={res.status === 'cancelled'}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingReservation ? 'Edit Reservation' : 'New Reservation'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Guest Search */}
                {!editingReservation && (
                  <div className="form-group">
                    <label className="form-label">Search Existing Guest</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter last name..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          handleSearchGuests(e.target.value);
                        }}
                      />
                      <Search style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', color: 'var(--gray)' }} size={20} />
                    </div>
                    {guestSearchResults.length > 0 && (
                      <div style={{
                        border: '1px solid var(--gray)',
                        borderRadius: '6px',
                        marginTop: '0.5rem',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'white',
                      }}>
                        {guestSearchResults.map(guest => (
                          <div
                            key={guest.guestId}
                            onClick={() => handleSelectGuest(guest)}
                            style={{
                              padding: '0.75rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--light-gray)',
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--light-gray)'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                          >
                            <div style={{ fontWeight: 600 }}>{guest.firstName} {guest.lastName}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>{guest.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Guest Information (for new reservations) */}
                {!editingReservation && !formData.guestId && (
                  <>
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
                          <option key={nat.code} value={nat.code}>{nat.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {formData.guestId && (
                  <div className="success-message">
                    Selected: {formData.firstName} {formData.lastName} ({formData.email})
                  </div>
                )}

                {/* Reservation Details */}
                <div className="form-group">
                  <label className="form-label">Suite *</label>
                  <select
                    className="form-select"
                    value={formData.suiteId}
                    onChange={(e) => setFormData({ ...formData, suiteId: e.target.value })}
                    required
                  >
                    <option value="">Select suite</option>
                    {suites.filter(s => s.active).map(suite => (
                      <option key={suite.suiteId} value={suite.suiteId}>
                        {suite.suiteName} (Capacity: {suite.capacity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Check-In *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Check-Out *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Guests *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.numGuests}
                    onChange={(e) => setFormData({ ...formData, numGuests: e.target.value })}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Price (€) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.priceTotal}
                    onChange={(e) => setFormData({ ...formData, priceTotal: e.target.value })}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Booking Channel *</label>
                  <select
                    className="form-select"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    required
                  >
                    <option value="direct">Direct</option>
                    <option value="booking.com">Booking.com</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="expedia">Expedia</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {!editingReservation && (
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-textarea"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Special requests, dietary requirements, etc."
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent">
                  {editingReservation ? 'Update' : 'Create'} Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

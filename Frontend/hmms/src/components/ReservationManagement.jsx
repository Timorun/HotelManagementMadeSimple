import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { fetchReservations, fetchSuites, fetchNationalities, createReservation, updateReservation, cancelReservation, searchGuests, updateReservationStatus } from '../api/backend';
import { Calendar, Plus, Edit, X, Search, AlertCircle, CheckCircle, Users, DollarSign } from 'lucide-react';
import { format, differenceInDays, parseISO, isBefore, addDays } from 'date-fns';
import { STATUS_META } from '../api/reservationStatus';

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
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const searchTimerRef = useRef(null);

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
    status: 'pending',
  });

  // Toast notification handler
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Calculate nights and suggested price
  const nightsCount = useMemo(() => {
    if (formData.checkIn && formData.checkOut) {
      try {
        const nights = differenceInDays(parseISO(formData.checkOut), parseISO(formData.checkIn));
        return nights > 0 ? nights : 0;
      } catch (err) {
        console.error('Date parsing error:', err);
        return 0;
      }
    }
    return 0;
  }, [formData.checkIn, formData.checkOut]);

  const selectedSuite = useMemo(() => 
    suites.find(s => s.suiteId === parseInt(formData.suiteId)),
    [suites, formData.suiteId]
  );

  const suggestedPrice = useMemo(() => {
    if (selectedSuite && nightsCount > 0) {
      return (selectedSuite.basePrice * nightsCount).toFixed(2);
    }
    return '';
  }, [selectedSuite, nightsCount]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
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
      .catch(err => {
        const errorMsg = err.message || 'Failed to load data';
        setError(errorMsg);
        showToast(errorMsg, 'error');
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, showToast]);

  const handleSearchGuests = useCallback(async (lastName) => {
    if (lastName.length < 2) {
      setGuestSearchResults([]);
      return;
    }
    
    // Debounce search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchGuests(lastName);
        setGuestSearchResults(results);
      } catch (err) {
        console.error('Guest search failed:', err);
        showToast('Failed to search guests', 'error');
      }
    }, 300); // 300ms debounce
  }, [showToast]);

  const handleSelectGuest = useCallback((guest) => {
    setFormData(prev => ({
      ...prev,
      guestId: guest.guestId,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone || '',
      nationalityCode: guest.nationalityCode || '',
    }));
    setGuestSearchResults([]);
    setSearchTerm('');
  }, []);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};
    
    // Suite validation
    if (!formData.suiteId) {
      errors.suiteId = 'Please select a suite';
    }
    
    // Date validation
    if (!formData.checkIn) {
      errors.checkIn = 'Check-in date is required';
    }
    if (!formData.checkOut) {
      errors.checkOut = 'Check-out date is required';
    }
    if (formData.checkIn && formData.checkOut) {
      try {
        const checkInDate = parseISO(formData.checkIn);
        const checkOutDate = parseISO(formData.checkOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isBefore(checkInDate, today) && !editingReservation) {
          errors.checkIn = 'Check-in date cannot be in the past';
        }
        if (isBefore(checkOutDate, checkInDate) || checkOutDate.getTime() === checkInDate.getTime()) {
          errors.checkOut = 'Check-out must be after check-in';
        }
        if (nightsCount > 365) {
          errors.checkOut = 'Reservation cannot exceed 365 nights';
        }
      } catch (err) {
        errors.checkIn = 'Invalid date format';
      }
    }
    
    // Capacity validation
    if (selectedSuite && formData.numGuests > selectedSuite.capacity) {
      errors.numGuests = `Maximum capacity is ${selectedSuite.capacity} guests`;
    }
    if (formData.numGuests < 1) {
      errors.numGuests = 'At least 1 guest is required';
    }
    
    // Price validation
    if (!formData.priceTotal || parseFloat(formData.priceTotal) <= 0) {
      errors.priceTotal = 'Please enter a valid price';
    }
    
    // Guest information validation (for new reservations without existing guest)
    if (!editingReservation && !formData.guestId) {
      if (!formData.firstName?.trim()) {
        errors.firstName = 'First name is required';
      }
      if (!formData.lastName?.trim()) {
        errors.lastName = 'Last name is required';
      }
      if (!formData.email?.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, selectedSuite, nightsCount, editingReservation]);

  const openNewReservationModal = useCallback(() => {
    setEditingReservation(null);
    setValidationErrors({});
    setError(null);
    setFormData({
      suiteId: '',
      checkIn: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      checkOut: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
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
  }, []);

  const openEditModal = useCallback((reservation) => {
    setEditingReservation(reservation);
    setValidationErrors({});
    setError(null);
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
      status: reservation.status || 'pending',
    });
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      showToast('Please fix validation errors', 'error');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      if (editingReservation) {
        // Check if status changed
        const statusChanged = formData.status !== editingReservation.status;

        // Update reservation
        await updateReservation(editingReservation.reservationId, {
          suiteId: parseInt(formData.suiteId),
          guestId: formData.guestId ? parseInt(formData.guestId) : undefined,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          numGuests: parseInt(formData.numGuests),
          priceTotal: parseFloat(formData.priceTotal),
          channel: formData.channel,
        });

        // Update status if changed
        if (statusChanged) {
          await updateReservationStatus(editingReservation.reservationId, formData.status);
        }

        showToast('Reservation updated successfully', 'success');
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
        showToast('Reservation created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      const errorMsg = err?.message || 'Failed to save reservation';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [editingReservation, formData, loadData, showToast, validateForm]);

  const handleCancel = useCallback((reservation) => {
    setConfirmDialog({
      title: 'Cancel Reservation',
      message: `Are you sure you want to cancel the reservation for ${reservation.guestName}?`,
      onConfirm: async () => {
        try {
          await cancelReservation(reservation.reservationId);
          showToast('Reservation cancelled successfully', 'success');
          loadData();
        } catch (err) {
          const errorMsg = err?.message || 'Failed to cancel reservation';
          setError(errorMsg);
          showToast(errorMsg, 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  }, [loadData, showToast]);

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
      {/* Toast Notification */}
      {toast && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10000,
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <div 
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
              color: 'white',
              minWidth: '300px',
            }}
          >
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span style={{ flex: 1, fontWeight: 500 }}>{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: 0,
                lineHeight: 1,
              }}
            >×</button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={confirmDialog.onCancel}>
          <div 
            className="modal" 
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">{confirmDialog.title}</h3>
            </div>
            <div className="modal-body">
              <p>{confirmDialog.message}</p>
            </div>
            <div className="modal-footer">
              <button 
                onClick={confirmDialog.onCancel} 
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDialog.onConfirm} 
                className="btn btn-danger"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: 0,
              }}
            >×</button>
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
                  <td>{format(parseISO(res.checkIn), 'dd/MM/yyyy')}</td>
                  <td>{format(parseISO(res.checkOut), 'dd/MM/yyyy')}</td>
                  <td>{res.numGuests}</td>
                  <td>€{res.priceTotal}</td>
                  <td style={{ textTransform: 'capitalize' }}>{res.channel}</td>
                  <td>
                    <span
                      className={getStatusBadgeClass(res.status)}
                      style={{
                        background: STATUS_META[res.status]?.color || '#BDC3C7',
                        color: '#fff',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        display: 'inline-block',
                      }}
                    >
                      {STATUS_META[res.status]?.label || res.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(res)}
                        className="btn btn-primary btn-sm"
                        disabled={res.status === 'cancelled'}
                        title="Edit reservation"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleCancel(res)}
                        className="btn btn-danger btn-sm"
                        disabled={res.status === 'cancelled'}
                        title="Cancel reservation"
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
                {/* Display error message in modal if present */}
                {error && (
                  <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(231, 76, 60, 0.1)',
                    border: '1px solid var(--danger)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--danger)'
                  }}>
                    <AlertCircle size={20} />
                    <span style={{ flex: 1, fontWeight: 500 }}>{error}</span>
                    <button 
                      type="button"
                      onClick={() => setError(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.25rem',
                        padding: 0,
                        color: 'var(--danger)',
                      }}
                    >×</button>
                  </div>
                )}

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
                        className={`form-input ${validationErrors.firstName ? 'error' : ''}`}
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                      {validationErrors.firstName && (
                        <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                          {validationErrors.firstName}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className={`form-input ${validationErrors.lastName ? 'error' : ''}`}
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                      {validationErrors.lastName && (
                        <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                          {validationErrors.lastName}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className={`form-input ${validationErrors.email ? 'error' : ''}`}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                      {validationErrors.email && (
                        <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                          {validationErrors.email}
                        </span>
                      )}
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
                    className={`form-select ${validationErrors.suiteId ? 'error' : ''}`}
                    value={formData.suiteId}
                    onChange={(e) => setFormData({ ...formData, suiteId: e.target.value })}
                    required
                  >
                    <option value="">Select suite</option>
                    {suites.filter(s => s.active).map(suite => (
                      <option key={suite.suiteId} value={suite.suiteId}>
                        {suite.suiteName}  (max {suite.capacity} guests)
                      </option>
                    ))}
                  </select>
                  {validationErrors.suiteId && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      {validationErrors.suiteId}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Check-In *</label>
                    <input
                      type="date"
                      className={`form-input ${validationErrors.checkIn ? 'error' : ''}`}
                      value={formData.checkIn}
                      onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                      required
                    />
                    {validationErrors.checkIn && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                        {validationErrors.checkIn}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Check-Out *</label>
                    <input
                      type="date"
                      className={`form-input ${validationErrors.checkOut ? 'error' : ''}`}
                      value={formData.checkOut}
                      onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                      required
                    />
                    {validationErrors.checkOut && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                        {validationErrors.checkOut}
                      </span>
                    )}
                  </div>
                </div>
                {nightsCount > 0 && (
                  <div style={{ 
                    padding: '0.75rem', 
                    background: 'var(--light-gray)', 
                    borderRadius: '6px', 
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Calendar size={16} style={{ color: 'var(--primary)' }} />
                    <strong>{nightsCount}</strong> night{nightsCount !== 1 ? 's' : ''}
                    {suggestedPrice && (
                      <span style={{ marginLeft: 'auto', color: 'var(--dark-gray)' }}>
                        Suggested price: €{suggestedPrice}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      <Users size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Number of Guests *
                    </label>
                    <input
                      type="number"
                      className={`form-input ${validationErrors.numGuests ? 'error' : ''}`}
                      value={formData.numGuests}
                      onChange={(e) => setFormData({ ...formData, numGuests: e.target.value })}
                      min="1"
                      max={selectedSuite?.capacity || 100}
                      required
                    />
                    {validationErrors.numGuests && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                        {validationErrors.numGuests}
                      </span>
                    )}
                    {selectedSuite && (
                      <span style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginTop: '0.25rem', display: 'block' }}>
                        Max capacity: {selectedSuite.capacity}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <DollarSign size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Total Price (€) *
                    </label>
                    <input
                      type="number"
                      className={`form-input ${validationErrors.priceTotal ? 'error' : ''}`}
                      value={formData.priceTotal}
                      onChange={(e) => setFormData({ ...formData, priceTotal: e.target.value })}
                      step="0.01"
                      min="0"
                      required
                      placeholder={suggestedPrice || '0.00'}
                    />
                    {validationErrors.priceTotal && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                        {validationErrors.priceTotal}
                      </span>
                    )}
                    {suggestedPrice && !formData.priceTotal && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, priceTotal: suggestedPrice })}
                        style={{
                          fontSize: '0.875rem',
                          marginTop: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Use suggested €{suggestedPrice}
                      </button>
                    )}
                  </div>
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
                {editingReservation && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                )}
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
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline" disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingReservation ? 'Update' : 'Create')} Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

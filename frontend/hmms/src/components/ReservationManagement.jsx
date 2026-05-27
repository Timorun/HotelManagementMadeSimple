import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchReservations, fetchSuites, fetchNationalities, createReservation, updateReservation, cancelReservation, searchGuests, updateReservationStatus, fetchGuest, updateGuest } from '../api/backend';
import { Calendar, Plus, Search, AlertCircle, CheckCircle, Users, Euro, Download, Eye } from 'lucide-react';
import { format, differenceInDays, parseISO, isBefore, addDays, startOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { STATUS_META, getTransitionWarning } from '../api/reservationStatus';
import { exportRowsToExcel } from '../utils/excelExport';
import { useI18n } from '../context/I18nContext';
import { ConfirmCancelReservationModal, ReservationDetailsModal } from './reservations/ReservationDetailsModal';

const STATUS_FILTER_DEFAULTS = Object.keys(STATUS_META).reduce((accumulator, statusKey) => {
  accumulator[statusKey] = true;
  return accumulator;
}, {});

function isCompleteDateValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

export default function ReservationManagement() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reservations, setReservations] = useState([]);
  const [suites, setSuites] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateFromDraft, setDateFromDraft] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateToDraft, setDateToDraft] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [guestSearchResults, setGuestSearchResults] = useState([]);
  const [searchingGuests, setSearchingGuests] = useState(false);
  const [guestMode, setGuestMode] = useState('existing');
  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const searchTimerRef = useRef(null);
  const dateApplyTimerRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const [statusFilters, setStatusFilters] = useState(STATUS_FILTER_DEFAULTS);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState('all');
  const [guestFilter, setGuestFilter] = useState('');
  const [sortBy, setSortBy] = useState('checkIn');
  const [sortDirection, setSortDirection] = useState('asc');
  const [priceInputSource, setPriceInputSource] = useState('total');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [isEditingReservationDetails, setIsEditingReservationDetails] = useState(false);
  const [savingReservationDetails, setSavingReservationDetails] = useState(false);
  const [reservationModalError, setReservationModalError] = useState(null);
  const [reservationEditForm, setReservationEditForm] = useState({
    suiteId: '',
    checkIn: '',
    checkOut: '',
    numGuests: 1,
    pricePerNight: '',
    priceTotal: '',
    channel: 'direct',
    notes: '',
    guestNotes: '',
    status: 'pending',
  });

  const [formData, setFormData] = useState({
    suiteId: '',
    checkIn: '',
    checkOut: '',
    numGuests: 2,
    pricePerNight: '',
    priceTotal: '',
    channel: 'direct',
    guestId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    guestNotes: '',
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

  const parseCurrencyValue = useCallback((value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const formatCurrencyValue = useCallback((value) => {
    if (!Number.isFinite(value)) {
      return '';
    }
    return value.toFixed(2);
  }, []);

  const getPricePerNightValue = useCallback((checkIn, checkOut, totalPrice) => {
    if (!checkIn || !checkOut) {
      return '';
    }

    try {
      const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));
      if (nights <= 0) {
        return '';
      }

      const parsedTotal = Number.parseFloat(totalPrice || 0);
      if (!Number.isFinite(parsedTotal)) {
        return '';
      }

      return formatCurrencyValue(parsedTotal / nights);
    } catch {
      return '';
    }
  }, [formatCurrencyValue]);

  const suggestedPrice = useMemo(() => {
    if (selectedSuite && nightsCount > 0) {
      return (selectedSuite.basePrice * nightsCount).toFixed(2);
    }
    return '';
  }, [selectedSuite, nightsCount]);

  const suggestedPricePerNight = useMemo(() => {
    if (!selectedSuite || selectedSuite.basePrice === undefined || selectedSuite.basePrice === null) {
      return '';
    }
    return formatCurrencyValue(Number(selectedSuite.basePrice));
  }, [selectedSuite, formatCurrencyValue]);

  useEffect(() => {
    if (nightsCount <= 0) {
      return;
    }

    setFormData((prev) => {
      if (priceInputSource === 'perNight') {
        const pricePerNight = parseCurrencyValue(prev.pricePerNight);
        if (pricePerNight === null) {
          return prev;
        }

        const nextPriceTotal = formatCurrencyValue(pricePerNight * nightsCount);
        if (prev.priceTotal === nextPriceTotal) {
          return prev;
        }

        return {
          ...prev,
          priceTotal: nextPriceTotal,
        };
      }

      const priceTotal = parseCurrencyValue(prev.priceTotal);
      if (priceTotal === null) {
        return prev;
      }

      const nextPricePerNight = formatCurrencyValue(priceTotal / nightsCount);
      if (prev.pricePerNight === nextPricePerNight) {
        return prev;
      }

      return {
        ...prev,
        pricePerNight: nextPricePerNight,
      };
    });
  }, [nightsCount, priceInputSource, parseCurrencyValue, formatCurrencyValue]);

  const handlePricePerNightChange = useCallback((value) => {
    setPriceInputSource('perNight');

    setFormData((prev) => {
      const nextData = {
        ...prev,
        pricePerNight: value,
      };

      const parsedPerNight = parseCurrencyValue(value);
      if (parsedPerNight !== null && nightsCount > 0) {
        nextData.priceTotal = formatCurrencyValue(parsedPerNight * nightsCount);
      }

      return nextData;
    });
  }, [nightsCount, parseCurrencyValue, formatCurrencyValue]);

  const handlePriceTotalChange = useCallback((value) => {
    setPriceInputSource('total');

    setFormData((prev) => {
      const nextData = {
        ...prev,
        priceTotal: value,
      };

      const parsedTotal = parseCurrencyValue(value);
      if (parsedTotal !== null && nightsCount > 0) {
        nextData.pricePerNight = formatCurrencyValue(parsedTotal / nightsCount);
      }

      return nextData;
    });
  }, [nightsCount, parseCurrencyValue, formatCurrencyValue]);

  const guestNotesOwnerLabel = useMemo(() => {
    const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
    if (fullName) {
      return fullName;
    }

    if (editingReservation) {
      return editingReservation.guestDisplayName || editingReservation.guestName || `Guest #${editingReservation.guestId}`;
    }

    if (formData.guestId) {
      return `Guest #${formData.guestId}`;
    }

    return '';
  }, [formData.firstName, formData.lastName, formData.guestId, editingReservation]);

  const showGuestNotesField = useMemo(
    () => Boolean(
      editingReservation
      || formData.guestId
      || (!editingReservation && guestMode === 'new')
      || formData.firstName
      || formData.lastName
      || formData.email
    ),
    [editingReservation, formData.guestId, formData.firstName, formData.lastName, formData.email, guestMode]
  );

  const isCheckInInPast = useMemo(() => {
    if (!formData.checkIn) {
      return false;
    }

    try {
      return isBefore(parseISO(formData.checkIn), startOfDay(new Date()));
    } catch {
      return false;
    }
  }, [formData.checkIn]);

  const canApplyDateFilters = useMemo(() => {
    if (!isCompleteDateValue(dateFromDraft) || !isCompleteDateValue(dateToDraft)) {
      return false;
    }

    return dateFromDraft !== dateFrom || dateToDraft !== dateTo;
  }, [dateFromDraft, dateToDraft, dateFrom, dateTo]);

  const statusFilterSummary = useMemo(() => {
    const availableStatuses = Object.keys(STATUS_META);
    const enabledStatuses = availableStatuses.filter((status) => Boolean(statusFilters[status]));

    if (enabledStatuses.length === availableStatuses.length) {
      return 'All statuses';
    }

    if (enabledStatuses.length === 0) {
      return 'No statuses selected';
    }

    if (enabledStatuses.length <= 2) {
      return enabledStatuses.map((status) => STATUS_META[status]?.label || status).join(', ');
    }

    return `${enabledStatuses.length} statuses selected`;
  }, [statusFilters]);

  useEffect(() => {
    if (!isCompleteDateValue(dateFrom) || !isCompleteDateValue(dateTo)) {
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openNewReservationModal();
      navigate('/reservations', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }

      if (dateApplyTimerRef.current) {
        clearTimeout(dateApplyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isStatusDropdownOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusDropdownOpen]);

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

  const applyDateFilterDraft = useCallback(() => {
    if (!isCompleteDateValue(dateFromDraft) || !isCompleteDateValue(dateToDraft)) {
      return;
    }

    if (dateFromDraft === dateFrom && dateToDraft === dateTo) {
      return;
    }

    setDateFrom(dateFromDraft);
    setDateTo(dateToDraft);
  }, [dateFromDraft, dateToDraft, dateFrom, dateTo]);

  const scheduleDateFilterApply = useCallback(() => {
    if (dateApplyTimerRef.current) {
      clearTimeout(dateApplyTimerRef.current);
    }

    dateApplyTimerRef.current = setTimeout(() => {
      applyDateFilterDraft();
      dateApplyTimerRef.current = null;
    }, 1000);
  }, [applyDateFilterDraft]);

  const handleDateInputChange = useCallback((field, value) => {
    if (field === 'from') {
      setDateFromDraft(value);
    } else {
      setDateToDraft(value);
    }

    scheduleDateFilterApply();
  }, [scheduleDateFilterApply]);

  const handleDateInputBlur = useCallback(() => {
    if (dateApplyTimerRef.current) {
      clearTimeout(dateApplyTimerRef.current);
      dateApplyTimerRef.current = null;
    }

    applyDateFilterDraft();
  }, [applyDateFilterDraft]);

  const handleDateInputKeyDown = useCallback((event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    if (dateApplyTimerRef.current) {
      clearTimeout(dateApplyTimerRef.current);
      dateApplyTimerRef.current = null;
    }

    applyDateFilterDraft();
    event.currentTarget.blur();
  }, [applyDateFilterDraft]);

  const handleSearchGuests = useCallback(async (searchQuery) => {
    const normalizedQuery = searchQuery.trim();

    if (normalizedQuery.length < 2) {
      setGuestSearchResults([]);
      setSearchingGuests(false);
      return;
    }

    // Debounce search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    setSearchingGuests(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchGuests(normalizedQuery);
        const searchableGuests = results.filter((guest) => {
          if (!guest) {
            return false;
          }

          if (guest.anonymized) {
            return false;
          }

          const firstName = (guest.firstName || '').trim().toLowerCase();
          const lastName = (guest.lastName || '').trim().toLowerCase();

          if (firstName === 'anonymized' || lastName === 'guest') {
            return false;
          }

          return true;
        });

        setGuestSearchResults(searchableGuests);
      } catch (err) {
        console.error('Guest search failed:', err);
        showToast('Failed to search guests', 'error');
      } finally {
        setSearchingGuests(false);
      }
    }, 300); // 300ms debounce
  }, [showToast]);

  const resetGuestSelection = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    setGuestSearchResults([]);
    setSearchTerm('');
    setSearchingGuests(false);
    setFormData((prev) => ({
      ...prev,
      guestId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      guestNotes: '',
      nationalityCode: '',
    }));
  }, []);

  const handleGuestModeChange = useCallback((mode) => {
    if (mode === guestMode) {
      return;
    }

    setGuestMode(mode);
    resetGuestSelection();
    setValidationErrors((prev) => {
      const nextErrors = { ...prev };
      delete nextErrors.guestSelection;
      delete nextErrors.firstName;
      delete nextErrors.lastName;
      delete nextErrors.email;
      return nextErrors;
    });
  }, [guestMode, resetGuestSelection]);

  const handleSelectGuest = useCallback((guest) => {
    setFormData(prev => ({
      ...prev,
      guestId: guest.guestId,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone || '',
      guestNotes: guest.notes || '',
      nationalityCode: guest.nationalityCode || '',
    }));
    setGuestSearchResults([]);
    setSearchTerm(`${guest.firstName} ${guest.lastName}`.trim());
    setValidationErrors((prev) => {
      if (!prev.guestSelection) {
        return prev;
      }

      const nextErrors = { ...prev };
      delete nextErrors.guestSelection;
      return nextErrors;
    });
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

        if (isBefore(checkOutDate, checkInDate) || checkOutDate.getTime() === checkInDate.getTime()) {
          errors.checkOut = 'Check-out must be after check-in';
        }
        if (nightsCount > 365) {
          errors.checkOut = 'Reservation cannot exceed 365 nights';
        }
      } catch {
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
    
    // Guest validation for new reservations
    if (!editingReservation) {
      if (guestMode === 'existing') {
        if (!formData.guestId) {
          errors.guestSelection = 'Select an existing guest or switch to "Create New Guest".';
        }
      } else if (!formData.guestId) {
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
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, selectedSuite, nightsCount, editingReservation, guestMode]);

  const openNewReservationModal = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    setEditingReservation(null);
    setValidationErrors({});
    setError(null);
    setGuestMode('existing');
    setSearchTerm('');
    setGuestSearchResults([]);
    setSearchingGuests(false);
    setFormData({
      suiteId: '',
      checkIn: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      checkOut: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
      numGuests: 2,
      pricePerNight: '',
      priceTotal: '',
      channel: 'direct',
      guestId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      guestNotes: '',
      nationalityCode: '',
      notes: '',
    });
    setPriceInputSource('total');
    setShowModal(true);
  }, []);

  const submitReservation = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      let reservationSuccessMessage = '';

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
          notes: formData.notes,
        });

        // Update status if changed
        if (statusChanged) {
          await updateReservationStatus(editingReservation.reservationId, formData.status);
        }

        reservationSuccessMessage = 'Reservation updated successfully';
      } else {
        const normalizedGuestName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim().toLowerCase();
        const hasDuplicateReservation = reservations.some((reservation) => {
          if ((reservation.status || '').toLowerCase() === 'cancelled') {
            return false;
          }

          const sameSuite = Number(reservation.suiteId) === Number(formData.suiteId);
          const sameDates = reservation.checkIn === formData.checkIn && reservation.checkOut === formData.checkOut;
          if (!sameSuite || !sameDates) {
            return false;
          }

          if (formData.guestId) {
            return Number(reservation.guestId) === Number(formData.guestId);
          }

          if (guestMode === 'new' && normalizedGuestName) {
            const existingGuestName = String(reservation.guestDisplayName || reservation.guestName || '').trim().toLowerCase();
            return existingGuestName === normalizedGuestName;
          }

          return false;
        });

        if (hasDuplicateReservation) {
          const duplicateMessage = 'A reservation with the same guest, suite, and date range already exists.';
          setError(duplicateMessage);
          showToast(duplicateMessage, 'error');
          window.alert(duplicateMessage);
          return;
        }

        const createdReservation = await createReservation({
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

        if (!formData.guestId && createdReservation?.guestId) {
          setFormData((prev) => ({ ...prev, guestId: createdReservation.guestId }));
        }

        reservationSuccessMessage = 'Reservation created successfully';
      }

      const guestIdFromForm = formData.guestId ? parseInt(formData.guestId) : NaN;
      const guestIdFromEdit = editingReservation?.guestId ? parseInt(editingReservation.guestId) : NaN;
      const guestIdToUpdate = Number.isNaN(guestIdFromForm) ? guestIdFromEdit : guestIdFromForm;

      let guestNotesUpdateFailed = false;
      if (!Number.isNaN(guestIdToUpdate)) {
        try {
          const guestProfile = await fetchGuest(guestIdToUpdate);
          await updateGuest(guestIdToUpdate, {
            firstName: guestProfile.firstName,
            lastName: guestProfile.lastName,
            email: guestProfile.email,
            phone: guestProfile.phone,
            nationalityCode: guestProfile.nationalityCode,
            marketingConsent: guestProfile.marketingConsent,
            notes: formData.guestNotes || '',
          });
        } catch (guestErr) {
          guestNotesUpdateFailed = true;
          console.error('Failed to update guest notes:', guestErr);
        }
      }

      if (guestNotesUpdateFailed) {
        showToast(`${reservationSuccessMessage}, but guest notes could not be saved`, 'error');
      } else {
        showToast(reservationSuccessMessage, 'success');
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      const errorMsg = err?.message || 'Failed to save reservation';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      if (String(errorMsg).toLowerCase().includes('already exists')) {
        window.alert(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  }, [editingReservation, formData, guestMode, loadData, reservations, showToast]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      showToast('Please fix validation errors', 'error');
      return;
    }

    await submitReservation();
  }, [ showToast, submitReservation, validateForm]);

  const toggleStatusFilter = useCallback((status) => {
    setStatusFilters((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  }, []);

  const resetStatusFilters = useCallback(() => {
    setStatusFilters(STATUS_FILTER_DEFAULTS);
  }, []);

  const enableAllStatusFilters = useCallback(() => {
    const nextFilters = Object.keys(STATUS_META).reduce((accumulator, status) => {
      accumulator[status] = true;
      return accumulator;
    }, {});
    setStatusFilters(nextFilters);
  }, []);

  const clearReservationListFilters = useCallback(() => {
    setStatusFilters(STATUS_FILTER_DEFAULTS);
    setIsStatusDropdownOpen(false);
    setChannelFilter('all');
    setGuestFilter('');
  }, []);

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      confirmed: 'status-confirmed',
      checked_in: 'status-checked-in',
      cancelled: 'status-cancelled',
      pending: 'status-pending',
    };
    return `status-badge ${statusMap[status] || ''}`;
  };

  const getReservationEditValidationErrors = useCallback(() => {
    const errors = [];
    const selectedSuite = suites.find((suite) => suite.suiteId === Number(reservationEditForm.suiteId));
    const numGuests = Number(reservationEditForm.numGuests);
    const priceTotal = Number(reservationEditForm.priceTotal);

    if (!reservationEditForm.checkIn || !reservationEditForm.checkOut) {
      errors.push('Check-in and check-out dates are required.');
    } else if (parseISO(reservationEditForm.checkOut) <= parseISO(reservationEditForm.checkIn)) {
      errors.push('Check-out must be after check-in.');
    }

    if (!Number.isFinite(numGuests) || numGuests < 1) {
      errors.push('Guests must be at least 1.');
    }

    if (selectedSuite?.capacity && numGuests > selectedSuite.capacity) {
      errors.push(`Guests exceed suite capacity (${selectedSuite.capacity}).`);
    }

    if (!Number.isFinite(priceTotal) || priceTotal < 0) {
      errors.push('Price must be 0 or higher.');
    }

    return errors;
  }, [reservationEditForm, suites]);

  const reservationEditValidationErrors = useMemo(
    () => getReservationEditValidationErrors(),
    [getReservationEditValidationErrors]
  );
  const isReservationEditValid = reservationEditValidationErrors.length === 0;

  const openReservationModal = useCallback((reservation) => {
    setSelectedReservation(reservation);
    setReservationModalError(null);
    setReservationEditForm({
      suiteId: reservation.suiteId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      numGuests: reservation.numGuests,
      pricePerNight: getPricePerNightValue(reservation.checkIn, reservation.checkOut, reservation.priceTotal),
      priceTotal: reservation.priceTotal,
      channel: reservation.channel || 'direct',
      notes: reservation.notes || '',
      guestNotes: reservation.guestNotes || '',
      status: reservation.status || 'pending',
    });
    setIsEditingReservationDetails(false);
    setShowReservationModal(true);
  }, [getPricePerNightValue]);

  const closeReservationModal = useCallback(() => {
    setShowReservationModal(false);
    setShowCancelConfirmModal(false);
    setSelectedReservation(null);
    setIsEditingReservationDetails(false);
    setReservationModalError(null);
  }, []);

  const requestCancelReservation = useCallback(() => {
    setShowCancelConfirmModal(true);
  }, []);

  const handleSaveReservationFromModal = useCallback(async () => {
    if (!selectedReservation) return;
    if (!isReservationEditValid) {
      setReservationModalError(reservationEditValidationErrors[0]);
      return;
    }

    try {
      setSavingReservationDetails(true);
      setReservationModalError(null);

      const statusChanged = reservationEditForm.status !== selectedReservation.status;

      await updateReservation(selectedReservation.reservationId, {
        suiteId: parseInt(reservationEditForm.suiteId, 10),
        guestId: selectedReservation.guestId,
        checkIn: reservationEditForm.checkIn,
        checkOut: reservationEditForm.checkOut,
        numGuests: parseInt(reservationEditForm.numGuests, 10),
        priceTotal: parseFloat(reservationEditForm.priceTotal),
        channel: reservationEditForm.channel,
        notes: reservationEditForm.notes,
      });

      if (statusChanged) {
        await updateReservationStatus(selectedReservation.reservationId, reservationEditForm.status);
      }

      let guestNotesSyncError = null;
      const guestNotesChanged = (reservationEditForm.guestNotes || '') !== (selectedReservation.guestNotes || '');
      if (guestNotesChanged && selectedReservation.guestId) {
        try {
          const guestProfile = await fetchGuest(selectedReservation.guestId);
          await updateGuest(selectedReservation.guestId, {
            firstName: guestProfile.firstName,
            lastName: guestProfile.lastName,
            email: guestProfile.email,
            phone: guestProfile.phone,
            nationalityCode: guestProfile.nationalityCode,
            marketingConsent: guestProfile.marketingConsent,
            notes: reservationEditForm.guestNotes || '',
          });
        } catch (guestErr) {
          console.error('Failed to update guest profile notes:', guestErr);
          guestNotesSyncError = 'Reservation was saved, but guest profile notes could not be saved. Please try again.';
        }
      }

      await loadData();

      if (guestNotesSyncError) {
        setSelectedReservation((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            suiteId: parseInt(reservationEditForm.suiteId, 10),
            checkIn: reservationEditForm.checkIn,
            checkOut: reservationEditForm.checkOut,
            numGuests: parseInt(reservationEditForm.numGuests, 10),
            pricePerNight: reservationEditForm.pricePerNight,
            priceTotal: parseFloat(reservationEditForm.priceTotal),
            channel: reservationEditForm.channel,
            notes: reservationEditForm.notes,
            guestNotes: reservationEditForm.guestNotes,
            status: reservationEditForm.status,
          };
        });
        setReservationModalError(guestNotesSyncError);
        return;
      }

      showToast('Reservation updated successfully', 'success');
      setIsEditingReservationDetails(false);
      closeReservationModal();
    } catch (err) {
      console.error('Failed to update reservation:', err);
      setReservationModalError(err?.message || 'Failed to update reservation');
    } finally {
      setSavingReservationDetails(false);
    }
  }, [
    closeReservationModal,
    isReservationEditValid,
    loadData,
    reservationEditForm,
    reservationEditValidationErrors,
    selectedReservation,
    showToast,
  ]);

  const handleConfirmCancelReservation = useCallback(async () => {
    if (!selectedReservation) return;

    try {
      setSavingReservationDetails(true);
      setReservationModalError(null);

      await cancelReservation(selectedReservation.reservationId);
      await loadData();
      showToast('Reservation cancelled successfully', 'success');
      closeReservationModal();
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
      setReservationModalError(err?.message || 'Failed to cancel reservation');
    } finally {
      setShowCancelConfirmModal(false);
      setSavingReservationDetails(false);
    }
  }, [closeReservationModal, loadData, selectedReservation, showToast]);

  const filteredReservations = useMemo(() => {
    const needle = guestFilter.toLowerCase();
    const hasEnabledStatus = Object.values(statusFilters).some(Boolean);

    const matchingReservations = reservations.filter((res) => {
      const normalizedStatus = (res.status || '').toLowerCase();
      const statusMatches = hasEnabledStatus
        ? (statusFilters[normalizedStatus] ?? true)
        : true;
      const channelMatches = channelFilter === 'all' || res.channel === channelFilter;
      const guestMatches = !needle || (res.guestDisplayName || res.guestName || '').toLowerCase().includes(needle);

      return statusMatches && channelMatches && guestMatches;
    });

    const sortedReservations = [...matchingReservations].sort((left, right) => {
      const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortBy === 'checkIn' || sortBy === 'checkOut') {
        const leftDate = Date.parse(left[sortBy] || '');
        const rightDate = Date.parse(right[sortBy] || '');
        const leftTimestamp = Number.isFinite(leftDate) ? leftDate : 0;
        const rightTimestamp = Number.isFinite(rightDate) ? rightDate : 0;

        if (leftTimestamp === rightTimestamp) {
          return (Number(left.reservationId || 0) - Number(right.reservationId || 0)) * directionMultiplier;
        }

        return (leftTimestamp - rightTimestamp) * directionMultiplier;
      }

      if (sortBy === 'priceTotal') {
        const leftPrice = Number.parseFloat(left.priceTotal || 0);
        const rightPrice = Number.parseFloat(right.priceTotal || 0);
        return (leftPrice - rightPrice) * directionMultiplier;
      }

      const leftValue = sortBy === 'guest'
        ? (left.guestDisplayName || left.guestName || '')
        : (left[sortBy] || '');
      const rightValue = sortBy === 'guest'
        ? (right.guestDisplayName || right.guestName || '')
        : (right[sortBy] || '');

      return String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' }) * directionMultiplier;
    });

    return sortedReservations;
  }, [reservations, statusFilters, channelFilter, guestFilter, sortBy, sortDirection]);

  const activeReservationFilterCount = useMemo(() => {
    const hasCustomStatusFilters = Object.keys(STATUS_META).some(
      (status) => Boolean(statusFilters[status]) !== Boolean(STATUS_FILTER_DEFAULTS[status])
    );

    return [
      hasCustomStatusFilters,
      channelFilter !== 'all',
      Boolean(guestFilter.trim()),
    ].filter(Boolean).length;
  }, [statusFilters, channelFilter, guestFilter]);

  const handleExportReservations = useCallback(() => {
    const rows = filteredReservations.map((res) => ({
      nights: Math.max(0, differenceInDays(parseISO(res.checkOut), parseISO(res.checkIn))),
      reservationId: res.reservationId,
      guest: res.guestDisplayName || res.guestName,
      guestAnonymized: res.guestAnonymized ? 'Yes' : 'No',
      suite: res.suiteName,
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      numGuests: res.numGuests,
      pricePerNight: (() => {
        const nights = Math.max(0, differenceInDays(parseISO(res.checkOut), parseISO(res.checkIn)));
        if (nights === 0) return '';
        return (Number.parseFloat(res.priceTotal || 0) / nights).toFixed(2);
      })(),
      priceTotal: res.priceTotal,
      channel: res.channel,
      status: res.status,
    }));

    exportRowsToExcel(rows, 'reservations-export.xlsx', 'Reservations');
  }, [filteredReservations]);

  const statusTransitionWarning = useMemo(() => {
    if (!editingReservation) {
      return null;
    }
    return getTransitionWarning(editingReservation.status, formData.status);
  }, [editingReservation, formData.status]);

  const handleTableSort = useCallback((field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(field);
    setSortDirection('asc');
  }, [sortBy]);

  const getSortIndicator = useCallback((field) => {
    if (sortBy !== field) {
      return '↕';
    }

    return sortDirection === 'asc' ? '↑' : '↓';
  }, [sortBy, sortDirection]);

  const getAriaSort = useCallback((field) => (
    sortBy === field
      ? (sortDirection === 'asc' ? 'ascending' : 'descending')
      : 'none'
  ), [sortBy, sortDirection]);

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

        <div className="form-group reservation-filters-panel">
          <div className="list-filters-head">
            <div>
              <h3 className="list-filters-title">Filter Reservations</h3>
              <p className="list-filters-subtitle">Narrow the list quickly by status, dates, channel, and guest name.</p>
            </div>
            <div className="list-filters-actions">
              <span className="list-filters-count">{filteredReservations.length} shown</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleExportReservations}>
                <Download size={16} />
                {t('filters.exportExcel')}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={clearReservationListFilters}
                disabled={activeReservationFilterCount === 0}
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="reservation-filters-grid">
            <div>
              <label className="form-label">From:</label>
              <input
                type="date"
                className="form-input"
                value={dateFromDraft}
                onChange={(e) => handleDateInputChange('from', e.target.value)}
                onBlur={handleDateInputBlur}
                onKeyDown={handleDateInputKeyDown}
              />
            </div>
            <div>
              <label className="form-label">To:</label>
              <input
                type="date"
                className="form-input"
                value={dateToDraft}
                onChange={(e) => handleDateInputChange('to', e.target.value)}
                onBlur={handleDateInputBlur}
                onKeyDown={handleDateInputKeyDown}
              />
            </div>
            <div>
              <label className="form-label">{t('filters.status')}:</label>
              <div className="status-filter-dropdown" ref={statusDropdownRef}>
                <button
                  type="button"
                  className="form-select status-filter-trigger"
                  onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
                  aria-expanded={isStatusDropdownOpen}
                  aria-haspopup="menu"
                >
                  <span className="status-filter-trigger-label">{statusFilterSummary}</span>
                  <span className="status-filter-trigger-caret">▾</span>
                </button>

                {isStatusDropdownOpen && (
                  <div className="status-filter-menu" role="menu">
                    <div className="status-filter-menu-actions">
                      <button type="button" className="btn btn-outline btn-xs" onClick={enableAllStatusFilters}>All</button>
                    </div>

                    <div className="status-filter-menu-list">
                      {Object.entries(STATUS_META).map(([status, meta]) => (
                        <label key={status} className="status-filter-option">
                          <input
                            type="checkbox"
                            checked={Boolean(statusFilters[status])}
                            onChange={() => toggleStatusFilter(status)}
                          />
                          <span>{meta.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="form-label">{t('filters.channel')}:</label>
              <select className="form-select" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
                <option value="all">{t('filters.all')}</option>
                <option value="direct">Direct</option>
                <option value="booking.com">Booking.com</option>
                <option value="airbnb">Airbnb</option>
                <option value="expedia">Expedia</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Guest:</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search guest..."
                value={guestFilter}
                onChange={(e) => setGuestFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p>No reservations found for this date range</p>
          </div>
        ) : (
          <table className="data-table reservation-table">
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th className="col-guest" aria-sort={getAriaSort('guest')}>
                  <button
                    type="button"
                    className={`sort-header-btn ${sortBy === 'guest' ? 'active' : ''}`}
                    onClick={() => handleTableSort('guest')}
                  >
                    <span>Guest</span>
                    <span className="sort-indicator" aria-hidden="true">{getSortIndicator('guest')}</span>
                  </button>
                </th>
                <th className="col-suite">Suite</th>
                <th className="col-checkin" aria-sort={getAriaSort('checkIn')}>
                  <button
                    type="button"
                    className={`sort-header-btn ${sortBy === 'checkIn' ? 'active' : ''}`}
                    onClick={() => handleTableSort('checkIn')}
                  >
                    <span>Check-In</span>
                    <span className="sort-indicator" aria-hidden="true">{getSortIndicator('checkIn')}</span>
                  </button>
                </th>
                <th className="col-checkout" aria-sort={getAriaSort('checkOut')}>
                  <button
                    type="button"
                    className={`sort-header-btn ${sortBy === 'checkOut' ? 'active' : ''}`}
                    onClick={() => handleTableSort('checkOut')}
                  >
                    <span>Check-Out</span>
                    <span className="sort-indicator" aria-hidden="true">{getSortIndicator('checkOut')}</span>
                  </button>
                </th>
                <th className="col-guests">Guests</th>
                <th className="col-price" aria-sort={getAriaSort('priceTotal')}>
                  <button
                    type="button"
                    className={`sort-header-btn ${sortBy === 'priceTotal' ? 'active' : ''}`}
                    onClick={() => handleTableSort('priceTotal')}
                  >
                    <span>Price</span>
                    <span className="sort-indicator" aria-hidden="true">{getSortIndicator('priceTotal')}</span>
                  </button>
                </th>
                <th className="col-channel">Channel</th>
                <th className="col-status" aria-sort={getAriaSort('status')}>
                  <button
                    type="button"
                    className={`sort-header-btn ${sortBy === 'status' ? 'active' : ''}`}
                    onClick={() => handleTableSort('status')}
                  >
                    <span>Status</span>
                    <span className="sort-indicator" aria-hidden="true">{getSortIndicator('status')}</span>
                  </button>
                </th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((res) => (
                <tr key={res.reservationId}>
                  <td className="col-id">#{res.reservationId}</td>
                  <td className="col-guest reservation-guest-cell" style={{ fontWeight: 600 }}>
                    {res.guestAnonymized && (
                      <span style={{ color: 'var(--dark-gray)' }}>Anonymized/Deleted</span>
                    )}
                    {!res.guestAnonymized && (
                      <>{res.guestDisplayName || res.guestName}</>
                    )}
                  </td>
                  <td className="col-suite reservation-suite-cell">{res.suiteName}</td>
                  <td className="col-checkin">{format(parseISO(res.checkIn), 'dd/MM/yyyy')}</td>
                  <td className="col-checkout">{format(parseISO(res.checkOut), 'dd/MM/yyyy')}</td>
                  <td className="col-guests">{res.numGuests}</td>
                  <td className="col-price reservation-price-cell">
                    {(() => {
                      const total = Number.parseFloat(res.priceTotal || 0);
                      const nights = Math.max(0, differenceInDays(parseISO(res.checkOut), parseISO(res.checkIn)));
                      const perNight = nights > 0 ? total / nights : null;

                      return (
                        <>
                          <div className="reservation-price-total">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}</div>
                          <div className="reservation-price-night">
                            {perNight === null
                              ? '-'
                              : `${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(perNight)} / night`}
                          </div>
                        </>
                      );
                    })()}
                  </td>
                  <td className="col-channel" style={{ textTransform: 'capitalize' }}>{res.channel}</td>
                  <td className="col-status">
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
                  <td className="col-actions">
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openReservationModal(res)}
                        className="btn btn-primary btn-sm"
                        title="Open reservation"
                      >
                        <Eye size={14} />
                        Open
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

                {!editingReservation && (
                  <div
                    style={{
                      marginBottom: '1.5rem',
                      padding: '1rem',
                      border: '1px solid var(--light-gray)',
                      borderRadius: '10px',
                      background: '#FBFCFE',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => handleGuestModeChange('existing')}
                        className={`btn ${guestMode === 'existing' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ justifyContent: 'center' }}
                      >
                        <Search size={16} />
                        Use Existing Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGuestModeChange('new')}
                        className={`btn ${guestMode === 'new' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ justifyContent: 'center' }}
                      >
                        <Plus size={16} />
                        Create New Guest
                      </button>
                    </div>
                    <p style={{ marginTop: '0.75rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                      {guestMode === 'existing'
                        ? 'Search by first or last name to reuse an existing guest profile.'
                        : 'Enter guest details below. A new guest profile will be created with this reservation.'}
                    </p>

                  {/* Existing Guest Search */}
                  {!editingReservation && guestMode === 'existing' && (
                    <div className="form-group">
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className={`form-input ${validationErrors.guestSelection ? 'error' : ''}`}
                          placeholder="Type first or last name..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            handleSearchGuests(e.target.value);
                          }}
                        />
                        <Search style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', color: 'var(--gray)' }} size={20} />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--dark-gray)', marginTop: '0.35rem', display: 'block' }}>
                        Enter at least 2 characters.
                      </span>
                      {validationErrors.guestSelection && (
                        <span style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                          {validationErrors.guestSelection}
                        </span>
                      )}

                      {searchingGuests && (
                        <span style={{ color: 'var(--dark-gray)', fontSize: '0.875rem', marginTop: '0.35rem', display: 'block' }}>
                          Searching guests...
                        </span>
                      )}

                      {guestSearchResults.length > 0 && (
                        <div style={{
                          border: '1px solid var(--gray)',
                          borderRadius: '6px',
                          marginTop: '0.5rem',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          background: 'white',
                        }}>
                          {guestSearchResults.map((guest) => (
                            <div
                              key={guest.guestId}
                              onClick={() => handleSelectGuest(guest)}
                              style={{
                                padding: '0.75rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--light-gray)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--light-gray)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{guest.firstName} {guest.lastName}</div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                                {guest.email || '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!searchingGuests && searchTerm.trim().length >= 2 && guestSearchResults.length === 0 && !formData.guestId && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                          No guest found. Switch to Create New Guest to add a profile.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Guest Information (for new reservations) */}
                  {!editingReservation && guestMode === 'new' && !formData.guestId && (
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
                            <option key={nat.nationalityCode} value={nat.nationalityCode}>{nat.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  </div>
                )}


                {formData.guestId && !editingReservation && guestMode === 'existing' && (
                  <div className="success-message" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <span>
                      Selected: {formData.firstName} {formData.lastName}{' '}
                      {formData.email ? `(${formData.email})` : null}
                    </span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={resetGuestSelection}>
                      Clear Selection
                    </button>
                  </div>
                )}

                {/* guest notes relocated near reservation notes for clarity */}

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
                    {!validationErrors.checkIn && isCheckInInPast && (
                      <span style={{ color: 'var(--warning)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                        Check-in is in the past. Are you sure?
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
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 0.7fr) minmax(170px, 1fr) minmax(170px, 1fr)',
                  gap: '0.75rem',
                }}>
                  <div className="form-group" style={{ minWidth: 0 }}>
                    <label className="form-label">
                      <Users size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Guests *
                    </label>
                    <input
                      type="number"
                      className={`form-input ${validationErrors.numGuests ? 'error' : ''}`}
                      value={formData.numGuests}
                      onChange={(e) => setFormData({ ...formData, numGuests: e.target.value })}
                      min="1"
                      max={selectedSuite?.capacity || 100}
                      style={{ maxWidth: '120px' }}
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
                      <Euro size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Price per Night
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.pricePerNight}
                      onChange={(e) => handlePricePerNightChange(e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder={suggestedPricePerNight || '0.00'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <Euro size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Total Price *
                    </label>
                    <input
                      type="number"
                      className={`form-input ${validationErrors.priceTotal ? 'error' : ''}`}
                      value={formData.priceTotal}
                      onChange={(e) => handlePriceTotalChange(e.target.value)}
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
                        onClick={() => {
                          setPriceInputSource('perNight');
                          setFormData({
                            ...formData,
                            pricePerNight: suggestedPricePerNight,
                            priceTotal: suggestedPrice,
                          });
                        }}
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
                    {statusTransitionWarning && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--warning)',
                        background: 'rgba(243, 156, 18, 0.12)',
                        color: '#7A4E00',
                        fontSize: '0.875rem',
                      }}>
                        {statusTransitionWarning}
                      </div>
                    )}
                  </div>
                )}
                {showGuestNotesField && (
                  <div className="form-group">
                    <label className="form-label">
                      Guest Notes{guestNotesOwnerLabel ? ` of ${guestNotesOwnerLabel}` : ''}
                    </label>
                    <textarea
                      className="form-textarea"
                      value={formData.guestNotes}
                      onChange={(e) => setFormData({ ...formData, guestNotes: e.target.value })}
                      placeholder="Guest profile notes (preferences, allergies, communication reminders)."
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--dark-gray)', marginTop: '0.35rem', display: 'block' }}>
                      Saved on the guest profile and visible on all reservations for this guest.
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Reservation Notes</label>
                  <textarea
                    className="form-textarea"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Stay-specific notes for this reservation only."
                  />
                </div>
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

      {showReservationModal && selectedReservation && (
        <ReservationDetailsModal
          reservation={selectedReservation}
          suites={suites}
          isEditing={isEditingReservationDetails}
          setIsEditing={setIsEditingReservationDetails}
          editForm={reservationEditForm}
          setEditForm={setReservationEditForm}
          onClose={closeReservationModal}
          onSave={handleSaveReservationFromModal}
          onRequestCancelReservation={requestCancelReservation}
          saving={savingReservationDetails}
          validationErrors={reservationEditValidationErrors}
          isEditValid={isReservationEditValid}
          modalError={reservationModalError}
          setModalError={setReservationModalError}
        />
      )}

      {showCancelConfirmModal && selectedReservation && (
        <ConfirmCancelReservationModal
          reservation={selectedReservation}
          saving={savingReservationDetails}
          onClose={() => setShowCancelConfirmModal(false)}
          onConfirm={handleConfirmCancelReservation}
        />
      )}
    </div>
  );
}

import * as XLSX from 'xlsx';

// Column headers seen in booking.com reservation exports (English and Spanish extranet),
// normalized with normalizeHeader(). The first matching column wins.
const COLUMN_ALIASES = {
  bookingNumber: ['booknumber', 'bookingnumber', 'reservationnumber', 'numerodereserva', 'numeroreserva', 'nreserva'],
  guestName: ['guestnames', 'guestname', 'nombredeloshuespedes', 'nombredelhuesped', 'nombresdeloshuespedes', 'huespedes', 'nombredelcliente', 'nombredelclientes'],
  bookerName: ['bookedby', 'reservadopor', 'booker'],
  checkIn: ['checkin', 'arrival', 'entrada', 'llegada', 'fechadeentrada', 'fechadellegada'],
  checkOut: ['checkout', 'departure', 'salida', 'fechadesalida'],
  status: ['status', 'estado'],
  people: ['people', 'persons', 'personas', 'numberofguests', 'adults', 'adultos'],
  price: ['price', 'precio', 'totalprice', 'preciototal', 'importe'],
  unitType: ['unittype', 'roomtype', 'tipodeunidad', 'tipodehabitacion', 'alojamiento'],
  phone: ['phonenumber', 'phone', 'telefono', 'numerodetelefono'],
  country: ['bookercountry', 'country', 'pais', 'paisdelcliente'],
  remarks: ['remarks', 'specialrequests', 'comentarios', 'observaciones', 'peticionesespeciales'],
};

/** "Guest name(s)" -> "guestnames", "Número de reserva" -> "numerodereserva" */
export function normalizeHeader(header) {
  return String(header || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const pad = (value) => String(value).padStart(2, '0');

/** Excel dates, "2026-11-10", "10/11/2026" (day first) or "10 Nov 2026" -> "2026-11-10" (or null). */
export function parseExportDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  // Excel serial day number (cell not formatted as a date)
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
  }
  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (match) {
    return `${match[3]}-${pad(match[2])}-${pad(match[1])}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parseExportDate(parsed);
}

/** "450.00 EUR", "1.234,50 €", 450 -> 450 / 1234.5 (or null). */
export function parseExportPrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  let text = String(value || '').replace(/[^\d.,-]/g, '');
  if (!text) {
    return null;
  }
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma > lastDot) {
    // comma is the decimal separator
    text = text.replace(/\./g, '').replace(',', '.');
  } else {
    text = text.replace(/,/g, '');
  }
  const number = Number.parseFloat(text);
  return Number.isFinite(number) ? number : null;
}

/** Maps the export's headers to our field names. */
export function detectColumns(headers) {
  const normalized = headers.map(normalizeHeader);
  const columns = {};
  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    const alias = aliases.find((candidate) => normalized.includes(candidate));
    if (alias) {
      columns[field] = headers[normalized.indexOf(alias)];
    }
  });
  return columns;
}

/** One spreadsheet row (object keyed by header) -> import row without suiteId. */
export function mapExportRow(raw, columns) {
  const get = (field) => (columns[field] ? raw[columns[field]] : undefined);
  const people = Number.parseInt(get('people'), 10);
  const country = String(get('country') || '').trim();
  return {
    bookingNumber: String(get('bookingNumber') ?? '').trim() || null,
    guestName: String(get('guestName') || '').trim() || null,
    bookerName: String(get('bookerName') || '').trim() || null,
    checkIn: parseExportDate(get('checkIn')),
    checkOut: parseExportDate(get('checkOut')),
    status: String(get('status') || '').trim() || null,
    people: Number.isFinite(people) ? people : null,
    price: parseExportPrice(get('price')),
    unitType: String(get('unitType') || '').trim() || null,
    phone: String(get('phone') || '').trim() || null,
    country: country.length === 2 ? country.toLowerCase() : null,
    remarks: String(get('remarks') || '').trim() || null,
  };
}

/**
 * Reads a booking.com reservations export (.xls, .xlsx or .csv).
 * @returns {{rows: object[], columns: object, missing: string[]}}
 */
export function parseBookingExport(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  const headers = rawRows.length ? Object.keys(rawRows[0]) : [];
  const columns = detectColumns(headers);
  const missing = ['checkIn', 'checkOut'].filter((field) => !columns[field]);
  const rows = rawRows
    .map((raw) => mapExportRow(raw, columns))
    .filter((row) => row.checkIn || row.checkOut || row.bookingNumber);
  return { rows, columns, missing };
}

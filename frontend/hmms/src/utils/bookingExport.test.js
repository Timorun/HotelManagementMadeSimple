import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { detectColumns, mapExportRow, normalizeHeader, parseBookingExport, parseExportDate, parseExportPrice } from './bookingExport';

describe('booking.com export parsing', () => {
  it('normalizes headers in English and Spanish', () => {
    expect(normalizeHeader('Guest name(s)')).toBe('guestnames');
    expect(normalizeHeader('Número de reserva')).toBe('numerodereserva');
  });

  it('parses dates and prices in export formats', () => {
    expect(parseExportDate('2026-11-10')).toBe('2026-11-10');
    expect(parseExportDate('10/11/2026')).toBe('2026-11-10');
    expect(parseExportDate(new Date(2026, 10, 10))).toBe('2026-11-10');
    expect(parseExportDate(46336)).toBe('2026-11-10');
    expect(parseExportPrice('450.00 EUR')).toBe(450);
    expect(parseExportPrice('1.234,50 €')).toBe(1234.5);
    expect(parseExportPrice('')).toBeNull();
  });

  it('maps a row using detected columns', () => {
    const headers = ['Book number', 'Guest name(s)', 'Check-in', 'Check-out', 'Status', 'People', 'Price', 'Unit type', 'Booker country'];
    const columns = detectColumns(headers);
    const row = mapExportRow({
      'Book number': 4455667788,
      'Guest name(s)': 'Javier Moreno Castillo',
      'Check-in': '2026-11-10',
      'Check-out': '2026-11-13',
      Status: 'ok',
      People: '2',
      Price: '390.50 EUR',
      'Unit type': 'Double Room with Patio',
      'Booker country': 'ES',
    }, columns);
    expect(row).toMatchObject({
      bookingNumber: '4455667788',
      guestName: 'Javier Moreno Castillo',
      checkIn: '2026-11-10',
      checkOut: '2026-11-13',
      people: 2,
      price: 390.5,
      unitType: 'Double Room with Patio',
      country: 'es',
    });
  });

  it('reads a CSV export end to end', () => {
    const csv = 'Book number,Guest name(s),Check-in,Check-out,Status,Price\n123,Ana Ruiz,2026-12-01,2026-12-04,ok,300 EUR\n';
    const buffer = XLSX.write(XLSX.read(csv, { type: 'string' }), { type: 'array', bookType: 'xlsx' });
    const { rows, missing } = parseBookingExport(buffer);
    expect(missing).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ bookingNumber: '123', checkIn: '2026-12-01', price: 300 });
  });
});

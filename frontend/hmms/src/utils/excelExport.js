import * as XLSX from 'xlsx';

export function exportRowsToExcel(rows, fileName, sheetName = 'Data') {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

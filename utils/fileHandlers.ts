
import * as XLSX from 'xlsx';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const parseExcelHeaders = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = (window as any).XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = (window as any).XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          resolve(jsonData[0] as string[]);
        } else {
          resolve([]);
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const appendAndDownloadExcel = (originalFile: File, newData: any[]) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const workbook = (window as any).XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert current sheet to JSON, add new rows, convert back to sheet
    const existingData = (window as any).XLSX.utils.sheet_to_json(worksheet);
    const combinedData = [...existingData, ...newData];
    const newWorksheet = (window as any).XLSX.utils.json_to_sheet(combinedData);
    
    workbook.Sheets[firstSheetName] = newWorksheet;
    (window as any).XLSX.writeFile(workbook, `updated_${originalFile.name}`);
  };
  reader.readAsArrayBuffer(originalFile);
};

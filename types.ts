
export interface ExtractedData {
  [key: string]: string | number | boolean;
}

export interface ProcessingResult {
  fileName: string;
  data: ExtractedData;
  confidence: number;
}

export interface ExcelColumn {
  header: string;
  key: string;
}

export type ProcessingStatus = 'idle' | 'loading' | 'success' | 'error';

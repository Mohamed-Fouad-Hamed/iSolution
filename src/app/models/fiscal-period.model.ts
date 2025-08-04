export interface FiscalPeriodRequestDTO {
    name: string;
    startDate: string; // ISO string
    endDate: string;   // ISO string
    fiscalYearId: number;
  }
  
  export interface FiscalPeriodResponseDTO {
    id: number;
    serialId: string;
    name: string;
    startDate: string; // ISO string
    endDate: string;   // ISO string
    closed: boolean;
    fiscalYearId: number;
    fiscalYearName?: string; // From backend if provided
    createdAt?: string;
    updatedAt?: string;
  }
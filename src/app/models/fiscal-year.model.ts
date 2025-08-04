export interface FiscalYearRequestDTO {
    name: string;
    startDate: string; // ISO string for LocalDateTime
    endDate: string;   // ISO string for LocalDateTime
    accountId: number;
  }
  
  export interface FiscalYearResponseDTO {
    id: number;
    serialId: string;
    name: string;
    startDate: string; // ISO string
    endDate: string;   // ISO string
    closed: boolean;
    accountId: number;
    accountName?: string; // From backend if provided
    createdAt?: string;
    updatedAt?: string;
  }
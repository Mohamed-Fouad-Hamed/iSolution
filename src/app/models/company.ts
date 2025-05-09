export interface Company {
    name: string;
    serialId?: string | null; 
    taxIdentificationNumber?: string | null; 
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    created_date?: Date | null;
  }
/*export interface Company {
  id: number | null;
  serialId: string;
  accountType: number | null;
  accountName: string;
  accountLogo: string;
  accountImage: string;
  factory: boolean;
  minValue: number | null;
  minQuan: number | null;
  credit: number | null;
  rating: number | null;
  deliveryPeriod: string;
  weekend: string;
  workHours: string;
  taxIdentificationNumber: string;
  commercialRegistry: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  parentId: number | null;
  currencyId: number | null;
  stateId: number | null;
  countryId: number | null;
}*/

export interface Company {
  id: number | null;
  serialId: string;
  accountName: string;
  branchName: string;
  accountLogo: string;
  accountTypeId: number | null; // Changed from accountType
  // Address fields
  street1: string;
  street2: string;
  city: string;
  zipCode: string;
  stateId: number | null;
  countryId: number | null;
  // Other fields
  taxIdentificationNumber: string;
  commercialRegistry: string;
  currencyId: number | null;
  phone: string;
  email: string;
  website: string;
  emailDomain: string;
  color: string; // Will store the hex code
}

// New interface for Account Type
export interface AccountType {
  id: number;
  name: string;
}

// New interface for Color options
export interface Color {
  name: string;
  hex: string;
}

// Interfaces for other dropdowns
export interface Currency { id: number; name: string; }
export interface State { id: number; name: string; countryId: number; }
export interface Country { id: number; name: string; }
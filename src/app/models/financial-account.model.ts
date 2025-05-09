// src/app/features/financial-account/financial-account.model.ts

// Represents the data fetched from the backend / used in lists
export interface FinancialAccount {
    id: number; // Use number for frontend IDs
    serialId: string;
    name: string;
    description?: string;
    parentSerialId: string | null;
    accountTypeId: number;
    accountTypeName?: string; // Often useful to have this denormalized
    accountCategory?: string;
    balance: number; // Use number, BigDecimal handled by backend
    currency: string;
    isActive: boolean;
    accountId: number; // Parent Account ID
    isDebit: boolean;
    isCashAccount: boolean;
    isBankAccount: boolean;
    isControlAccount: boolean;
  }
  
  // Represents a node in the tree or a row in the hierarchical list
  export interface FinancialAccountNode extends FinancialAccount {
    children?: FinancialAccountNode[]; // For tree structure
    level?: number;                  // For indentation in list/tree styling
    expandable?: boolean;            // For tree control
    isExpanded?: boolean;            // For tree state persistence (optional)
  }
  
  // Simplified type interface (adapt if more fields needed)
  export interface FinancialAccountType {
      id: number;
      name: string;
      // Add other relevant type fields if needed
  }
  
  
  // DTOs for API interaction (match backend) - simplified for example
  export interface FinancialAccountCreatePayload extends Omit<FinancialAccount, 'id' | 'balance' | 'accountId' | 'accountTypeName'> {
    // Balance usually starts at 0 or is set server-side via transactions
  }
  // Ensure payload matches your service/backend needs for update
  export interface FinancialAccountUpdatePayload extends Omit<FinancialAccount, 'id' | 'balance' | 'accountId' | 'serialId' | 'accountTypeName'> {
   // Usually serialId and accountId are not updatable
  }
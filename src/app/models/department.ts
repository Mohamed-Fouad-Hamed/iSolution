/**
 * Base interface representing a Department, mirroring backend structure.
 * The `children` property is added dynamically for tree building.
 */
export interface Department {
    id: number;
    serialId: string ;
    parentSerialId: string | null;
    name: string;
    description?: string;
    companyId: number;
    children?: Department[]; // Added by buildTree helper
  }
  
  /**
   * Structure for the Material Tree's flattened nodes.
   */
  export interface DepartmentFlatNode {
    serialId: string;
    name: string;
    parentSerialId: string | null;
    level: number;
    expandable: boolean;
    isLoading?: boolean;
    originalData: Department; // Reference to the full original data
  }
  
  /**
   * DTO for backend responses.
   */
  export interface DepartmentDto {
    id: number;
    serialId: string | null ;
    parentSerialId: string | null;
    name: string;
    description?: string;
    accountId: number;
  }
  
  /**
   * DTO for creating departments.
   */
  export interface DepartmentCreateDto {
    serialId: string | null;
    parentSerialId?: string | null;
    name: string;
    description?: string;
    accountId: number;
  }
  
  /**
   * DTO for updating departments.
   */
  export interface DepartmentUpdateDto {
    serialId: string; // Contains the potentially new serial_id
    parentSerialId?: string | null;
    name: string;
    description?: string;
    accountId: number;
  }
  
  /**
   * Data passed TO the Department Dialog component.
   */
  export interface DepartmentDialogData {
      isEditMode: boolean;
      nodeToEdit?: Department;
      node?: DepartmentFlatNode; // The *flattened* node being edited
      parentSerialId?: string | null; // Parent serial ID if creating a child
      accountId: number;
      potentialParents: Department[]; // List of valid parent choices
  }
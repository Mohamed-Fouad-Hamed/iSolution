export interface CostCenterDepartment {
    id: number;
    name: string;
}
export interface CostCenter {
    id: number;
    serialId?:string;
    code?: string;
    name: string;
    description?: string;
    departmentId: number;
    departmentName?: string; // For display convenience
    departmentSerialId?:string;
  }
  
  export interface CostCenterRequestDTO {
    name: string;
    description?: string;
    departmentId: number;
  }
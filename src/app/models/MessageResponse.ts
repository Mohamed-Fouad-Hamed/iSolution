export interface MessageResponse{
    message:string;
    id:number;
    status:number;
    entity:any;
    list:any;
 }

 export interface MessagePageableResponse{
   message:string;
   count:number;
   status:number;
   list:any;
}
export const LANGUAGES : Language[] = [{ name:"Arabic", key:"ar" , transKey:"lang.arabic"}, { name:"English", key:"en"  , transKey:"lang.english" }]

export interface Language {
   name:string;
   key:string;
   transKey:string;
}
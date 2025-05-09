import { Injectable } from "@angular/core";
import { HttpHeaders } from "@angular/common/http";

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};


@Injectable({
  providedIn: 'root'
})


export class APIService {

    private  host:string = ''; 

    constructor(){

      this.host='localhost:8080';
      
    }


    get AUTH_API():string{
      const url =  `http://${this.host}/`;
      return url ;
    }

    get apiHost() : string{
      return `http://${this.host}`;
    }

    get headerJsonType() {
      return httpOptions;
    }

    getResourcePath(resource:string) : string | null {
      return resource && resource !=='' ? `${this.apiHost + resource}` : null;
    }

}

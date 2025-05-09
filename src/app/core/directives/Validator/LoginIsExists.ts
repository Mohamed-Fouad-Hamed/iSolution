import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, AsyncValidator, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap  } from 'rxjs/operators';
import { APIService } from '../../services/api.service';



@Injectable({
  providedIn: 'root'
})
export class LoginIsExistsValidators implements AsyncValidator {
 
  constructor(private http: HttpClient , private apiService:APIService) {}

  searchUser(text:string) {
    // debounce
    const URL = this.apiService.apiHost;

    return timer(1000)
      .pipe(
        switchMap(() => {
          // Check if login is exists
          return this.http.get<any>(`${URL}/display-name?id=${text}`)
        })
      );
  }
  
  validate(control: AbstractControl<any, any>): Observable<ValidationErrors | null>  {
    const result =  this.searchUser(control.value)
      .pipe(
        map((res) => ( res === false ? { notExists : true } : null) ) ,
        catchError(() => of(null)),
      );
      return result;
  }

  registerOnValidatorChange?(fn: () => void): void {
    throw new Error('Method not implemented.');
  }

}
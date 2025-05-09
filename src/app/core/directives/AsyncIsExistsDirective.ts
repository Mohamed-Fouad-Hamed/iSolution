import { Directive, forwardRef } from "@angular/core";
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from "@angular/forms";
import { LoginIsExistsValidators } from "./Validator/LoginIsExists";
import { Observable } from "rxjs";

@Directive({
    selector: '[IsExistsValidate]',
    providers: [
      {
        provide: NG_ASYNC_VALIDATORS,
        useExisting: forwardRef(() => IsExistsValidatorDirective),
        multi: true,
      },
    ],
    standalone: true,
  })
  export class IsExistsValidatorDirective implements AsyncValidator {
   
    constructor(private validator: LoginIsExistsValidators) {}
  
    validate(control: AbstractControl): Observable<ValidationErrors | null> {
      return this.validator.validate(control);
    }

  }
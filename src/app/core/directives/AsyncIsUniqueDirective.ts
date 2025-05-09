import { Directive, forwardRef } from "@angular/core";
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from "@angular/forms";
import { UserValidators } from "./Validator/UserValidation";
import { Observable } from "rxjs";

@Directive({
    selector: '[IsUniqueValidate]',
    providers: [
      {
        provide: NG_ASYNC_VALIDATORS,
        useExisting: forwardRef(() => IsUniqueValidatorDirective),
        multi: true,
      },
    ],
    standalone: true,
  })
  export class IsUniqueValidatorDirective implements AsyncValidator {
   
    constructor(private validator: UserValidators) {}
  
    validate(control: AbstractControl): Observable<ValidationErrors | null> {
      return this.validator.validate(control);
    }

  }
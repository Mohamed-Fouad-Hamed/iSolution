import { Directive, forwardRef } from "@angular/core";
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from "@angular/forms";
import { ProductNameValidator } from "./Validator/ProductNameValidator";
import { Observable } from "rxjs";

@Directive({
    selector: '[ProductNameIsUnique]',
    providers: [
      {
        provide: NG_ASYNC_VALIDATORS,
        useExisting: forwardRef(() => AsyncProductNameIsUniqueDirective),
        multi: true,
      },
    ],
    standalone: true,
  })
  export class AsyncProductNameIsUniqueDirective implements AsyncValidator {
   
    constructor(private validator: ProductNameValidator) {}
  
    validate(control: AbstractControl): Observable<ValidationErrors | null> {
      return this.validator.validate(control);
    }

  }
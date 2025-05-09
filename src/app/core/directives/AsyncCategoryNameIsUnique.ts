import { Directive, forwardRef } from "@angular/core";
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from "@angular/forms";
import { CategoryNameValidator } from "./Validator/CategoryNameValidator";
import { Observable } from "rxjs";

@Directive({
    selector: '[CategoryNameIsUnique]',
    providers: [
      {
        provide: NG_ASYNC_VALIDATORS,
        useExisting: forwardRef(() => AsyncCategoryNameIsUniqueDirective),
        multi: true,
      },
    ],
    standalone: true,
  })
  export class AsyncCategoryNameIsUniqueDirective implements AsyncValidator {
   
    constructor(private validator: CategoryNameValidator) {}
  
    validate(control: AbstractControl): Observable<ValidationErrors | null> {
      return this.validator.validate(control);
    }

  }
import { Directive, forwardRef } from "@angular/core";
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from "@angular/forms";
import { GroupNameValidator } from "./Validator/GroupNameValidator";
import { Observable } from "rxjs";

@Directive({
    selector: '[GroupNameIsUnique]',
    providers: [
      {
        provide: NG_ASYNC_VALIDATORS,
        useExisting: forwardRef(() => AsyncGroupNameIsUniqueDirective),
        multi: true,
      },
    ],
    standalone: true,
  })
  export class AsyncGroupNameIsUniqueDirective implements AsyncValidator {
   
    constructor(private validator: GroupNameValidator) {}
  
    validate(control: AbstractControl): Observable<ValidationErrors | null> {
      return this.validator.validate(control);
    }

  }
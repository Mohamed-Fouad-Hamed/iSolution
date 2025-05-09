import { Directive, Input } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";
import { forbiddenNameValidator } from "./Validator/regexValidation";

@Directive({
    selector: '[appRegexPattern]',
    providers: [
      {
        provide: NG_VALIDATORS,
        useExisting: RegexPatternDirective,
        multi: true,
      },
    ],
    standalone: true,
  })
  
  export class RegexPatternDirective implements Validator {
    @Input('appRegexPattern') forbiddenName = '';
  
    validate(control: AbstractControl): ValidationErrors | null {
      return this.forbiddenName
        ? forbiddenNameValidator(new RegExp(this.forbiddenName, 'i'))(control)
        : null;
    }
  }
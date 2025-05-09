import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function passwordsMatchValidator(
    controlName: string,
    matchingControlName: string,
    errorKey: string = 'passwordMismatch'
  ): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const control = formGroup.get(controlName);
      const matchingControl = formGroup.get(matchingControlName);
  
      if (!control || !matchingControl) {
        // If controls somehow don't exist, don't validate
        return null;
      }
  
      // Return null if controls haven't initialised yet or are pristine
      // Or if the matching control already has other errors (except this one)
      if (
        matchingControl.errors &&
        !matchingControl.errors[errorKey]
      ) {
        return null;
      }
  
      // Set error on matchingControl if validation fails
      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ ...matchingControl.errors, [errorKey]: true });
        return { [errorKey]: true }; // Optionally set error on the group too
      } else {
        // Important: Clear the error if validation passes
        const errors = { ...matchingControl.errors };
        delete errors[errorKey]; // Remove the mismatch error
        // Set errors to null if no other errors exist
        matchingControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
        return null;
      }
    };
  }
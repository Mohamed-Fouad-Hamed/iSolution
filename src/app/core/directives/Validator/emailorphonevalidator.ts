import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";

export function emailOrPhoneValidator(minPhoneLength: number = 7): ValidatorFn {
    // Basic phone regex: optional +, digits, spaces, hyphens. Adjust as needed for your specific requirements.
    // This allows things like +1 123-456-7890, 1234567890, 123-456-7890 etc.
    // It counts digits to ensure minimum length.
    const phoneRegex = /^\+?[\d\s-()]+$/;
  
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
  
      // Don't validate empty values, let Required validator handle it
      if (!value) {
        return null;
      }
  
      // Check for valid email format first
      const emailError = Validators.email(control);
      if (emailError === null) {
        return null; // It's a valid email
      }
  
      // If not a valid email, check for phone format
      const isPotentialPhone = phoneRegex.test(value);
      // Count actual digits to check length requirement
      const digitCount = (value.match(/\d/g) || []).length;
  
      if (isPotentialPhone && digitCount >= minPhoneLength) {
        return null; // It's a valid phone number
      }
  
      // If neither valid email nor valid phone, return error
      return { invalidEmailOrPhone: true };
    };
  }
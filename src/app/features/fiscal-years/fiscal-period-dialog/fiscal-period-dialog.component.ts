import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DATE_LOCALE , MAT_DATE_FORMATS } from '@angular/material/core';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FiscalPeriodRequestDTO, FiscalPeriodResponseDTO } from '../../../models/fiscal-period.model';
import { dateRangeValidator } from '../../../shared/validators/date-range.validator';
import { take } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';



export interface FiscalPeriodDialogData {
  fiscalPeriod?: FiscalPeriodResponseDTO;
  fiscalYearId: number;
  fiscalYearStartDate: string; // ISO string
  fiscalYearEndDate: string;   // ISO string
  dialogTitleKey: string;
}

// Custom validator for period dates within fiscal year dates
export function periodWithinYearValidator(yearStartDateStr: string, yearEndDateStr: string): (control: AbstractControl) => ValidationErrors | null {
  return (group: AbstractControl): ValidationErrors | null => {
    const periodStartDateControl = group.get('startDate');
    const periodEndDateControl = group.get('endDate');

    // Ensure controls exist and have values before proceeding
    if (!periodStartDateControl || !periodEndDateControl || !periodStartDateControl.value || !periodEndDateControl.value) {
      return null; // Not enough info to validate, or let other validators (like 'required') handle it
    }

    // --- THIS IS THE KEY CHANGE ---
    // Convert form control values to Date objects
    // The value from MatDatepicker should already be a Date object if MatNativeDateModule is used,
    // but it's safer to ensure it or handle cases where it might be a string.
    let periodStartDate: Date | null = null;
    if (periodStartDateControl.value instanceof Date) {
      periodStartDate = new Date(periodStartDateControl.value.getTime()); // Clone to avoid modifying original
    } else if (typeof periodStartDateControl.value === 'string') {
      periodStartDate = new Date(periodStartDateControl.value);
    }

    let periodEndDate: Date | null = null;
    if (periodEndDateControl.value instanceof Date) {
      periodEndDate = new Date(periodEndDateControl.value.getTime()); // Clone
    } else if (typeof periodEndDateControl.value === 'string') {
      periodEndDate = new Date(periodEndDateControl.value);
    }

    // If conversion failed or values are still null, we can't validate this specific rule
    if (!periodStartDate || !periodEndDate || isNaN(periodStartDate.getTime()) || isNaN(periodEndDate.getTime())) {
        return null; // Or return an error if strict parsing is required
    }
    // --- END OF KEY CHANGE ---


    const yearStartDate = new Date(yearStartDateStr); // Assumes yearStartDateStr is a valid ISO string
    const yearEndDate = new Date(yearEndDateStr);     // Assumes yearEndDateStr is a valid ISO string

    // Set time to 00:00:00 for start dates and 23:59:59 for end dates for proper comparison
    // Do this on copies to avoid side effects if the original values are Date objects.
    const pStartDateComparable = new Date(periodStartDate.getTime());
    const pEndDateComparable = new Date(periodEndDate.getTime());
    const yStartDateComparable = new Date(yearStartDate.getTime());
    const yEndDateComparable = new Date(yearEndDate.getTime());

    pStartDateComparable.setHours(0, 0, 0, 0);
    pEndDateComparable.setHours(23, 59, 59, 999);
    yStartDateComparable.setHours(0, 0, 0, 0);
    yEndDateComparable.setHours(23, 59, 59, 999);


    if (pStartDateComparable < yStartDateComparable || pEndDateComparable > yEndDateComparable) {
      return { periodOutsideYearRange: true };
    }

    return null;
  };
}

export const MY_MOMENT_DATE_FORMATS = {
  parse: {
    dateInput: 'YYYY/MM/DD', // Moment.js 'LL' format (e.g., September 4, 1986)
  },
  display: {
    dateInput: 'YYYY/MM/DD', // Format for displaying in the input
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};



@Component({
  selector: 'app-fiscal-period-dialog',
  templateUrl: './fiscal-period-dialog.component.html',
  // styleUrls: ['./fiscal-period-dialog.component.scss'], // can reuse fiscal-year-dialog.scss or create specific
  styleUrls: ['../fiscal-year-dialog/fiscal-year-dialog.component.scss'], // Re-use styles
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TranslateModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatDatepickerModule, MatMomentDateModule, MatProgressSpinnerModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }, // Example
    { provide: MAT_DATE_FORMATS, useValue: MY_MOMENT_DATE_FORMATS }
  ] // For formatting dates in the table
})
export class FiscalPeriodDialogComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FiscalPeriodDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FiscalPeriodDialogData,
    public translate: TranslateService,
    private snackBar:MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.data.fiscalPeriod?.name || '', [Validators.required, Validators.maxLength(255)]],
      startDate: [this.data.fiscalPeriod ? new Date(this.data.fiscalPeriod.startDate) : null, Validators.required],
      endDate: [this.data.fiscalPeriod ? new Date(this.data.fiscalPeriod.endDate) : null, Validators.required],
    }, {
      validators: [
        dateRangeValidator('startDate', 'endDate'),
        periodWithinYearValidator(this.data.fiscalYearStartDate, this.data.fiscalYearEndDate)
      ]
    });
  }

  get title(): string {
    return this.translate.instant(this.data.dialogTitleKey);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const rawValue = this.form.getRawValue();
  
    // --- KEY CHANGE: Ensure startDateValue and endDateValue are Date objects ---
    let startDateValue = rawValue.startDate;
    if (!(startDateValue instanceof Date) && startDateValue) {
      startDateValue = new Date(startDateValue);
    }
  
    let endDateValue = rawValue.endDate;
    if (!(endDateValue instanceof Date) && endDateValue) {
      endDateValue = new Date(endDateValue);
    }
  
    if (!startDateValue || !(startDateValue instanceof Date) || isNaN(startDateValue.getTime()) ||
        !endDateValue || !(endDateValue instanceof Date) || isNaN(endDateValue.getTime())) {
      this.isLoading = false;
      this.translate.get('GENERAL.ERROR_INVALID_DATE_FORMAT').pipe(take(1)).subscribe(msg => {
          this.snackBar.open(msg, 'ERROR', { duration: 5000 });
      });
      console.error('Invalid date values from form:', rawValue.startDate, rawValue.endDate);
      return;
    }
    // --- END OF KEY CHANGE ---
  
    const toLocalDateISOString = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
  
    const requestData: FiscalPeriodRequestDTO = {
      name: rawValue.name,
      startDate: `${toLocalDateISOString(startDateValue)}T00:00:00`,
      endDate: `${toLocalDateISOString(endDateValue)}T23:59:59`,
      fiscalYearId: this.data.fiscalYearId,
    };

    this.dialogRef.close(requestData);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

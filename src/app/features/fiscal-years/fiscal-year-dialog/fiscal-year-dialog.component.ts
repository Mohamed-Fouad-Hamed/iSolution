import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {  MAT_DATE_LOCALE ,MAT_DATE_FORMATS } from '@angular/material/core';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FiscalYearRequestDTO, FiscalYearResponseDTO } from '../../../models/fiscal-year.model';
import { dateRangeValidator } from '../../../shared/validators/date-range.validator';
import { take } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface FiscalYearDialogData {
  fiscalYear?: FiscalYearResponseDTO;
  accountId: number;
  dialogTitleKey: string; // e.g., 'FISCAL_CONFIG.ADD_FISCAL_YEAR'
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
  selector: 'app-fiscal-year-dialog',
  templateUrl: './fiscal-year-dialog.component.html',
  styleUrls: ['./fiscal-year-dialog.component.scss'],
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
export class FiscalYearDialogComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FiscalYearDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FiscalYearDialogData,
    public translate: TranslateService,
    private snackBar : MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.data.fiscalYear?.name || '', [Validators.required, Validators.maxLength(50)]],
      startDate: [this.data.fiscalYear ? new Date(this.data.fiscalYear.startDate) : null, Validators.required],
      endDate: [this.data.fiscalYear ? new Date(this.data.fiscalYear.endDate) : null, Validators.required],
    }, { validators: dateRangeValidator('startDate', 'endDate') });
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
      startDateValue = new Date(startDateValue); // Attempt to parse if not a Date
    }
  
    let endDateValue = rawValue.endDate;
    if (!(endDateValue instanceof Date) && endDateValue) {
      endDateValue = new Date(endDateValue); // Attempt to parse if not a Date
    }
  
    // Check if conversion was successful and values are valid dates
    if (!startDateValue || !(startDateValue instanceof Date) || isNaN(startDateValue.getTime()) ||
        !endDateValue || !(endDateValue instanceof Date) || isNaN(endDateValue.getTime())) {
      this.isLoading = false;
      // Handle error: unable to parse dates from form
      this.translate.get('GENERAL.ERROR_INVALID_DATE_FORMAT').pipe(take(1)).subscribe(msg => { // Add this key to translations
          this.snackBar.open(msg, 'ERROR', { duration: 5000 });
      });
      console.error('Invalid date values from form:', rawValue.startDate, rawValue.endDate);
      return;
    }
    // --- END OF KEY CHANGE ---
  
  
    // Helper function to format a local Date into YYYY-MM-DD
    const toLocalDateISOString = (date: Date): string => { // Now 'date' is guaranteed to be a Date
      const year = date.getFullYear(); // This should now work
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
  
    const requestData: FiscalYearRequestDTO = {
      name: rawValue.name,
      startDate: `${toLocalDateISOString(startDateValue)}T00:00:00`,
      endDate: `${toLocalDateISOString(endDateValue)}T23:59:59`,
      accountId: this.data.accountId,
    };
  
  
    this.dialogRef.close(requestData); // Pass DTO back to parent
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

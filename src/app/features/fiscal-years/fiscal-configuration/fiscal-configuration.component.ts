import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; // For open/close toggle

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap, take, takeUntil, tap } from 'rxjs/operators';

import { FiscalConfigService } from '../../../core/services/fiscal-config.service';
import { FiscalYearRequestDTO, FiscalYearResponseDTO } from '../../../models/fiscal-year.model';
import { FiscalPeriodRequestDTO, FiscalPeriodResponseDTO } from '../../../models/fiscal-period.model';

import { FiscalYearDialogComponent, FiscalYearDialogData } from '../fiscal-year-dialog/fiscal-year-dialog.component';
import { FiscalPeriodDialogComponent, FiscalPeriodDialogData } from '../fiscal-period-dialog/fiscal-period-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component'; // Assuming you have this
import { AuthService } from '../../../core/services/auth.service';
import { MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core'; // Import MatNativeDateModule
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { MatDatepickerModule } from '@angular/material/datepicker';

// Example of custom date formats (optional)
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
  selector: 'app-fiscal-configuration',
  templateUrl: './fiscal-configuration.component.html',
  styleUrls: ['./fiscal-configuration.component.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, TranslateModule, MatDialogModule, MatSnackBarModule, MatTableModule,
    MatSortModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatCardModule, MatDividerModule, MatTooltipModule, MatSlideToggleModule,
    MatDatepickerModule, // Datepicker module
    MatMomentDateModule
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ DatePipe,
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }, // Example
    { provide: MAT_DATE_FORMATS, useValue: MY_MOMENT_DATE_FORMATS }] // For formatting dates in the table
})
export class FiscalConfigurationComponent implements OnInit, AfterViewInit, OnDestroy {
  accountId: number | null = null;
  accountName: string | null = null; // Optional: To display account name

  // Fiscal Years
  fyDisplayedColumns: string[] = ['name', 'serialId', 'startDate', 'endDate', 'status', 'actions'];
  fyDataSource = new MatTableDataSource<FiscalYearResponseDTO>();
  @ViewChild('fySort') fySort!: MatSort;
  fyFilterCtrl = new FormControl<string>('');
  isLoadingFY = false;

  // Fiscal Periods
  selectedFiscalYear: FiscalYearResponseDTO | null = null;
  fpDisplayedColumns: string[] = ['name', 'serialId', 'startDate', 'endDate', 'status', 'actions'];
  fpDataSource = new MatTableDataSource<FiscalPeriodResponseDTO>();
  @ViewChild('fpSort') fpSort!: MatSort;
  fpFilterCtrl = new FormControl<string>('');
  isLoadingFP = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fiscalConfigService: FiscalConfigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private datePipe: DatePipe,
    private authService : AuthService,
    private cdr : ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const storedAccountId = this.authService.currentAccountId();
    if (storedAccountId) {
      this.accountId = +storedAccountId;
      this.loadFiscalYears();
      // Optional: Load account name
      // this.fiscalConfigService.getAccountById(this.accountId).pipe(takeUntil(this.destroy$)).subscribe(acc => this.accountName = acc.name);
    } else {
      this.translate.get('FISCAL_CONFIG.NO_ACCOUNT_ID_IN_STORAGE').pipe(take(1)) // Add this key
        .subscribe(msg => this.showSnackbar(msg, 'ERROR'));
        // Potentially redirect or show a prominent error message
    }

    this.setupFilters();
  }

  ngAfterViewInit(): void {
    this.fyDataSource.sort = this.fySort;
    this.fpDataSource.sort = this.fpSort;

    this.fyDataSource.filterPredicate = (data, filter) => data.name.toLowerCase().includes(filter);
    this.fpDataSource.filterPredicate = (data, filter) => data.name.toLowerCase().includes(filter);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    this.fyFilterCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => this.fyDataSource.filter = (value || '').trim().toLowerCase());

    this.fpFilterCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => this.fpDataSource.filter = (value || '').trim().toLowerCase());
  }

  // --- Fiscal Year Methods ---
  loadFiscalYears(): void {
    if (!this.accountId) return;
    this.isLoadingFY = true;
    this.selectedFiscalYear = null; // Clear selected year and its periods
    this.fpDataSource.data = [];

    this.fiscalConfigService.getFiscalYearsByAccount(this.accountId).pipe(
      finalize(() => 
        {
          this.isLoadingFY = false ;
          this.cdr.markForCheck();
        }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: data => this.fyDataSource.data = data,
      error: err => this.showSnackbar(err.message || this.translate.instant('GENERAL.ERROR_GENERIC'), 'ERROR')
    });
  }

  onSelectFiscalYear(fy: FiscalYearResponseDTO): void {
    this.selectedFiscalYear = fy;
    this.fpFilterCtrl.setValue(''); // Clear period filter
    this.loadFiscalPeriods();
  }

  openFiscalYearDialog(fiscalYear?: FiscalYearResponseDTO): void {
    if (!this.accountId) return;
    const dialogData: FiscalYearDialogData = {
      fiscalYear,
      accountId: this.accountId,
      dialogTitleKey: fiscalYear ? 'FISCAL_CONFIG.EDIT_FISCAL_YEAR' : 'FISCAL_CONFIG.ADD_FISCAL_YEAR'
    };

    const dialogRef = this.dialog.open(FiscalYearDialogComponent, { width: '600px', data: dialogData, disableClose: true });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: FiscalYearRequestDTO | undefined) => {
      if (result) {
        this.isLoadingFY = true;
        const operation$ = fiscalYear
          ? this.fiscalConfigService.updateFiscalYear(fiscalYear.id, result)
          : this.fiscalConfigService.createFiscalYear(result);

        operation$.pipe(finalize(() => this.isLoadingFY = false), takeUntil(this.destroy$)).subscribe({
          next: (savedFY) => {
            this.showSnackbar(this.translate.instant(fiscalYear ? 'GENERAL.SUCCESS_UPDATED' : 'GENERAL.SUCCESS_CREATED', { entity: this.translate.instant('FISCAL_CONFIG.FISCAL_YEAR'), name: savedFY.name }), 'SUCCESS');
            this.loadFiscalYears();
          },
          error: err => this.showSnackbar(err.message || this.translate.instant('GENERAL.ERROR_GENERIC'), 'ERROR')
        });
      }
    });
  }

  toggleFiscalYearStatus(fy: FiscalYearResponseDTO, event: Event): void {
    event.stopPropagation(); // Prevent row selection
    const newStatus = fy.closed; // The target status
    const confirmMsgKey = newStatus ? 'FISCAL_CONFIG.OPEN_YEAR_CONFIRM' : 'FISCAL_CONFIG.CLOSE_YEAR_CONFIRM';

    this.translate.get([confirmMsgKey, 'GENERAL.CONFIRM_ACTION_TITLE'], { name: fy.name }) // Add CONFIRM_ACTION_TITLE
      .pipe(
        take(1),
        switchMap(translations => {
          const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: { 
              title: translations['GENERAL.CONFIRM_ACTION_TITLE'],
               message: translations[confirmMsgKey],
               confirmButtonText: this.translate.instant('COMMON.BUTTONS.CONFIRM'),
               cancelButtonText: this.translate.instant('COMMON.BUTTONS.CANCEL') }
          });
          return dialogRef.afterClosed();
        }),
        takeUntil(this.destroy$)
      ).subscribe(confirmed => {
        if (confirmed) {
          this.isLoadingFY = true;
          const operation$ = newStatus
            ? this.fiscalConfigService.openFiscalYear(fy.id)
            : this.fiscalConfigService.closeFiscalYear(fy.id);

          operation$.pipe(finalize(() => this.isLoadingFY = false), takeUntil(this.destroy$)).subscribe({
            next: (updatedFY) => {
              this.showSnackbar(this.translate.instant('GENERAL.SUCCESS_STATUS_CHANGED', {
                entity: this.translate.instant('FISCAL_CONFIG.FISCAL_YEAR'),
                name: updatedFY.name,
                status: this.translate.instant(updatedFY.closed ? 'GENERAL.CLOSED' : 'GENERAL.OPEN')
              }), 'SUCCESS');
              this.loadFiscalYears(); // Refresh list
              if(this.selectedFiscalYear?.id === updatedFY.id) this.selectedFiscalYear = updatedFY; // Update selected if it was this one
            },
            error: err => this.showSnackbar(err.message || this.translate.instant('GENERAL.ERROR_GENERIC'), 'ERROR')
          });
        }
      });
  }

  deleteFiscalYear(fy: FiscalYearResponseDTO, event: Event): void {
    event.stopPropagation();
    this.translate.get(['GENERAL.CONFIRM_DELETE_TITLE', 'GENERAL.CONFIRM_DELETE_MESSAGE'], { name: fy.name })
      .pipe(
        take(1),
        switchMap(translations => {
          const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
               title: translations['GENERAL.CONFIRM_DELETE_TITLE'],
               message: translations['GENERAL.CONFIRM_DELETE_MESSAGE'] ,
               confirmButtonText: this.translate.instant('COMMON.BUTTONS.CONFIRM'),
               cancelButtonText: this.translate.instant('COMMON.BUTTONS.CANCEL') 
             }
          });
          return dialogRef.afterClosed();
        }),
        takeUntil(this.destroy$)
      ).subscribe(confirmed => {
        if (confirmed) {
          this.isLoadingFY = true;
          this.fiscalConfigService.deleteFiscalYear(fy.id).pipe(
            finalize(() => this.isLoadingFY = false),
            takeUntil(this.destroy$)
          ).subscribe({
            next: () => {
              this.showSnackbar(this.translate.instant('GENERAL.SUCCESS_DELETED', { entity: this.translate.instant('FISCAL_CONFIG.FISCAL_YEAR'), name: fy.name }), 'SUCCESS');
              this.loadFiscalYears();
            },
            error: err => this.showSnackbar(err.message || this.translate.instant('GENERAL.ERROR_GENERIC'), 'ERROR')
          });
        }
      });
  }


  // --- Fiscal Period Methods ---
  loadFiscalPeriods(): void {
    if (!this.selectedFiscalYear) return;
    this.isLoadingFP = true;
    this.fiscalConfigService.getFiscalPeriodsByYear(this.selectedFiscalYear.id).pipe(
      finalize(() => {
        this.isLoadingFP = false;
        this.cdr.markForCheck();
      }
    ),
      takeUntil(this.destroy$)
    ).subscribe({
      next: data => this.fpDataSource.data = data,
      error: err => this.showSnackbar(err.message || this.translate.instant('GENERAL.ERROR_GENERIC'), 'ERROR')
    });
  }

  openFiscalPeriodDialog(fiscalPeriod?: FiscalPeriodResponseDTO): void {
    if (!this.selectedFiscalYear) return;
    const dialogData: FiscalPeriodDialogData = {
      fiscalPeriod,
      fiscalYearId: this.selectedFiscalYear.id,
      fiscalYearStartDate: this.selectedFiscalYear.startDate,
      fiscalYearEndDate: this.selectedFiscalYear.endDate,
      dialogTitleKey: fiscalPeriod ? 'FISCAL_CONFIG.EDIT_FISCAL_PERIOD' : 'FISCAL_CONFIG.ADD_FISCAL_PERIOD'
    };

    const dialogRef = this.dialog.open(FiscalPeriodDialogComponent, { width: '600px', data: dialogData, disableClose: true });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result: FiscalPeriodRequestDTO | undefined) => {
      if (result) {
        this.isLoadingFP = true;
        const operation$ = fiscalPeriod
          ? this.fiscalConfigService.updateFiscalPeriod(fiscalPeriod.id, result)
          : this.fiscalConfigService.createFiscalPeriod(result);

        operation$.pipe(finalize(() => this.isLoadingFP = false), takeUntil(this.destroy$)).subscribe({
          next: (savedFP) => {
             this.showSnackbar(this.translate.instant(fiscalPeriod ? 'GENERAL.SUCCESS_UPDATED' : 'GENERAL.SUCCESS_CREATED', { entity: this.translate.instant('FISCAL_CONFIG.FISCAL_PERIOD'), name: savedFP.name }), 'SUCCESS');
            this.loadFiscalPeriods();
          },
          error: err => this.showSnackbar(err.message || this.translate.instant('GENERAL.ERROR_GENERIC'), 'ERROR')
        });
      }
    });
  }

  toggleFiscalPeriodStatus(fp: FiscalPeriodResponseDTO, event: Event): void {
    event.stopPropagation();
    if(!this.selectedFiscalYear) return;

    const newStatus = fp.closed; // The target status
    // If trying to open a period but the year is closed
    if (newStatus && this.selectedFiscalYear.closed) {
        this.showSnackbar(this.translate.instant('FISCAL_CONFIG.CANNOT_OPEN_PERIOD_IN_CLOSED_YEAR', {yearName: this.selectedFiscalYear.name}), 'ERROR');
        return;
    }

    const confirmMsgKey = newStatus ? 'FISCAL_CONFIG.OPEN_PERIOD_CONFIRM' : 'FISCAL_CONFIG.CLOSE_PERIOD_CONFIRM';

    this.translate.get([confirmMsgKey, 'GENERAL.CONFIRM_ACTION_TITLE'], { name: fp.name })
      .pipe(
        take(1),
        switchMap(translations => {
          const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                    title: translations['GENERAL.CONFIRM_ACTION_TITLE'],
                    message: translations[confirmMsgKey] ,
                    confirmButtonText: this.translate.instant('COMMON.BUTTONS.CONFIRM'),
                    cancelButtonText: this.translate.instant('COMMON.BUTTONS.CANCEL') 
                  }
          });
          return dialogRef.afterClosed();
        }),
        takeUntil(this.destroy$)
      ).subscribe(confirmed => {
        if (confirmed) {
          this.isLoadingFP = true;
          const operation$ = newStatus
            ? this.fiscalConfigService.openFiscalPeriod(fp.id)
            : this.fiscalConfigService.closeFiscalPeriod(fp.id);

          operation$.pipe(finalize(() =>
            {
               this.isLoadingFP = false;
               this.cdr.markForCheck();
            }), takeUntil(this.destroy$)).subscribe({
            next: (updatedFP) => {
              this.showSnackbar(this.translate.instant('GENERAL.SUCCESS_STATUS_CHANGED', {
                entity: this.translate.instant('FISCAL_CONFIG.FISCAL_PERIOD'),
                name: updatedFP.name,
                status: this.translate.instant(updatedFP.closed ? 'GENERAL.CLOSED' : 'GENERAL.OPEN')
              }), 'SUCCESS');
              this.loadFiscalPeriods();
            },
            error: err => this.showSnackbar(err.message || this.translate.instant('GENERAL.ERROR_GENERIC'), 'ERROR')
          });
        }
      });
  }

  deleteFiscalPeriod(fp: FiscalPeriodResponseDTO, event: Event): void {
    event.stopPropagation();
    this.translate.get(['GENERAL.CONFIRM_DELETE_TITLE', 'GENERAL.CONFIRM_DELETE_MESSAGE'], { name: fp.name })
      .pipe(
        take(1),
        switchMap(translations => {
          const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: { 
                    title: translations['GENERAL.CONFIRM_DELETE_TITLE'],
                    message: translations['GENERAL.CONFIRM_DELETE_MESSAGE']  ,
                    confirmButtonText: this.translate.instant('COMMON.BUTTONS.CONFIRM'),
                    cancelButtonText: this.translate.instant('COMMON.BUTTONS.CANCEL') 
                   }
          });
          return dialogRef.afterClosed();
        }),
        takeUntil(this.destroy$)
      ).subscribe(confirmed => {
        if (confirmed) {
          this.isLoadingFP = true;
          this.fiscalConfigService.deleteFiscalPeriod(fp.id).pipe(
            finalize(() => this.isLoadingFP = false),
            takeUntil(this.destroy$)
          ).subscribe({
            next: () => {
               this.showSnackbar(this.translate.instant('GENERAL.SUCCESS_DELETED', { entity: this.translate.instant('FISCAL_CONFIG.FISCAL_PERIOD'), name: fp.name }), 'SUCCESS');
              this.loadFiscalPeriods();
            },
            error: err => this.showSnackbar(err.message || this.translate.instant('GENERAL.ERROR_GENERIC'), 'ERROR')
          });
        }
      });
  }

  // --- Helpers ---
  showSnackbar(message: string, panelClass: 'SUCCESS' | 'ERROR' | 'WARN'): void {
    this.snackBar.open(message, this.translate.instant('GENERAL.DISMISS' /* Add DISMISS to translations */), {
      duration: panelClass === 'ERROR' ? 7000 : 4000,
      panelClass: `snackbar-${panelClass.toLowerCase()}` // e.g., snackbar-success
    });
  }

  formatDate(dateInput: string | Date | undefined | null): string {
    if (!dateInput) {
      return '-';
    }

    // The DatePipe can handle ISO strings or Date objects directly.
    // No need for custom splitting if the backend sends ISO strings.
    const transformedDate = this.datePipe.transform(dateInput, 'YYYY/MM/dd');

    if (transformedDate) {
      return transformedDate;
    } else {
      // This case should ideally not be hit if dateInput is a valid ISO string or Date object.
      // If it is, it means the input format is still unexpected.
      console.warn('formatDate: DatePipe could not transform date input:', dateInput);
      // Attempt to convert to string if it's an object but not a standard parsable one by DatePipe
      return typeof dateInput === 'object' ? String(dateInput) : dateInput || '-';
    }
  }

  clearFyFilter(): void {
    this.fyFilterCtrl.setValue('');
  }
  clearFpFilter(): void {
    this.fpFilterCtrl.setValue('');
  }
}

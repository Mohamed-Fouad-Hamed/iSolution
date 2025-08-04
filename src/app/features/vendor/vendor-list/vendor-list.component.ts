import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // For loading indicator
import { MatExpansionModule } from '@angular/material/expansion'; // <--- ADDED for Expansion Panel
import { MatTooltipModule } from '@angular/material/tooltip'; // <--- ADDED for tooltips
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Subject, merge, of, Subscription, Observable } from 'rxjs';
import { startWith, switchMap, catchError, map, takeUntil, debounceTime, distinctUntilChanged, tap, filter } from 'rxjs/operators';

import { VendorService } from '../../../core/services/VendorService';
import { AuthService } from '../../../core/services/auth.service';
import { VendorDto, VendorCreateDto, VendorUpdateDto, VendorFilterParams, Page } from '../../../models/vendor.model';
import { VendorDialogComponent, VendorDialogData } from '../vendor-dialog/vendor-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component'; // Adjust path
import { MatToolbarModule } from '@angular/material/toolbar';
import { CustomPaginatorIntl } from '../../../shared/paginator/custom-paginator-intl';

@Component({
  selector: 'app-vendor-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule, // Import spinner
    TranslateModule,
    MatOptionModule,
    MatSelectModule,
    MatExpansionModule,
    MatToolbarModule,
    MatTooltipModule
    // Import your dialog components if they are standalone
    // VendorDialogComponent, // No need if opened via MatDialog service
    // ConfirmationDialogComponent // No need if opened via MatDialog service
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }
  ],
  templateUrl: './vendor-list.component.html',
  styleUrls: ['./vendor-list.component.scss']
})
export class VendorListComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['vendorCode', 'name', 'email', 'phone', 'isActive', 'actions'];
  // --- MODIFICATION: Use VendorDto[] directly ---
  dataSource: VendorDto[] = [];
  // --- END MODIFICATION ---
  totalElements = 0;
  isLoading = true;
  currentAccountId: number | null = null;
  filterForm: FormGroup;

  private destroy$ = new Subject<void>();
  // private filterSubscription: Subscription | null = null; // Can be removed

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  statusFilterOptions = [
    { value: null, viewValueKey: 'VENDOR.FILTER.STATUS_ALL' },
    { value: true, viewValueKey: 'VENDOR.FILTER.STATUS_ACTIVE' },
    { value: false, viewValueKey: 'VENDOR.FILTER.STATUS_INACTIVE' }
  ];

  isFilterPanelExpanded = false;

  constructor(
    private vendorService: VendorService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      name: [''],
      email: [''],
      vendorCode: [''],
      phone: [''],
      isActive: [null]
    });
  }

  ngOnInit(): void {
    const currentAccount = this.authService.currentAccountId();
    this.currentAccountId = currentAccount ? +currentAccount : null;
  }

  ngAfterViewInit(): void {
    if (!this.paginator || !this.sort) {
      console.warn('VendorListComponent: Paginator or Sort not yet initialized in ngAfterViewInit. Attempting deferred initialization.');
      Promise.resolve().then(() => this.initializeDataLoadingStream());
      return;
    }
    this.initializeDataLoadingStream();
  }

  private initializeDataLoadingStream(): void {
    if (!this.paginator || !this.sort) {
      console.error('VendorListComponent: Paginator or Sort STILL not initialized. Data loading cannot proceed.');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
    console.log('VendorListComponent: Initializing data loading stream.');

    // --- MODIFICATION: Remove MatTableDataSource specific connections ---
    // this.dataSource.paginator = this.paginator; // No longer needed
    // this.dataSource.sort = this.sort;          // No longer needed
    // --- END MODIFICATION ---

    // Reset paginator when sort or filter changes
    merge(
      this.sort.sortChange.pipe(tap(() => console.log('Vendor sort changed'))),
      this.filterForm.valueChanges.pipe(debounceTime(400), distinctUntilChanged(), tap(() => console.log('Vendor filter changed')))
    ).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.paginator && this.paginator.pageIndex !== 0) {
        console.log('VendorListComponent: Resetting paginator to page 0 due to sort/filter change.');
        this.paginator.pageIndex = 0;
      }
    });

    // Merge all changes together: sort, page, and filter
    merge(
      this.sort.sortChange,
      this.paginator.page,
      this.filterForm.valueChanges.pipe(debounceTime(400), distinctUntilChanged())
    )
      .pipe(
        startWith({}), // Trigger initial load
        tap(event => console.log('Vendor data loading stream triggered by:', event || 'initial load')),
        switchMap(() => this.loadVendors()),
        catchError(err => {
          console.error("Error in vendor loading stream:", err);
          this.isLoading = false;
          // --- MODIFICATION: Use array directly ---
          this.dataSource = [];
          // --- END MODIFICATION ---
          this.totalElements = 0;
          this.cdr.detectChanges();
          this.showSnackbar('VENDOR.MESSAGES.LOAD_ERROR', 'error');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(pageData => {
        if (pageData) {
          console.log('Vendor data stream: Load successful. Total:', this.totalElements, 'Current page items:', this.dataSource.length);
        } else {
          console.log('Vendor data stream: Load returned null (likely handled error). Total:', this.totalElements, 'Current items:', this.dataSource.length);
        }
        this.logPaginatorState();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // if (this.filterSubscription) { // Remove if filterSubscription is removed
    //     this.filterSubscription.unsubscribe();
    // }
  }

  loadVendors(): Observable<Page<VendorDto> | null> {
    if (!this.paginator) {
        console.error("VendorListComponent: Paginator not initialized in loadVendors!");
        this.isLoading = false;
        this.dataSource = [];
        this.totalElements = 0;
        this.cdr.detectChanges();
        return of(null);
    }
    if (this.currentAccountId === null) {
      console.error("Account ID not available for loadVendors call.");
      this.isLoading = false;
      // --- MODIFICATION: Use array directly ---
      this.dataSource = [];
      // --- END MODIFICATION ---
      this.totalElements = 0;
      this.cdr.detectChanges();
      return of(null);
    }

    this.isLoading = true;
    // No need to call cdr.detectChanges() here immediately, will call after fetch.

    const pageIndex = this.paginator.pageIndex;
    const pageSize = this.paginator.pageSize;
    const activeSortField = this.sort?.active || 'name';
    const currentSortDirection = this.sort?.direction || 'asc'; // Default direction

    const filters: VendorFilterParams = this.filterForm.value;
    const preparedFilters: VendorFilterParams = {
      ...filters,
      isActive: filters.isActive === null ? undefined : filters.isActive
    };

    console.log(`loadVendors: Fetching page ${pageIndex}, size ${pageSize}, sort ${activeSortField} ${currentSortDirection}`);

    return this.vendorService.getAllVendors(
      this.currentAccountId,
      pageIndex,
      pageSize,
      activeSortField,
      currentSortDirection,
      preparedFilters
    ).pipe(
      map(page => {
        this.isLoading = false;
        if (page && page.content) {
          this.totalElements = page.totalElements;
          // --- MODIFICATION: Use array directly ---
          this.dataSource = page.content;
          // --- END MODIFICATION ---
          console.log(`VendorListComponent: Loaded ${this.dataSource.length} vendors. Total elements: ${this.totalElements}.`);
        } else {
          console.warn('VendorListComponent: loadVendors received no page or no content. Resetting.');
          this.totalElements = 0;
          this.dataSource = [];
        }
        this.cdr.detectChanges(); // Crucial for UI update
        return page;
      }),
      catchError(error => {
        console.error("Error loading vendors:", error);
        this.isLoading = false;
        this.totalElements = 0;
        // --- MODIFICATION: Use array directly ---
        this.dataSource = [];
        // --- END MODIFICATION ---
        this.showSnackbar('VENDOR.MESSAGES.LOAD_ERROR', 'error');
        this.cdr.detectChanges(); // Crucial for UI update
        return of(null); // Keep the stream alive
      })
    );
  }

  areFiltersActive(): boolean {
    const formValues = this.filterForm.value;
    return Object.values(formValues).some(value =>
      value !== null && value !== undefined && value !== ''
    );
  }

  clearFilters(): void {
    this.filterForm.reset({
      vendorCode: '',
      name: '',
      email: '',
      phone: '',
      isActive: null
    });
    // The filterForm.valueChanges subscription will trigger reload.
  }

  addVendor(): void {
    if (this.currentAccountId === null) {
      this.showSnackbar('VENDOR.MESSAGES.ACCOUNT_ID_MISSING', 'error');
      return;
    }
    const dialogData: VendorDialogData = { accountId: this.currentAccountId };

    const dialogRef = this.dialog.open(VendorDialogComponent, {
      width: '500px',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result),
      switchMap(result => {
        this.isLoading = true;
        this.cdr.detectChanges();
        return this.vendorService.createVendor(result as VendorCreateDto).pipe(
          catchError(error => {
            console.error("Error creating vendor:", error);
            this.showSnackbar('VENDOR.MESSAGES.CREATE_ERROR', 'error');
            this.isLoading = false;
            this.cdr.detectChanges();
            return of(null);
          })
        );
      }),
      filter(createdVendor => !!createdVendor),
      switchMap(() => {
        if (this.paginator.pageIndex !== 0) { // Example: go to first page after add
          this.paginator.pageIndex = 0;
          return of(null); // Paginator event will trigger loadVendors
        }
        return this.loadVendors(); // If already on page 0, reload manually
      }),
      takeUntil(this.destroy$)
    ).subscribe((loadResult) => {
      if (loadResult !== undefined && !this.isLoading) {
        this.showSnackbar('VENDOR.MESSAGES.CREATE_SUCCESS', 'success');
      }
    });
  }

  editVendor(vendor: VendorDto): void {
    if (this.currentAccountId === null) {
      this.showSnackbar('VENDOR.MESSAGES.ACCOUNT_ID_MISSING', 'error');
      return;
    }
    const dialogData: VendorDialogData = { vendor: vendor, accountId: this.currentAccountId };

    const dialogRef = this.dialog.open(VendorDialogComponent, {
      width: '500px',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result),
      switchMap(result => {
        this.isLoading = true;
        this.cdr.detectChanges();
        return this.vendorService.updateVendor(vendor.id, result as VendorUpdateDto).pipe(
          catchError(error => {
            console.error("Error updating vendor:", error);
            this.showSnackbar('VENDOR.MESSAGES.UPDATE_ERROR', 'error');
            this.isLoading = false;
            this.cdr.detectChanges();
            return of(null);
          })
        );
      }),
      filter(updatedVendor => !!updatedVendor),
      switchMap(() => this.loadVendors()), // Reload current page data
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!this.isLoading) {
        this.showSnackbar('VENDOR.MESSAGES.UPDATE_SUCCESS', 'success');
      }
    });
  }

  deleteVendor(vendor: VendorDto): void {
    const dialogData: ConfirmationDialogData = {
      title: this.translate.instant('VENDOR.DELETE_CONFIRM.TITLE'),
      message: this.translate.instant('VENDOR.DELETE_CONFIRM.MESSAGE', { name: vendor.name, code: vendor.vendorCode }),
      confirmButtonText: this.translate.instant('COMMON.BUTTONS.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.BUTTONS.CANCEL')
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().pipe(
      filter(confirmed => !!confirmed),
      switchMap(() => {
        this.isLoading = true;
        this.cdr.detectChanges();
        return this.vendorService.deleteVendor(vendor.id).pipe(
          map(() => ({ success: true })),
          catchError(error => {
            console.error("Error deleting vendor:", error);
            this.showSnackbar('VENDOR.MESSAGES.DELETE_ERROR', 'error');
            this.isLoading = false;
            this.cdr.detectChanges();
            return of({ success: false });
          })
        );
      }),
      filter(result => result.success),
      switchMap(() => {
        const estimatedNewTotalElements = this.totalElements > 0 ? this.totalElements - 1 : 0;
        const pageSize = this.paginator.pageSize;
        const currentPageIndex = this.paginator.pageIndex;
        let newPageIndex = currentPageIndex;

        if (this.dataSource.length === 1 && currentPageIndex > 0 && estimatedNewTotalElements > 0) {
          newPageIndex = currentPageIndex - 1;
        } else if (estimatedNewTotalElements === 0) {
          newPageIndex = 0;
        } else {
            const maxPageIndex = Math.max(0, Math.ceil(estimatedNewTotalElements / pageSize) - 1);
            if (currentPageIndex > maxPageIndex) {
                newPageIndex = maxPageIndex;
            }
        }

        if (this.paginator.pageIndex !== newPageIndex) {
          this.paginator.pageIndex = newPageIndex;
          return of(null); // Paginator event will trigger loadVendors
        }
        return this.loadVendors(); // If page index doesn't change, reload manually
      }),
      takeUntil(this.destroy$)
    ).subscribe((loadResult) => {
      if (loadResult !== undefined && !this.isLoading) {
        this.showSnackbar('VENDOR.MESSAGES.DELETE_SUCCESS', 'success');
      }
    });
  }

  private showSnackbar(messageKey: string, panelClass: 'success' | 'error'): void {
    this.translate.get(messageKey).subscribe((message: string) => {
      this.snackBar.open(message, this.translate.instant('COMMON.CLOSE'), {
        duration: 3000,
        panelClass: [`snackbar-${panelClass}`]
      });
    });
  }

  private logPaginatorState(): void {
    if (this.paginator) {
      Promise.resolve().then(() => { // Ensure this logs after CD
        console.log(
          `Vendor Paginator State: Length=${this.paginator.length}, PageIndex=${this.paginator.pageIndex}, PageSize=${this.paginator.pageSize}, HasPrevious=${this.paginator.hasPreviousPage()}, HasNext=${this.paginator.hasNextPage()}`
        );
      });
    }
  }

}
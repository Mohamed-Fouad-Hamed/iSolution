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

import { CustomerService } from '../../../core/services/CustomerService';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerDto, CustomerCreateDto, CustomerUpdateDto, CustomerFilterParams, Page } from '../../../models/customer.model';
import { CustomerDialogComponent, CustomerDialogData } from '../customer-dialog/customer-dialog.component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component'; // Adjust path
import { MatToolbarModule } from '@angular/material/toolbar';
import { CustomPaginatorIntl } from '../../../shared/paginator/custom-paginator-intl';


@Component({
  selector: 'app-customer-list',
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
    // CustomerDialogComponent, // No need if opened via MatDialog service
    // ConfirmationDialogComponent // No need if opened via MatDialog service
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }
  ],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['customerCode', 'name', 'email', 'phone', 'isActive', 'actions'];
  // --- MODIFICATION: Use CustomerDto[] directly ---
  dataSource: CustomerDto[] = [];
  // --- END MODIFICATION ---
  totalElements = 0;
  isLoading = true;
  currentAccountId: number | null = null;
  filterForm: FormGroup;

  private destroy$ = new Subject<void>();
  // private filterSubscription: Subscription | null = null; // This can be removed if all subscriptions use takeUntil(this.destroy$)

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  statusFilterOptions = [
    { value: null, viewValueKey: 'CUSTOMER.FILTER.STATUS_ALL' },
    { value: true, viewValueKey: 'CUSTOMER.FILTER.STATUS_ACTIVE' },
    { value: false, viewValueKey: 'CUSTOMER.FILTER.STATUS_INACTIVE' }
  ];

  isFilterPanelExpanded = false;

  constructor(
    private customerService: CustomerService,
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
      customerCode: [''],
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
      console.warn('Paginator or Sort not yet initialized in ngAfterViewInit. Attempting deferred initialization.');
      // Defer initialization to ensure ViewChild references are set
      Promise.resolve().then(() => this.initializeDataLoadingStream());
      return;
    }
    this.initializeDataLoadingStream();
  }

  private initializeDataLoadingStream(): void {
    if (!this.paginator || !this.sort) {
      console.error('Paginator or Sort STILL not initialized. Data loading cannot proceed.');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // --- MODIFICATION: Remove MatTableDataSource specific connections ---
    // this.dataSource.paginator = this.paginator; // No longer needed
    // this.dataSource.sort = this.sort;          // No longer needed
    // --- END MODIFICATION ---

    // Reset paginator when sort or filter changes
    merge(
      this.sort.sortChange.pipe(tap(() => console.log('Sort changed'))),
      this.filterForm.valueChanges.pipe(debounceTime(400), distinctUntilChanged(), tap(() => console.log('Filter changed')))
    ).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.paginator && this.paginator.pageIndex !== 0) {
        console.log('Resetting paginator to page 0 due to sort/filter change.');
        this.paginator.pageIndex = 0; // This will trigger the paginator.page event
      }
      // If already on page 0, the main merge stream below will still pick up the sort/filter change.
    });

    // Merge all changes together: sort, page, and filter
    merge(
      this.sort.sortChange,
      this.paginator.page,
      this.filterForm.valueChanges.pipe(debounceTime(400), distinctUntilChanged())
    )
      .pipe(
        startWith({}), // Trigger initial load
        tap(event => console.log('Data loading stream triggered by:', event || 'initial load')),
        switchMap(() => this.loadCustomers()),
        catchError(err => {
          console.error("Error in customer loading stream:", err);
          this.isLoading = false;
          // --- MODIFICATION: Use array directly ---
          this.dataSource = [];
          // --- END MODIFICATION ---
          this.totalElements = 0;
          console.log('failure .... View Init stream catchError');
          this.cdr.detectChanges();
          this.showSnackbar('CUSTOMER.MESSAGES.LOAD_ERROR', 'error');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(pageData => {
        // Data assignment and UI updates are handled within loadCustomers
        if (pageData) {
          console.log('Data stream: Load successful. Total:', this.totalElements, 'Current page items:', this.dataSource.length);
        } else {
          console.log('Data stream: Load returned null (likely handled error). Total:', this.totalElements, 'Current items:', this.dataSource.length);
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

  loadCustomers(): Observable<Page<CustomerDto> | null> {
    if (!this.paginator) { // Ensure paginator is available
        console.error("loadCustomers: Paginator not initialized!");
        this.isLoading = false;
        // Potentially set dataSource = [] and totalElements = 0 here and cdr.detectChanges()
        return of(null);
    }
    if (this.currentAccountId === null) {
      console.error("Account ID not available for loadCustomers call.");
      this.isLoading = false;
      // --- MODIFICATION: Use array directly ---
      this.dataSource = [];
      // --- END MODIFICATION ---
      this.totalElements = 0;
      this.cdr.detectChanges();
      console.log('failure .... load customer (no accountId)');
      return of(null);
    }

    this.isLoading = true;
    // No need for cdr.detectChanges() here, as it's called after data is fetched.

    const pageIndex = this.paginator.pageIndex;
    const pageSize = this.paginator.pageSize;
    const activeSortField = this.sort?.active || 'name'; // Default if sort is not yet active
    const currentSortDirection = this.sort?.direction || 'asc'; // Default if sort is not yet active

    const filters: CustomerFilterParams = this.filterForm.value;
    const preparedFilters: CustomerFilterParams = {
      ...filters,
      isActive: filters.isActive === null ? undefined : filters.isActive
    };
    console.log(`loadCustomers: Fetching page ${pageIndex}, size ${pageSize}, sort ${activeSortField} ${currentSortDirection}`);

    return this.customerService.getAllCustomers(
      this.currentAccountId,
      pageIndex,
      pageSize,
      activeSortField,
      currentSortDirection, // Send effectiveSortDirection
      preparedFilters
    ).pipe(
      map(page => {
        this.isLoading = false;
        if (page && page.content) {
          this.totalElements = page.totalElements;
          // --- MODIFICATION: Use array directly ---
          this.dataSource = page.content;
          // --- END MODIFICATION ---
          console.log(`Success: Loaded ${this.dataSource.length} customers. Total elements: ${this.totalElements}.`);
        } else {
          console.warn('loadCustomers: Received no page or no content. Resetting.');
          this.totalElements = 0;
          this.dataSource = [];
        }
        this.cdr.detectChanges(); // Crucial for UI update
        return page;
      }),
      catchError(error => {
        console.error("Error loading customers:", error);
        this.isLoading = false;
        this.totalElements = 0;
        // --- MODIFICATION: Use array directly ---
        this.dataSource = [];
        // --- END MODIFICATION ---
        this.showSnackbar('CUSTOMER.MESSAGES.LOAD_ERROR', 'error');
        this.cdr.detectChanges(); // Crucial for UI update
        return of(null); // Keep the stream alive
      })
      // takeUntil is handled by the calling stream
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
      customerCode: '',
      name: '',
      email: '',
      phone: '',
      isActive: null
    });
    // The filterForm.valueChanges subscription in ngAfterViewInit will trigger a reload.
    // If the paginator is not on page 0, it will be reset to 0.
  }

  // --- CRUD Operations (addCustomer, editCustomer, deleteCustomer) ---
  // These methods should largely remain the same.
  // The key is that after a successful operation, they call `this.loadCustomers()`
  // or trigger a paginator change that results in `loadCustomers()` being called.
  // Since `loadCustomers()` now updates `this.dataSource` (the array) directly,
  // the table will refresh with the new page of data.

  addCustomer(): void {
    if (this.currentAccountId === null) {
      this.showSnackbar('CUSTOMER.MESSAGES.ACCOUNT_ID_MISSING', 'error');
      return;
    }
    const dialogData: CustomerDialogData = { accountId: this.currentAccountId };

    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '500px',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result),
      switchMap(result => {
        this.isLoading = true;
        this.cdr.detectChanges();
        return this.customerService.createCustomer(result as CustomerCreateDto).pipe(
          catchError(error => {
            console.error("Error creating customer:", error);
            this.showSnackbar('CUSTOMER.MESSAGES.CREATE_ERROR', 'error');
            this.isLoading = false;
            this.cdr.detectChanges();
            return of(null);
          })
        );
      }),
      filter(createdCustomer => !!createdCustomer),
      switchMap(() => {
        // After adding, you might want to go to the first page or last page
        // For simplicity, let's reload and potentially go to the first page
        if (this.paginator.pageIndex !== 0) {
          this.paginator.pageIndex = 0; // This will trigger loadCustomers via the main stream
          return of(null); // loadCustomers will be called by paginator event
        }
        return this.loadCustomers(); // If already on page 0, reload manually
      }),
      takeUntil(this.destroy$)
    ).subscribe((loadResult) => {
      // isLoading is managed by loadCustomers
      if (loadResult !== undefined && !this.isLoading) { // Check if stream emitted (even if null from paginator change)
        this.showSnackbar('CUSTOMER.MESSAGES.CREATE_SUCCESS', 'success');
      }
    });
  }

  editCustomer(customer: CustomerDto): void {
    if (this.currentAccountId === null) {
      this.showSnackbar('CUSTOMER.MESSAGES.ACCOUNT_ID_MISSING', 'error');
      return;
    }
    const dialogData: CustomerDialogData = { customer: customer, accountId: this.currentAccountId };

    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '500px',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().pipe(
      filter(result => !!result),
      switchMap(result => {
        this.isLoading = true;
        this.cdr.detectChanges();
        return this.customerService.updateCustomer(customer.id, result as CustomerUpdateDto).pipe(
          catchError(error => {
            console.error("Error updating customer:", error);
            this.showSnackbar('CUSTOMER.MESSAGES.UPDATE_ERROR', 'error');
            this.isLoading = false;
            this.cdr.detectChanges();
            return of(null);
          })
        );
      }),
      filter(updatedCustomer => !!updatedCustomer),
      switchMap(() => this.loadCustomers()), // Reload current page data
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!this.isLoading) {
        this.showSnackbar('CUSTOMER.MESSAGES.UPDATE_SUCCESS', 'success');
      }
    });
  }

  deleteCustomer(customer: CustomerDto): void {
    const dialogData: ConfirmationDialogData = {
      title: this.translate.instant('CUSTOMER.DELETE_CONFIRM.TITLE'),
      message: this.translate.instant('CUSTOMER.DELETE_CONFIRM.MESSAGE', { name: customer.name, code: customer.customerCode }),
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
        return this.customerService.deleteCustomer(customer.id).pipe(
          map(() => ({ success: true })),
          catchError(error => {
            console.error("Error deleting customer:", error);
            this.showSnackbar('CUSTOMER.MESSAGES.DELETE_ERROR', 'error');
            this.isLoading = false;
            this.cdr.detectChanges();
            return of({ success: false });
          })
        );
      }),
      filter(result => result.success),
      switchMap(() => {
        // Estimate new total for page adjustment logic
        const estimatedNewTotalElements = this.totalElements > 0 ? this.totalElements - 1 : 0;
        const pageSize = this.paginator.pageSize;
        const currentPageIndex = this.paginator.pageIndex;
        let newPageIndex = currentPageIndex;

        // If the deleted item was the last one on the current page (and not page 0)
        if (this.dataSource.length === 1 && currentPageIndex > 0 && estimatedNewTotalElements > 0) {
          newPageIndex = currentPageIndex - 1;
        } else if (estimatedNewTotalElements === 0) {
          newPageIndex = 0;
        } else { // check if current page is now out of bounds
            const maxPageIndex = Math.max(0, Math.ceil(estimatedNewTotalElements / pageSize) - 1);
            if (currentPageIndex > maxPageIndex) {
                newPageIndex = maxPageIndex;
            }
        }

        if (this.paginator.pageIndex !== newPageIndex) {
          this.paginator.pageIndex = newPageIndex; // This will trigger loadCustomers
          return of(null); // loadCustomers will be called by paginator event
        }
        return this.loadCustomers(); // If page index doesn't change, reload manually
      }),
      takeUntil(this.destroy$)
    ).subscribe((loadResult) => {
       if (loadResult !== undefined && !this.isLoading) {
        this.showSnackbar('CUSTOMER.MESSAGES.DELETE_SUCCESS', 'success');
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
      // Use a promise to ensure this logs after potential CD cycle from loadCustomers
      Promise.resolve().then(() => {
        console.log(
          `PAGINATOR STATE: Length=${this.paginator.length}, PageIndex=${this.paginator.pageIndex}, PageSize=${this.paginator.pageSize}, HasPrevious=${this.paginator.hasPreviousPage()}, HasNext=${this.paginator.hasNextPage()}`
        );
      });
    }
  }
}
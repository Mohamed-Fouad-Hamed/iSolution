import { Component, Input, forwardRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, debounceTime, filter, tap, finalize, startWith } from 'rxjs/operators';
import { GenericApiService } from '../../../core/services/generic-api-service'; // Adjusted path
import { SearchDialogComponent } from './search-dialog/search-dialog.component'; // Adjusted path
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import {  MatInputModule } from '@angular/material/input';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-custom-search-select',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,MatOptionModule,MatDividerModule,TranslateModule
    ,MatProgressSpinnerModule,MatAutocompleteModule,MatIconModule
    ,FormsModule,ReactiveFormsModule,MatInputModule
  ],
  templateUrl: './custom-search-select.component.html',
  styleUrl: './custom-search-select.component.scss',
    providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSearchSelectComponent),
      multi: true
    }
  ]
})
export class CustomSearchSelectComponent  implements OnInit, ControlValueAccessor {
  // --- Configuration Inputs ---
  @Input() label!: string ;
  @Input() apiService!: GenericApiService;
  @Input() apiEndpoints!: { search: string; add: string; getById: string; all: string; };
  @Input() valueField: string = 'id';
  @Input() displayField: string = 'name';
  @Input() searchDialogTitle: string = 'Search';
  @Input() columns: { key: string; header: string }[] = [{ key: 'name', header: 'Name' }];


   searchControl = new FormControl();
  
  // --- Change Start: Use a BehaviorSubject to manage options ---
  private options$ = new BehaviorSubject<any[]>([]);
  filteredOptions$: Observable<any[]> = this.options$.asObservable();
  // --- Change End ---

  isLoading = false;
  canAddNew = false;
  lastSearchQuery: string = ''; // To reliably store the last typed string

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private dialog: MatDialog, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (!this.apiService || !this.apiEndpoints) {
      throw new Error('apiService and apiEndpoints are required inputs.');
    }

    // --- Change Start: Refactor observable pipeline to update the BehaviorSubject ---
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      // We start with an empty string to trigger initial state if needed
      startWith(''), 
      // Filter so we only process string inputs from the user typing
      filter(value => typeof value === 'string'), 
      tap(query => {
        this.isLoading = true;
        this.canAddNew = false;
        this.lastSearchQuery = query; // Store the last search query
      }),
      switchMap(query => {
        if (!query) {
          // If the query is empty, return an empty array and stop loading
          return of<any[]>([]).pipe(finalize(() => this.isLoading = false));
        }
        // Perform the search API call
        return this.apiService.search(this.apiEndpoints.search, query).pipe(
          tap(results => {
            // Check if the user can add the new item based on search results
            this.canAddNew = results.length === 0 && !!query;
          }),
          finalize(() => this.isLoading = false)
        );
      })
    ).subscribe(results => {
      // Update the options BehaviorSubject with the results from the API
      this.options$.next(results); 
    });
    // --- Change End ---
  }

  // --- ControlValueAccessor Implementation ---
  writeValue(id: any): void {
    if (id) {
      this.isLoading = true;
      this.apiService.getById(this.apiEndpoints.getById, id).subscribe(item => {
        if (item) {
          // --- Change Start: Add the initial item to our options list ---
          this.options$.next([item]);
          // Set the value in the control. `displayWith` will handle showing the correct property.
          this.searchControl.setValue(item, { emitEvent: false }); 
          // --- Change End ---
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    } else {
      this.searchControl.setValue(null, { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  displayWith(option: any): string {
    // This function remains the same, it correctly displays the object in the input
    return option ? option[this.displayField] : '';
  }

  onOptionSelected(option: any): void {
    this.onChange(option ? option[this.valueField] : null);
    this.onTouched();
  }
  
  addNewItem(): void {
      const itemValue = this.lastSearchQuery; // Use the stored query to avoid race conditions
    if (!itemValue) return; // Prevent adding empty items

    const newItemPayload = { [this.displayField]: itemValue };
    this.isLoading = true;

    this.apiService.add(this.apiEndpoints.add, newItemPayload).subscribe(newItem => {
      // The newItem returned from the API should have the id and name
      this.isLoading = false;
      this.canAddNew = false;

      // Add the newly created item to our options list so it appears in the dropdown
      const currentOptions = this.options$.getValue();
      this.options$.next([...currentOptions, newItem]);

      // *** This is the key part: set the form control's value to the new object ***
      // This will make it appear as the selected item in the input field.
      this.searchControl.setValue(newItem);
      
      // Trigger the change for the parent form
      this.onOptionSelected(newItem);
    });
  }

  openSearchMoreDialog(): void {
    const dialogRef = this.dialog.open(SearchDialogComponent, {
      width: '800px',
      data: {
        title: this.searchDialogTitle,
        columns: this.columns,
        apiService: this.apiService,
        apiEndpoint: this.apiEndpoints.all,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.searchControl.setValue(result);
        this.onOptionSelected(result);
      }
    });
  }
}

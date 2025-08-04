import {
  Component,
  Input,
  ViewChild,
  OnInit,
  forwardRef,
  OnDestroy,
  ElementRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  BehaviorSubject,
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  map,
  takeUntil,
} from 'rxjs';

@Component({
  selector: 'app-multi-select',
  standalone: true,

  imports: [CommonModule,ReactiveFormsModule,MatAutocompleteModule,MatFormFieldModule,MatChipsModule,MatInputModule,MatIconModule,MatCheckboxModule ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectComponent),
      multi: true,
    },
  ],
  templateUrl: './multi-select.component.html',
  styleUrls: ['./multi-select.component.scss'],
})
export class MultiSelectComponent implements ControlValueAccessor, OnInit, OnDestroy {
  // --- Component Inputs & Outputs ---
  @Input() label: string = 'Items';
  @Input() placeholder: string = 'Search and select...';
  @Input() optionsValueField: string = 'value';
  @Input() optionsDisplayField: string = 'display';

  // The parent component will now handle filtering and pass the result here
  private _options$ = new BehaviorSubject<any[]>([]);
  @Input()
  set options(value: any[]) {
    this._options$.next(value || []);
  }

  // --- NEW: Output to delegate search logic to the parent ---
  @Output() searchChanged = new EventEmitter<string>();

  // --- Template References ---
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  // --- NEW: Get a reference to the autocomplete trigger to update its position ---
  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger!: MatAutocompleteTrigger;

  // --- State Management ---
  public searchControl = new FormControl('');
  public sortedOptions$!: Observable<any[]>; // Renamed from filteredOptions$
  private _destroy$ = new Subject<void>();

  // --- ControlValueAccessor Implementation ---
  value: any[] = [];
  isDisabled = false;
  onChange = (value: any[]) => {};
  onTouched = () => {};

  ngOnInit(): void {
    // 1. Listen to search input and emit event to parent
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300), // Wait for user to stop typing
        distinctUntilChanged(), // Don't emit if the value hasn't changed
        takeUntil(this._destroy$)
      )
      .subscribe((searchTerm) => {
        this.searchChanged.emit(searchTerm || '');
      });

    // 2. The options are now assumed to be pre-filtered by the parent.
    //    This stream just sorts them to show selected items first.
    this.sortedOptions$ = this._options$.pipe(
      map((options) => this._sortOptions(options))
    );
  }

  private _sortOptions(options: any[]): any[] {
    // Sort the list to show selected items first
    return [...options].sort((a, b) => {
      const isASelected = this.isSelected(a);
      const isBSelected = this.isSelected(b);
      if (isASelected && !isBSelected) return -1;
      if (!isASelected && isBSelected) return 1;
      return 0;
    });
  }

  // ... ControlValueAccessor methods (writeValue, etc.) are unchanged ...
  writeValue(value: any[]): void { this.value = value || []; }
  registerOnChange(fn: (value: any[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    isDisabled ? this.searchControl.disable() : this.searchControl.enable();
  }


  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    
    const selectedItem = event.option.value;
    this.toggleSelection(selectedItem);
    
    // 2. Clear the search input to prepare for the next search.
    this.searchInput.nativeElement.value = '';
    this.searchControl.setValue('');

    // 3. Keep the panel open for further selections.
    this._keepPanelOpen();
  }

   private _keepPanelOpen(): void {
    setTimeout(() => {
      if (this.autocompleteTrigger) {
        this.autocompleteTrigger.openPanel();
      }
    });
  }

  remove(item: any): void {
    const itemValue = item[this.optionsValueField];
    this.value = this.value.filter(
      (selected) => selected[this.optionsValueField] !== itemValue
    );
    this.onChange(this.value);
    this.onTouched();
    this.updatePanelPosition();
  }

  private toggleSelection(item: any): void {
    if (this.isSelected(item)) {
      this.remove(item);
    } else {
      this.value = [...this.value, item];
      this.onChange(this.value);
      this.onTouched();
    }

    this.searchInput.nativeElement.value = '';
    this.searchControl.setValue(''); // Keep search emitter quiet
    
    this.updatePanelPosition();
  }

  // --- NEW: Method to update the autocomplete panel's position ---
  private updatePanelPosition(): void {
    // We need to wait for the DOM to update (chip added/removed) before recalculating
    // The position. setTimeout with 0ms delay defers this to the next render cycle.
    setTimeout(() => {
      if (this.autocompleteTrigger?.panelOpen) {
        this.autocompleteTrigger.updatePosition();
      }
    });
  }
  
  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }
  
  /** Checks if an option is currently selected */
  isSelected(option: any): boolean {
    const optionValue = option[this.optionsValueField];
    return this.value.some(
      (selected) => selected[this.optionsValueField] === optionValue
    );
  }

  /** trackBy function for ngFor loops to improve performance */
  trackByFn(index: number, item: any): any {
    return item[this.optionsValueField];
  }
}
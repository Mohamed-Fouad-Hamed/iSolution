// src/app/features/company/company-dialog/company-dialog.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';

// Import required Angular Material modules directly
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar'; // New
import { MatMenuModule } from '@angular/material/menu'; 
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

// NGX Mat Select Search
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

import { Company, Currency, State, Country , AccountType , Color } from '../../../models/company';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, delay, map, Observable, of, ReplaySubject, startWith, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-company-form',
  standalone: true, // Set the component as standalone
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    MatTabsModule ,
    MatToolbarModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
       // 3rd Party
    NgxMatSelectSearchModule,
  ],
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss'],
})
export class CompanyFormComponent implements OnInit {
  
  @Input() company: Company | null = null;
 companyForm: FormGroup;
  private destroyer$ = new Subject<void>();

  // --- Data & Loading States ---
  isLoading = {
    accountTypes: false, countries: false, states: false, currencies: false, colors: false
  };

  // --- Original Data Source (Simulating API response) ---
 private dataMap: Record<string, any[]> = {
  countries: [],
  states: [],
  currencies: [],
  colors: [],
  accountTypes: [],
};
  // --- Search FormControls ---
  accountTypeSearchCtrl = new FormControl('');
  countrySearchCtrl = new FormControl('');
  stateSearchCtrl = new FormControl('');
  currencySearchCtrl = new FormControl('');
  colorSearchCtrl = new FormControl('');

  private searchControlsMap: Record<string, FormControl> = {
  countries: this.countrySearchCtrl,
  states: this.stateSearchCtrl,
  currencies: this.currencySearchCtrl,
  colors: this.colorSearchCtrl,
  accountTypes: this.accountTypeSearchCtrl,
};

  // --- Filtered Data Observables ---
  filteredAccountTypes$?: Observable<AccountType[]>;
  filteredCountries$?: Observable<Country[]>;
  filteredStates$?: Observable<State[]>;
  filteredCurrencies$?: Observable<Currency[]>;
  filteredColors$?: Observable<Color[]>;
  protected _onDestroy = new Subject<void>();

  constructor(private fb: FormBuilder) {
    this.companyForm = this.fb.group({
      accountName: ['My Company', Validators.required],
      branchName: ['Chicago'],
      accountLogo: ['/assets/logo-placeholder.png'],
      accountTypeId: [null, Validators.required],
      street1: ['90 Streets Avenue', Validators.required],
      street2: ['Street 2...'],
      city: ['Chicago', Validators.required],
      zipCode: ['60610', Validators.required],
      stateId: [1, Validators.required],
      countryId: [1, Validators.required],
      taxIdentificationNumber: [''],
      commercialRegistry: [''],
      currencyId: [1, Validators.required],
      phone: ['+1 312 349 3030', Validators.required],
      email: ['chicago@yourcompany.com', [Validators.required, Validators.email]],
      website: ['http://www.example.com'],
      emailDomain: ['yourcompany.com'],
      color: ['#f5d6bA', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.company) {
      this.companyForm.patchValue(this.company);
    }
    // Initialize filtering logic
    this.filteredAccountTypes$ = this.setupFilter(this.accountTypeSearchCtrl, () => this.dataMap['accountTypes'], 'name');
    this.filteredCountries$ = this.setupFilter(this.countrySearchCtrl, () => this.dataMap['countries'], 'name');
    this.filteredStates$ = this.setupFilter(this.stateSearchCtrl, () => this.dataMap['states'], 'name');
    this.filteredCurrencies$ = this.setupFilter(this.currencySearchCtrl, () => this.dataMap['currencies'], 'name');
    this.filteredColors$ = this.setupFilter(this.colorSearchCtrl, () => this.dataMap['colors'], 'name');
  }
  
 onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        this.companyForm.patchValue({ accountLogo: reader.result as string });
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  triggerFileInput(): void {
    document.getElementById('logo-input')?.click();
  }
  // --- Generic Filtering Setup ---
  private setupFilter<T>(searchCtrl: FormControl, dataProvider: () => T[], filterKey: keyof T): Observable<T[]> {
    return searchCtrl.valueChanges.pipe(
      startWith(''),
      map(filterValue => this._filter(dataProvider(), filterValue || '', filterKey)),
      takeUntil(this.destroyer$)
    );
  }

  private _filter<T>(data: T[], value: string, key: keyof T): T[] {
    const filterValue = value.toLowerCase();
    return data.filter(item => (item[key] as string).toLowerCase().includes(filterValue));
  }

  // --- Data Loading Simulation ---
  loadData(
  type: keyof typeof this.isLoading,
  dataProvider: () => Observable<any[]>,
  target: keyof typeof this.dataMap
) {
  if (this.dataMap[target].length > 0) return;

  this.isLoading[type] = true;
  dataProvider()
    .pipe(delay(1000), takeUntil(this.destroyer$))
    .subscribe(data => {
      this.dataMap[target] = data;

      this.searchControlsMap[target]?.setValue(''); // clear search box

      this.isLoading[type] = false;
    });
}

  // --- Event Handlers for Selects ---
  onAccountTypesOpened(isOpen: boolean) { if (isOpen) this.loadData('accountTypes', this.getMockAccountTypes, 'accountTypes'); }
  onCountriesOpened(isOpen: boolean) { if (isOpen) this.loadData('countries', this.getMockCountries, 'countries'); }
  onStatesOpened(isOpen: boolean) { if (isOpen) this.loadData('states', this.getMockStates, 'states'); }
  onCurrenciesOpened(isOpen: boolean) { if (isOpen) this.loadData('currencies', this.getMockCurrencies, 'currencies'); }
  onColorsOpened(isOpen: boolean) { if (isOpen) this.loadData('colors', this.getMockColors, 'colors'); }
  
  // --- Toolbar Actions ---
  onNew(): void { this.companyForm.reset(); console.log('New form requested'); }
  onSave(): void { if (this.companyForm.valid) { console.log('Form Saved!', this.companyForm.getRawValue()); } }
  onDiscard(): void { this.companyForm.reset(); console.log('Changes Discarded'); }

  get selectedColorObject(): Color | undefined {
    const selectedHex = this.companyForm.get('color')?.value;
    if (!selectedHex) { return undefined; }
    return this.dataMap['colors'].find(c => c.hex === selectedHex);
  }
  
  // --- MOCK API CALLS ---
  private getMockAccountTypes = () => of([{ id: 1, name: 'Vendor' }, { id: 2, name: 'Customer' }]);
  private getMockCountries = () => of([{ id: 1, name: 'United States' }, { id: 2, name: 'Canada' }]);
  private getMockStates = () => of([{ id: 1, name: 'Illinois (US)', countryId: 1 }, { id: 2, name: 'California (US)', countryId: 1 }]);
  private getMockCurrencies = () => of([{ id: 1, name: 'USD' }, { id: 2, name: 'CAD' }]);
  private getMockColors = () => of([{ name: 'Peach', hex: '#f5d6bA' }, { name: 'Sky Blue', hex: '#87CEEB' }]);


}
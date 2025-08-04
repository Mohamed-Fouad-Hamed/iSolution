import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { MultiSelectComponent } from '../../shared/components/ui/multi-select/multi-select.component';
import {  FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardContent, MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../environments/environment';
import { GenericApiService } from '../../core/services/generic-api-service';
import { CustomSearchSelectComponent } from '../../components/utilities/custom-search-select/custom-search-select.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [  CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MultiSelectComponent, // <-- Your component
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    CustomSearchSelectComponent,
    TranslateModule,
    JsonPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent  implements OnInit {


  private apiUrl = `${environment.apiUrl}/api/v1/countries`;

  apiService = inject( GenericApiService);

  selectedValue : any = null;

  apiEndpoints = { search: `${this.apiUrl}/search`, add: `${this.apiUrl}/add-shorthand` , getById: `${this.apiUrl}`, all: `${this.apiUrl}/paged` };



  title = 'Advanced Multi-Select Component Demo';

  // --- MASTER data source ---

  allUsers = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com' },
    { id: 2, name: 'Bob Johnson', email: 'bob@example.com' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
    { id: 4, name: 'Diana Prince', email: 'diana@example.com' },
    { id: 5, name: 'Ethan Hunt', email: 'ethan@example.com' },
    { id: 6, name: 'Fiona Glenanne', email: 'fiona@example.com' },
  ];

  // --- NEW: Properties to hold the filtered lists for each component instance ---
  filteredUsersForReactive: any[] = [];
  filteredUsersForTemplate: any[] = [];

  reactiveForm: FormGroup;
  templateDrivenSelection = [this.allUsers[3]];

  constructor(private fb: FormBuilder ) {
    this.reactiveForm = this.fb.group({
      selectedUsers: [[this.allUsers[0], this.allUsers[2]]],
    });
  }

  ngOnInit(): void {
    // Initialize the lists with all users on load
    this.handleReactiveSearch('');
    this.handleTemplateSearch('');
  }

  // --- NEW: Search handler for the reactive form instance ---
  handleReactiveSearch(searchTerm: string): void {
    console.log(`Parent received search term for reactive form: "${searchTerm}"`);
    if (!searchTerm) {
      this.filteredUsersForReactive = [...this.allUsers];
      return;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    this.filteredUsersForReactive = this.allUsers.filter(user =>
      user.name.toLowerCase().includes(lowerCaseSearch)
    );
  }
  
  // --- NEW: Search handler for the template-driven form instance ---
  handleTemplateSearch(searchTerm: string): void {
    console.log(`Parent received search term for template form: "${searchTerm}"`);
    if (!searchTerm) {
      this.filteredUsersForTemplate = [...this.allUsers];
      return;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    this.filteredUsersForTemplate = this.allUsers.filter(user =>
      user.name.toLowerCase().includes(lowerCaseSearch)
    );
  }


  // --- Methods for the Reactive Form Example ---
  submitReactiveForm(): void {
    console.log('Reactive Form Submitted:', this.reactiveForm.value);
    alert('Check the console for the reactive form value!');
  }

  toggleDisable(): void {
    const userControl = this.reactiveForm.get('selectedUsers');
    if (userControl) {
      userControl.disabled ? userControl.enable() : userControl.disable();
    }
  }

  resetReactiveForm(): void {
    // Reset to a new set of initial values
    this.reactiveForm.reset({
        selectedUsers: [this.allUsers[4]] // Just Ethan
    });
  }







}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GenericApiService {

  constructor(private http: HttpClient) { }

  /**
   * Searches for items based on a query string.
   * @param url The API endpoint for searching.
   * @param query The search term.
   * @returns An Observable array of items.
   */
  search(url: string, query: string): Observable<any[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<any[]>(url, { params });
  }

  /**
   * Gets a single item by its ID.
   * @param url The base API endpoint for the resource.
   * @param id The ID of the item to fetch.
   * @returns An Observable of the item.
   */
  getById(url: string, id: any): Observable<any> {
    return this.http.get<any>(`${url}/${id}`);
  }

  /**
   * Fetches paginated data for the search dialog.
   * @param url The API endpoint for paginated results.
   * @param query The search term.
   * @param page The current page index.
   * @param pageSize The number of items per page.
   * @returns An Observable containing the items and total count.
   */
  getPaged(url: string, query: string, page: number, pageSize: number): Observable<{ list: any[], count: number }> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('limit', pageSize.toString());
    return this.http.get<{ list: any[], count: number }>(url, { params });
  }

  /**
   * Adds a new item.
   * @param url The API endpoint for creating an item.
   * @param item The new item data.
   * @returns An Observable of the newly created item.
   */
  add(url: string, item: any): Observable<any> {
    return this.http.post<any>(url, item);
  }
}

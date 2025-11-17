import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiResponse, DropdownItem } from '../interfaces/dropdown-data.interface';

@Injectable({
  providedIn: 'root'
})
export class DropdownService {
  // Mock data
  private mockData: DropdownItem[] = [
    { id: 1, name: 'Repo 1' },
    { id: 2, name: 'Repo 2' },
    { id: 3, name: 'Repo 3' },
    { id: 4, name: 'Repo 4' },
    { id: 5, name: 'Repo 5' }
  ];

  getDropdownData(): Observable<ApiResponse> {
    const response: ApiResponse = {
      data: this.mockData
    };
    
    return of(response);
  }
}
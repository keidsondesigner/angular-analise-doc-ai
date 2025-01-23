import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface AnalyzeResponse {
  data: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiUrl = 'http://localhost:3000/receipt';

  constructor(private http: HttpClient) {}

  analyzeReceipt(file: File): Observable<string> {
    if (!file.type.startsWith('image/')) {
      return throwError(() => new Error('Por favor, envie apenas arquivos de imagem'));
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<AnalyzeResponse>(`${this.apiUrl}/analyze`, formData).pipe(
      map(response => response.data),
      catchError((error: any) => {
        console.error('Erro ao analisar o comprovante:', error);
        return throwError(() => new Error(error.message || 'Falha ao processar o comprovante'));
      })
    );
  }
}
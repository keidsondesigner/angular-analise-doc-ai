import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Observable, from } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI('AIzaSyBotfTLtz6QDtbEbJVHfkKkMMp7IcWSeEQ');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  analyzeReceipt(file: File): Observable<string> {
    if (!file.type.startsWith('image/')) {
      return new Observable<string>(observer => {
        observer.error(new Error('Por favor, envie apenas arquivos de imagem'));
      });
    }

    return from(this.processReceipt(file)).pipe(
      catchError((error: Error) => {
        console.error('Erro no serviço Gemini:', error);
        throw new Error(error.message || 'Falha ao processar o comprovante');
      })
    );
  }

  private async processReceipt(file: File): Promise<string> {
    try {
      const imageData = await this.fileToGenerativePart(file);
      const prompt = `Analise este cupom fiscal e extraia as seguintes informações em formato markdown:

- Data e Hora
- Valor Total
- Forma de Pagamento
- Estabelecimento
- Número do Cupom/SAT
- Itens comprados (se visível)
- Impostos (se informado)

Por favor, organize as informações em um documento markdown limpo e bem formatado em português.`;

      const result = await this.model.generateContent([prompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in processReceipt:', error);
      throw error;
    }
  }

  private async fileToGenerativePart(file: File) {
    const base64EncodedImage = await this.fileToBase64(file);
    return {
      inlineData: {
        data: base64EncodedImage,
        mimeType: file.type
      }
    };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  }
}
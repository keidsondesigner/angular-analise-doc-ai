import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';
import { DomSanitizer, SafeHtml, SafeUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { Marked } from 'marked';
import { markedHighlight } from "marked-highlight";

@Component({
  selector: 'app-receipt-analyzer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-[#fffdf9] to-[#f8f5f0] py-12 px-4">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <div class="inline-flex items-center justify-center gap-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14 2.5V6a2 2 0 002 2h3.5" />
            </svg>
            <h1 class="text-4xl font-bold text-zinc-800">Ai CupomScan</h1>
          </div>
          <p class="text-zinc-600">Transforme seus cupons fiscais em texto de forma rápida e fácil</p>
        </div>
        
        <div class="flex gap-8 bg-white rounded-xl border border-zinc-100 p-8 shadow-sm">  
          <div class="flex-1">
            <div
              class="relative group rounded-lg overflow-hidden bg-gradient-to-b from-zinc-50 to-white p-8 transition-all duration-300"
              [class.shadow-md]="isDragging"
              [class.from-zinc-100]="isDragging"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
            >
              <input
                type="file"
                #fileInput
                (change)="onFileSelected($event)"
                class="hidden"
                accept="image/*"
              >
              
              <div class="space-y-6">
                <div class="flex justify-center">
                  <div *ngIf="!previewUrl" class="rounded-full bg-zinc-100 p-4 group-hover:bg-zinc-200 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <img *ngIf="previewUrl" [src]="previewUrl" class="max-h-[400px] rounded-lg shadow-lg" alt="Preview">
                </div>
                <div class="text-center">
                  <button
                    (click)="fileInput.click()"
                    class="inline-flex items-center gap-2 bg-zinc-900 text-white rounded-lg py-3 px-8 text-sm font-medium transition-all duration-300 hover:bg-zinc-800 hover:shadow-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                    </svg>
                    {{ previewUrl ? 'Trocar comprovante' : 'Enviar comprovante' }}
                  </button>
                  <p *ngIf="!previewUrl" class="text-zinc-500 text-sm mt-3">ou arraste e solte sua imagem aqui</p>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="isLoading" class="flex-1 h-full flex flex-col items-center justify-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900"></div>
            <p class="text-zinc-600 mt-4 font-medium">Analisando seu comprovante...</p>
          </div>

          <div *ngIf="error" class="flex-1 h-full flex items-center">
            <div class="w-full bg-red-50 text-red-700 p-6 rounded-lg border border-red-100">
              <div class="flex items-center gap-3 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-medium">Erro</span>
              </div>
              {{ error }}
            </div>
          </div>

          <div *ngIf="markdownResult && !isLoading" class="h-full flex-1">
            <div class="bg-zinc-50 rounded-lg p-6 shadow-inner">
              <h2 class="text-lg font-semibold text-zinc-800 mb-4">Informações Extraídas</h2>
              <div class="markdown-content prose prose-zinc max-w-none" [innerHTML]="markdownResult"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .prose {
      --tw-prose-body: theme('colors.zinc.700');
      --tw-prose-headings: theme('colors.zinc.900');
      --tw-prose-links: theme('colors.zinc.900');
    }
  `]
})
export class ReceiptAnalyzerComponent {
  private marked: Marked;
  isDragging = false;
  isLoading = false;
  error = '';
  markdownResult: SafeHtml = '';
  previewUrl: SafeUrl | null = null;

  constructor(
    private geminiService: GeminiService,
    private sanitizer: DomSanitizer
  ) {
    this.marked = new Marked(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          return code;
        }
      })
    );
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.processFile(input.files[0]);
    }
  }

  private createImagePreview(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.error = 'Por favor, selecione apenas arquivos de imagem.';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.markdownResult = '';
    this.createImagePreview(file);

    try {
      const response = await firstValueFrom(this.geminiService.analyzeReceipt(file));
      if (response) {
        const markdownText = response.toString();
        const htmlContent = this.marked.parse(markdownText) as string;
        this.markdownResult = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
      } else {
        this.error = 'Não foi possível analisar o comprovante: Nenhum conteúdo retornado';
      }
    } catch (error) {
      console.error('Erro ao processar comprovante:', error);
      this.error = 'Erro ao analisar o comprovante. Por favor, tente novamente.';
    } finally {
      this.isLoading = false;
    }
  }
}
import { Component } from '@angular/core';
import { ReceiptAnalyzerComponent } from './components/receipt-analyzer/receipt-analyzer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReceiptAnalyzerComponent],
  template: '<app-receipt-analyzer></app-receipt-analyzer>'
})
export class AppComponent {}
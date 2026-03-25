import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface ChatMessage {
  text: string;
  sender: 'user' | 'sf';
  type?: string;
  data?: any;
  timestamp: Date;
}

@Component({
  selector: 'app-sexta-feira',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <!-- Floating Chat Button -->
    <button class="sf-fab" (click)="toggleChat()" [class.open]="isOpen" matTooltip="Sexta-Feira IA" matTooltipPosition="left">
      <div class="sf-fab-inner">
        <mat-icon *ngIf="!isOpen">smart_toy</mat-icon>
        <mat-icon *ngIf="isOpen">close</mat-icon>
      </div>
    </button>

    <!-- Chat Panel -->
    <div class="chat-panel" *ngIf="isOpen">
      <!-- Header -->
      <div class="chat-header">
        <div class="header-left">
          <div class="sf-avatar-small" [class.thinking]="isThinking">
            <span class="sf-avatar-icon-small">&#9679;</span>
          </div>
          <div class="header-info">
            <span class="header-name">Sexta-Feira</span>
            <span class="header-status">
              <span class="status-dot"></span>
              {{ isThinking ? 'Pensando...' : 'Online' }}
            </span>
          </div>
        </div>
        <button class="close-btn" (click)="toggleChat()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Avatar Area -->
      <div class="avatar-area">
        <div class="sf-avatar" [class.thinking]="isThinking">
          <span class="sf-avatar-icon">&#10024;</span>
        </div>
        <span class="avatar-label">Sexta-Feira</span>
        <span class="avatar-sublabel">IA Local do TriageAI</span>
      </div>

      <!-- Messages -->
      <div class="messages-area" #messagesContainer>
        <div *ngFor="let msg of messages" class="message-wrapper" [class.user]="msg.sender === 'user'" [class.sf]="msg.sender === 'sf'">
          <div class="message-bubble" [class.user-bubble]="msg.sender === 'user'" [class.sf-bubble]="msg.sender === 'sf'">
            <span [innerHTML]="formatMessage(msg.text)"></span>
          </div>
          <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
        </div>

        <!-- Typing indicator -->
        <div class="message-wrapper sf" *ngIf="isThinking">
          <div class="message-bubble sf-bubble typing-bubble">
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <input
          type="text"
          [(ngModel)]="inputText"
          (keydown.enter)="sendMessage()"
          placeholder="Digite sua mensagem..."
          class="chat-input"
          [disabled]="isThinking"
        />
        <button class="send-btn" (click)="sendMessage()" [disabled]="!inputText.trim() || isThinking">
          <mat-icon>send</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Floating Action Button */
    .sf-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      z-index: 1001;
      padding: 0;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
      transition: all 0.3s ease;
      animation: fab-pulse 2s infinite;
    }
    .sf-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 25px rgba(139, 92, 246, 0.6);
    }
    .sf-fab.open {
      animation: none;
      background: linear-gradient(135deg, #4b5563, #374151);
    }
    .sf-fab-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    .sf-fab-inner mat-icon {
      color: white;
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    @keyframes fab-pulse {
      0%, 100% { box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); }
      50% { box-shadow: 0 4px 25px rgba(139, 92, 246, 0.7); }
    }

    /* Chat Panel */
    .chat-panel {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 400px;
      height: 600px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      animation: slideUp 0.3s ease;
      overflow: hidden;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Header */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-info {
      display: flex;
      flex-direction: column;
    }
    .header-name {
      color: white;
      font-weight: 600;
      font-size: 15px;
    }
    .header-status {
      display: flex;
      align-items: center;
      gap: 5px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
    }
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.5);
      padding: 4px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    /* Avatar Small (header) */
    .sf-avatar-small {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: radial-gradient(circle, #8b5cf6, #6366f1, #4f46e5);
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse-glow-sm 2s infinite;
      flex-shrink: 0;
    }
    .sf-avatar-small.thinking {
      animation: pulse-glow-sm 0.5s infinite;
    }
    .sf-avatar-icon-small {
      font-size: 14px;
      color: white;
    }
    @keyframes pulse-glow-sm {
      0%, 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.4); transform: scale(1); }
      50% { box-shadow: 0 0 18px rgba(139, 92, 246, 0.7); transform: scale(1.05); }
    }

    /* Avatar Area (center) */
    .avatar-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 16px 12px;
    }
    .sf-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: radial-gradient(circle, #8b5cf6, #6366f1, #4f46e5);
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3);
      animation: pulse-glow 2s infinite;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }
    .sf-avatar.thinking {
      animation: pulse-glow 0.5s infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3); transform: scale(1); }
      50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.8), 0 0 60px rgba(139, 92, 246, 0.5); transform: scale(1.05); }
    }
    .sf-avatar-icon {
      font-size: 36px;
      color: white;
    }
    .avatar-label {
      color: white;
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 2px;
    }
    .avatar-sublabel {
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }

    /* Messages Area */
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
    .messages-area::-webkit-scrollbar {
      width: 5px;
    }
    .messages-area::-webkit-scrollbar-track {
      background: transparent;
    }
    .messages-area::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 10px;
    }

    .message-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }
    .message-wrapper.user {
      align-self: flex-end;
      align-items: flex-end;
    }
    .message-wrapper.sf {
      align-self: flex-start;
      align-items: flex-start;
    }

    .message-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .user-bubble {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .sf-bubble {
      background: rgba(255, 255, 255, 0.07);
      color: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-bottom-left-radius: 4px;
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.08);
    }
    .message-time {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.3);
      margin-top: 4px;
      padding: 0 4px;
    }

    /* Typing indicator */
    .typing-bubble {
      padding: 12px 18px;
    }
    .typing-dots {
      display: flex;
      gap: 5px;
      align-items: center;
    }
    .typing-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.7);
      animation: bounce-dot 1.4s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce-dot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-8px); opacity: 1; }
    }

    /* Input Area */
    .input-area {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .chat-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 10px 14px;
      color: white;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .chat-input::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }
    .chat-input:focus {
      border-color: rgba(139, 92, 246, 0.5);
    }
    .chat-input:disabled {
      opacity: 0.5;
    }
    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }
    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .send-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .chat-panel {
        width: calc(100vw - 20px);
        height: calc(100vh - 120px);
        right: 10px;
        bottom: 80px;
        border-radius: 16px;
      }
    }
  `]
})
export class SextaFeiraComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  isOpen = false;
  isThinking = false;
  inputText = '';
  private hasGreeted = false;
  private shouldScroll = false;
  private aiServiceUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && !this.hasGreeted) {
      this.hasGreeted = true;
      setTimeout(() => {
        this.messages.push({
          text: 'Ola! Eu sou a **Sexta-Feira**, a IA local do TriageAI!\n\nMe pergunte sobre classificacao de chamados, metricas do modelo ou como estou aprendendo. Como posso ajudar?',
          sender: 'sf',
          type: 'greeting',
          timestamp: new Date()
        });
        this.shouldScroll = true;
      }, 300);
    }
  }

  sendMessage(): void {
    if (!this.inputText.trim() || this.isThinking) return;

    const msg = this.inputText.trim();
    this.messages.push({ text: msg, sender: 'user', timestamp: new Date() });
    this.inputText = '';
    this.isThinking = true;
    this.shouldScroll = true;

    this.http.post<any>(`${this.aiServiceUrl}/chat`, { message: msg }).subscribe({
      next: (res) => {
        this.isThinking = false;
        this.messages.push({
          text: res.response,
          sender: 'sf',
          type: res.type,
          data: res.data,
          timestamp: new Date()
        });
        this.shouldScroll = true;
      },
      error: () => {
        this.isThinking = false;
        this.messages.push({
          text: 'Ops, tive um problema de conexao. Verifique se o servico de IA esta rodando e tente novamente!',
          sender: 'sf',
          timestamp: new Date()
        });
        this.shouldScroll = true;
      }
    });
  }

  formatMessage(text: string): string {
    // Convert **bold** to <strong>
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\n/g, '<br>');
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (e) {}
  }
}

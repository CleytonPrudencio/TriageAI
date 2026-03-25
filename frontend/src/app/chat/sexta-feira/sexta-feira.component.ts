import { Component, ElementRef, ViewChild, AfterViewChecked, AfterViewInit, OnDestroy } from '@angular/core';
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
        <div class="sf-avatar-container" [class.thinking]="isThinking" [class.speaking]="isSpeaking">
          <canvas #particleCanvas class="particle-canvas" width="120" height="120"></canvas>
          <div class="sf-core"></div>
          <div class="sf-ring ring-1"></div>
          <div class="sf-ring ring-2"></div>
          <div class="sf-ring ring-3"></div>
          <div class="sf-particles">
            <span *ngFor="let p of particles" class="particle" [style.--delay]="p.delay + 's'" [style.--angle]="p.angle + 'deg'" [style.--distance]="p.distance + 'px'" [style.--size]="p.size + 'px'" [style.--duration]="p.duration + 's'"></span>
          </div>
        </div>
        <div class="sf-name">SEXTA-FEIRA</div>
        <div class="sf-subtitle">{{ isThinking ? 'Analisando...' : isSpeaking ? 'Respondendo...' : 'IA Local \u2022 Online' }}</div>
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
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      cursor: pointer;
      z-index: 1001;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5);
      animation: fab-pulse 2s infinite;
      transition: transform 0.2s;
    }
    .sf-fab:hover {
      transform: scale(1.1);
    }
    .sf-fab::before {
      content: '';
      position: absolute;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 1px solid rgba(139, 92, 246, 0.3);
      animation: fab-ring 3s linear infinite;
    }
    .sf-fab.open {
      animation: none;
      background: linear-gradient(135deg, #4b5563, #374151);
    }
    .sf-fab.open::before {
      display: none;
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
      0%, 100% { box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5); }
      50% { box-shadow: 0 4px 30px rgba(139, 92, 246, 0.8); }
    }
    @keyframes fab-ring {
      from { transform: rotate(0deg) scale(1); opacity: 0.5; }
      to { transform: rotate(360deg) scale(1.2); opacity: 0; }
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
      padding: 8px 16px 8px;
    }

    /* Jarvis-style Avatar Container */
    .sf-avatar-container {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 8px auto 4px;
    }
    .particle-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 120px;
      height: 120px;
    }
    .sf-core {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: radial-gradient(circle, #c4b5fd, #8b5cf6);
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.6);
      animation: core-pulse 2s infinite;
    }
    .thinking .sf-core {
      animation: core-pulse 0.4s infinite;
      box-shadow: 0 0 25px rgba(139, 92, 246, 0.9);
    }
    .speaking .sf-core {
      animation: core-speak 0.3s infinite;
      width: 16px;
      height: 16px;
      box-shadow: 0 0 30px rgba(139, 92, 246, 1);
    }
    @keyframes core-pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
      50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
    }
    @keyframes core-speak {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      25% { transform: translate(-50%, -50%) scale(1.5); }
      75% { transform: translate(-50%, -50%) scale(0.8); }
    }
    .sf-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 50%;
      animation: ring-rotate 8s linear infinite;
    }
    .ring-1 {
      width: 50px; height: 50px;
      margin: -25px 0 0 -25px;
      border-color: rgba(139, 92, 246, 0.15);
      animation-duration: 6s;
    }
    .ring-2 {
      width: 75px; height: 75px;
      margin: -37.5px 0 0 -37.5px;
      border-color: rgba(99, 102, 241, 0.1);
      animation-duration: 10s;
      animation-direction: reverse;
    }
    .ring-3 {
      width: 100px; height: 100px;
      margin: -50px 0 0 -50px;
      border-color: rgba(139, 92, 246, 0.08);
      animation-duration: 15s;
    }
    .thinking .sf-ring { animation-duration: 1s !important; border-color: rgba(139, 92, 246, 0.4); }
    .speaking .sf-ring { animation-duration: 2s !important; border-color: rgba(139, 92, 246, 0.3); }
    @keyframes ring-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .sf-particles {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
    }
    .particle {
      position: absolute;
      top: 50%; left: 50%;
      width: var(--size);
      height: var(--size);
      background: rgba(139, 92, 246, 0.6);
      border-radius: 50%;
      box-shadow: 0 0 4px rgba(139, 92, 246, 0.4);
      animation: particle-orbit var(--duration) linear infinite;
      animation-delay: var(--delay);
      transform-origin: 0 0;
    }
    @keyframes particle-orbit {
      0% { transform: rotate(var(--angle)) translateX(var(--distance)) rotate(calc(-1 * var(--angle))); opacity: 0.2; }
      25% { opacity: 0.8; }
      50% { transform: rotate(calc(var(--angle) + 180deg)) translateX(var(--distance)) rotate(calc(-1 * (var(--angle) + 180deg))); opacity: 0.4; }
      75% { opacity: 0.9; }
      100% { transform: rotate(calc(var(--angle) + 360deg)) translateX(var(--distance)) rotate(calc(-1 * (var(--angle) + 360deg))); opacity: 0.2; }
    }
    .thinking .particle { animation-duration: 1s !important; background: rgba(139, 92, 246, 0.9); }
    .speaking .particle { animation-duration: 1.5s !important; box-shadow: 0 0 8px rgba(139, 92, 246, 0.8); }

    /* Name and subtitle */
    .sf-name {
      text-align: center;
      color: #c4b5fd;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .sf-subtitle {
      text-align: center;
      color: #64748b;
      font-size: 11px;
      margin-top: 2px;
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
export class SextaFeiraComponent implements AfterViewChecked, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  messages: ChatMessage[] = [];
  isOpen = false;
  isThinking = false;
  isSpeaking = false;
  inputText = '';
  particles: {delay: number, angle: number, distance: number, size: number, duration: number}[] = [];
  private hasGreeted = false;
  private shouldScroll = false;
  private aiServiceUrl = 'http://localhost:8000';
  private animationId: any;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.generateParticles();
    if (this.isOpen) {
      this.startCanvasAnimation();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.stopCanvasAnimation();
  }

  generateParticles(): void {
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        delay: Math.random() * 3,
        angle: Math.random() * 360,
        distance: 25 + Math.random() * 35,
        size: 1 + Math.random() * 3,
        duration: 2 + Math.random() * 4
      });
    }
  }

  startCanvasAnimation(): void {
    setTimeout(() => {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      let time = 0;
      const dots: {x: number, y: number, vx: number, vy: number, r: number, alpha: number}[] = [];

      // Create floating dots
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 35;
        dots.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: 0.5 + Math.random() * 2,
          alpha: 0.3 + Math.random() * 0.7
        });
      }

      const animate = () => {
        ctx.clearRect(0, 0, w, h);
        time += 0.02;

        const speaking = this.isSpeaking;
        const thinking = this.isThinking;
        const speed = speaking ? 3 : thinking ? 2 : 1;
        const intensity = speaking ? 1.5 : thinking ? 1.2 : 1;

        // Draw connections between nearby dots
        for (let i = 0; i < dots.length; i++) {
          for (let j = i + 1; j < dots.length; j++) {
            const dx = dots[i].x - dots[j].x;
            const dy = dots[i].y - dots[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 30) {
              ctx.beginPath();
              ctx.moveTo(dots[i].x, dots[i].y);
              ctx.lineTo(dots[j].x, dots[j].y);
              ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 * (1 - dist/30) * intensity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }

        // Update and draw dots
        dots.forEach((dot, i) => {
          // Orbit around center
          const angle = Math.atan2(dot.y - cy, dot.x - cx);
          const dist = Math.sqrt((dot.x - cx) ** 2 + (dot.y - cy) ** 2);

          // Add orbital motion
          const orbitSpeed = (0.003 + (i % 3) * 0.002) * speed;
          const newAngle = angle + orbitSpeed;
          const targetDist = 15 + (Math.sin(time * 0.5 + i) + 1) * 20 * intensity;

          dot.x = cx + Math.cos(newAngle) * (dist + (targetDist - dist) * 0.02);
          dot.y = cy + Math.sin(newAngle) * (dist + (targetDist - dist) * 0.02);

          // Add some randomness when speaking
          if (speaking) {
            dot.x += (Math.random() - 0.5) * 2;
            dot.y += (Math.random() - 0.5) * 2;
          }

          // Keep within bounds
          const maxDist = speaking ? 55 : 45;
          const currentDist = Math.sqrt((dot.x - cx) ** 2 + (dot.y - cy) ** 2);
          if (currentDist > maxDist) {
            dot.x = cx + ((dot.x - cx) / currentDist) * maxDist;
            dot.y = cy + ((dot.y - cy) / currentDist) * maxDist;
          }

          // Draw dot
          const glowSize = dot.r * intensity;
          const gradient = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, glowSize * 3);
          gradient.addColorStop(0, `rgba(139, 92, 246, ${dot.alpha * intensity})`);
          gradient.addColorStop(0.5, `rgba(99, 102, 241, ${dot.alpha * 0.3 * intensity})`);
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

          ctx.beginPath();
          ctx.arc(dot.x, dot.y, glowSize * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, glowSize * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 180, 255, ${dot.alpha * intensity})`;
          ctx.fill();
        });

        // Draw center glow
        const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20 * intensity);
        centerGlow.addColorStop(0, `rgba(139, 92, 246, ${0.3 * intensity})`);
        centerGlow.addColorStop(0.5, `rgba(139, 92, 246, ${0.1 * intensity})`);
        centerGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.beginPath();
        ctx.arc(cx, cy, 20 * intensity, 0, Math.PI * 2);
        ctx.fillStyle = centerGlow;
        ctx.fill();

        this.animationId = requestAnimationFrame(animate);
      };

      animate();
    }, 100);
  }

  stopCanvasAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      if (!this.hasGreeted) {
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
      setTimeout(() => this.startCanvasAnimation(), 200);
    } else {
      this.stopCanvasAnimation();
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
        this.isSpeaking = true;
        setTimeout(() => this.isSpeaking = false, 2000 + res.response.length * 20);
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

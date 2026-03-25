import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-sexta-feira-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatTooltipModule],
  template: `
    <div class="sf-page">
      <!-- Back button -->
      <button class="back-btn" routerLink="/dashboard">
        <mat-icon>arrow_back</mat-icon>
      </button>

      <!-- Main sphere area -->
      <div class="sphere-area">
        <canvas #sphereCanvas class="sphere-canvas" [width]="canvasSize" [height]="canvasSize"></canvas>
        <div class="sf-label">SEXTA-FEIRA</div>
        <div class="sf-status">{{ statusText }}</div>
      </div>

      <!-- Messages (floating over background) -->
      <div class="messages-area" #messagesArea>
        <div *ngFor="let msg of messages" class="message" [class.user]="msg.sender === 'user'" [class.sf]="msg.sender === 'sf'">
          <div class="msg-bubble" [innerHTML]="formatMessage(msg.text)"></div>
        </div>
        <!-- Typing indicator -->
        <div class="message sf" *ngIf="isThinking">
          <div class="msg-bubble typing">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div class="input-area">
        <!-- Voice button -->
        <button class="voice-btn" [class.recording]="isRecording" (click)="toggleVoice()" [matTooltip]="isRecording ? 'Parar' : 'Falar'">
          <mat-icon>{{ isRecording ? 'stop' : 'mic' }}</mat-icon>
          <div class="voice-ring" *ngIf="isRecording"></div>
        </button>

        <!-- Text input -->
        <div class="text-input-wrapper">
          <input type="text" [(ngModel)]="inputText" (keyup.enter)="sendMessage()"
                 placeholder="Digite ou use o microfone..." class="text-input"
                 [disabled]="isRecording">
        </div>

        <!-- Send button -->
        <button class="send-btn" (click)="sendMessage()" [disabled]="!inputText.trim() && !isRecording">
          <mat-icon>send</mat-icon>
        </button>

        <!-- Voice toggle -->
        <button class="toggle-voice-btn" (click)="voiceResponseEnabled = !voiceResponseEnabled"
                [matTooltip]="voiceResponseEnabled ? 'Desativar voz' : 'Ativar voz'"
                [class.active]="voiceResponseEnabled">
          <mat-icon>{{ voiceResponseEnabled ? 'volume_up' : 'volume_off' }}</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sf-page {
      width: 100vw; height: 100vh;
      background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 40%, #0f0f23 100%);
      display: flex; flex-direction: column; align-items: center;
      position: relative; overflow: hidden;
    }
    /* Ambient background particles */
    .sf-page::before {
      content: '';
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .back-btn {
      position: absolute; top: 20px; left: 20px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: #a78bfa; border-radius: 12px; padding: 8px; cursor: pointer;
      z-index: 10; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center;
    }
    .back-btn:hover { background: rgba(139,92,246,0.2); }
    .sphere-area {
      flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
      padding-top: 20px; position: relative; z-index: 1;
    }
    .sphere-canvas { display: block; }
    .sf-label {
      color: #c4b5fd; font-size: 18px; font-weight: 700; letter-spacing: 8px;
      text-transform: uppercase; margin-top: -10px;
      text-shadow: 0 0 20px rgba(139,92,246,0.5);
    }
    .sf-status {
      color: #64748b; font-size: 12px; margin-top: 4px;
      transition: color 0.3s;
    }
    /* Messages */
    .messages-area {
      flex: 1; width: 100%; max-width: 600px; overflow-y: auto;
      padding: 20px; display: flex; flex-direction: column; gap: 12px;
      z-index: 2; mask-image: linear-gradient(transparent 0%, black 10%, black 90%, transparent 100%);
      -webkit-mask-image: linear-gradient(transparent 0%, black 10%, black 90%, transparent 100%);
    }
    .message { display: flex; }
    .message.user { justify-content: flex-end; }
    .message.sf { justify-content: flex-start; }
    .msg-bubble {
      max-width: 80%; padding: 12px 16px; border-radius: 16px;
      font-size: 14px; line-height: 1.6; word-break: break-word;
    }
    .message.user .msg-bubble {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; border-bottom-right-radius: 4px;
    }
    .message.sf .msg-bubble {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(139,92,246,0.2);
      color: #e2e8f0; border-bottom-left-radius: 4px;
      backdrop-filter: blur(10px);
    }
    .typing { display: flex; gap: 4px; padding: 12px 20px; }
    .dot {
      width: 8px; height: 8px; background: #8b5cf6; border-radius: 50%;
      animation: bounce 1.4s infinite; opacity: 0.6;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-8px); }
    }
    /* Input area */
    .input-area {
      width: 100%; max-width: 600px; padding: 16px 20px;
      display: flex; align-items: center; gap: 12px; z-index: 3;
    }
    .voice-btn {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(139,92,246,0.15); border: 2px solid rgba(139,92,246,0.3);
      color: #a78bfa; cursor: pointer; display: flex; align-items: center;
      justify-content: center; position: relative; transition: all 0.3s;
      flex-shrink: 0;
    }
    .voice-btn:hover { background: rgba(139,92,246,0.3); }
    .voice-btn.recording {
      background: rgba(239,68,68,0.2); border-color: #ef4444; color: #ef4444;
      animation: recording-pulse 1s infinite;
    }
    @keyframes recording-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
      50% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
    }
    .voice-ring {
      position: absolute; width: 60px; height: 60px; border-radius: 50%;
      border: 2px solid rgba(239,68,68,0.3);
      animation: ring-expand 1.5s infinite;
    }
    @keyframes ring-expand {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(1.5); opacity: 0; }
    }
    .text-input-wrapper { flex: 1; }
    .text-input {
      width: 100%; padding: 14px 20px; border-radius: 25px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: #e2e8f0; font-size: 14px; outline: none; transition: all 0.3s;
      box-sizing: border-box;
    }
    .text-input::placeholder { color: #475569; }
    .text-input:focus { border-color: rgba(139,92,246,0.5); background: rgba(255,255,255,0.08); }
    .send-btn {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none; color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s; flex-shrink: 0;
    }
    .send-btn:hover { transform: scale(1.1); }
    .send-btn:disabled { opacity: 0.3; cursor: default; transform: none; }
    .toggle-voice-btn {
      width: 36px; height: 36px; border-radius: 50%;
      background: transparent; border: 1px solid rgba(255,255,255,0.1);
      color: #475569; cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: all 0.2s;
    }
    .toggle-voice-btn.active { color: #a78bfa; border-color: rgba(139,92,246,0.3); }
    /* Scrollbar */
    .messages-area::-webkit-scrollbar { width: 4px; }
    .messages-area::-webkit-scrollbar-track { background: transparent; }
    .messages-area::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }
    /* Mobile */
    @media (max-width: 640px) {
      .sphere-canvas { width: 250px !important; height: 250px !important; }
      .sf-label { font-size: 14px; letter-spacing: 5px; }
      .input-area { padding: 12px; }
    }
  `]
})
export class SextaFeiraPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sphereCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('messagesArea') messagesArea!: ElementRef;

  messages: {text: string, sender: 'user' | 'sf', timestamp: Date}[] = [];
  inputText = '';
  isThinking = false;
  isSpeaking = false;
  isRecording = false;
  voiceResponseEnabled = true;
  statusText = 'IA Local \u2022 Online';
  canvasSize = 400;

  private animationId: any;
  private recognition: any;
  private synthesis = window.speechSynthesis;
  private audioLevel = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Adjust canvas size based on screen
    this.canvasSize = Math.min(400, window.innerWidth * 0.7);

    // Greeting
    setTimeout(() => {
      this.messages.push({
        text: 'Ol\u00e1! Eu sou a **Sexta-Feira**. Pode falar comigo ou digitar. Como posso ajudar?',
        sender: 'sf',
        timestamp: new Date()
      });
      if (this.voiceResponseEnabled) {
        this.speak('Ol\u00e1! Eu sou a Sexta-Feira. Pode falar comigo ou digitar. Como posso ajudar?');
      }
    }, 500);
  }

  ngAfterViewInit(): void {
    this.startAnimation();
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.recognition) this.recognition.stop();
    this.synthesis.cancel();
  }

  startAnimation(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    let time = 0;

    // Create particles
    const particles: {x: number, y: number, baseAngle: number, baseDist: number, r: number, speed: number, alpha: number, phase: number}[] = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * (w * 0.35);
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        baseAngle: angle,
        baseDist: dist,
        r: 0.5 + Math.random() * 2.5,
        speed: 0.002 + Math.random() * 0.008,
        alpha: 0.2 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      time += 0.016;

      const speaking = this.isSpeaking;
      const thinking = this.isThinking;
      const recording = this.isRecording;
      const intensity = speaking ? 1.3 : thinking ? 1.15 : recording ? 1.2 : 1;
      const speedMult = speaking ? 2 : thinking ? 1.5 : recording ? 1.8 : 1;

      // Update particles
      particles.forEach((p, i) => {
        p.baseAngle += p.speed * speedMult;
        const breathe = Math.sin(time * 0.3 + p.phase) * 5 * intensity;
        const audioReact = (speaking || recording) ? Math.sin(time * 4 + i * 0.3) * 8 * this.audioLevel : 0;
        const dist = p.baseDist + breathe + audioReact;
        p.x = cx + Math.cos(p.baseAngle) * dist;
        p.y = cy + Math.sin(p.baseAngle) * dist;
        if (speaking) {
          p.x += (Math.random() - 0.5) * 1.5;
          p.y += (Math.random() - 0.5) * 1.5;
        }
      });

      // Draw connections (thin, subtle)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = speaking ? 45 : 30;
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(120, 100, 200, ${0.06 * (1 - dist / maxDist) * intensity})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        }
      }

      // Draw particles (clean dots, no glow)
      particles.forEach(p => {
        const size = p.r * 0.8 * intensity;
        const alpha = p.alpha * 0.5 * intensity;
        // Simple dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160, 140, 220, ${alpha})`;
        ctx.fill();
      });

      // Subtle center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3 * intensity, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160, 140, 220, ${0.4 * intensity})`;
      ctx.fill();

      // Rings (very subtle)
      for (let r = 0; r < 3; r++) {
        const ringRadius = 50 + r * 45;
        const ringAngle = time * (0.2 - r * 0.05) * speedMult;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, ringAngle, ringAngle + Math.PI * 1.2);
        ctx.strokeStyle = `rgba(120, 100, 200, ${0.04 * intensity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  // Voice Input (Web Speech API)
  toggleVoice(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.messages.push({text: 'Seu navegador n\u00e3o suporta reconhecimento de voz. Use Chrome.', sender: 'sf', timestamp: new Date()});
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'pt-BR';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.statusText = 'Ouvindo...';
      this.audioLevel = 0.8;
    };

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.resultIndex].isFinal) {
        this.inputText = transcript;
        this.sendMessage();
      } else {
        this.statusText = `"${transcript}..."`;
      }
    };

    this.recognition.onerror = () => {
      this.isRecording = false;
      this.statusText = 'IA Local \u2022 Online';
      this.audioLevel = 0;
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      this.statusText = 'IA Local \u2022 Online';
      this.audioLevel = 0;
    };

    this.recognition.start();
  }

  stopRecording(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isRecording = false;
    this.statusText = 'IA Local \u2022 Online';
    this.audioLevel = 0;
  }

  // Voice Output (Speech Synthesis)
  speak(text: string): void {
    if (!this.voiceResponseEnabled) return;
    this.synthesis.cancel();

    // Clean markdown
    const clean = text.replace(/\*\*/g, '').replace(/\n/g, '. ');

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    // Select female voice if available
    const voices = this.synthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt') && v.name.toLowerCase().includes('female'))
                 || voices.find(v => v.lang.startsWith('pt-BR'))
                 || voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.statusText = 'Falando...';
      this.audioLevel = 1;
    };
    utterance.onend = () => {
      this.isSpeaking = false;
      this.statusText = 'IA Local \u2022 Online';
      this.audioLevel = 0;
    };

    // Simulate audio level variation while speaking
    const audioInterval = setInterval(() => {
      if (!this.isSpeaking) { clearInterval(audioInterval); return; }
      this.audioLevel = 0.5 + Math.random() * 0.5;
    }, 100);

    this.synthesis.speak(utterance);
  }

  sendMessage(): void {
    if (!this.inputText.trim()) return;
    const msg = this.inputText;
    this.messages.push({text: msg, sender: 'user', timestamp: new Date()});
    this.inputText = '';
    this.isThinking = true;
    this.statusText = 'Analisando...';
    this.audioLevel = 0.5;

    setTimeout(() => this.scrollToBottom(), 100);

    this.http.post<any>('http://localhost:8000/chat', {message: msg}).subscribe({
      next: (res) => {
        this.isThinking = false;
        this.messages.push({text: res.response, sender: 'sf', timestamp: new Date()});
        setTimeout(() => this.scrollToBottom(), 100);

        // Speak the response
        if (this.voiceResponseEnabled) {
          this.speak(res.response);
        } else {
          this.isSpeaking = true;
          this.statusText = 'Respondendo...';
          setTimeout(() => {
            this.isSpeaking = false;
            this.statusText = 'IA Local \u2022 Online';
          }, 1000 + res.response.length * 15);
        }
      },
      error: () => {
        this.isThinking = false;
        this.statusText = 'IA Local \u2022 Online';
        this.audioLevel = 0;
        this.messages.push({text: 'Ops, tive um problema de conex\u00e3o. Tenta de novo!', sender: 'sf', timestamp: new Date()});
      }
    });
  }

  formatMessage(text: string): string {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  scrollToBottom(): void {
    try {
      const el = this.messagesArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch(e) {}
  }
}

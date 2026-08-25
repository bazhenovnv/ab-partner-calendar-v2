import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket, createConnection } from 'node:net';
import { TLSSocket, connect as createTlsConnection } from 'node:tls';

type SmtpResponse = {
  code: number;
  text: string;
};

export type NeedsAttentionMail = {
  title: string;
  reasons: string[];
  adminUrl: string;
};

@Injectable()
export class SmtpMailService {
  private readonly logger = new Logger(SmtpMailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.smtpHost() && this.fromAddress() && this.recipientAddress());
  }

  recipientAddress(): string {
    return (
      this.config.get<string>('ATTENTION_EMAIL_TO') ||
      this.config.get<string>('NEXT_PUBLIC_CONTACT_EMAIL') ||
      'info-event@a-b.ru'
    ).trim();
  }

  async sendNeedsAttention(mail: NeedsAttentionMail): Promise<void> {
    const host = this.smtpHost();
    const port = this.smtpPort();
    const secure = this.smtpSecure(port);
    const startTls = this.smtpStartTls(secure);
    const from = this.fromAddress();
    const to = this.recipientAddress();

    if (!host || !from || !to) {
      throw new Error(
        'SMTP is not configured: SMTP_HOST, SMTP_FROM/SMTP_USER and ATTENTION_EMAIL_TO are required',
      );
    }
    this.assertEmail(from, 'SMTP_FROM');
    this.assertEmail(to, 'ATTENTION_EMAIL_TO');

    let socket: Socket | TLSSocket | null = null;
    try {
      socket = secure
        ? await this.openTlsSocket(host, port)
        : await this.openPlainSocket(host, port);

      this.expect(await this.readResponse(socket), [220], 'SMTP greeting');
      let ehlo = await this.command(socket, `EHLO ${this.heloName()}`);
      this.expect(ehlo, [250], 'EHLO');

      if (!secure && startTls) {
        const start = await this.command(socket, 'STARTTLS');
        this.expect(start, [220], 'STARTTLS');
        socket = await this.upgradeToTls(socket, host);
        ehlo = await this.command(socket, `EHLO ${this.heloName()}`);
        this.expect(ehlo, [250], 'EHLO after STARTTLS');
      }

      const user = this.config.get<string>('SMTP_USER')?.trim();
      const password = this.config.get<string>('SMTP_PASSWORD') ?? '';
      if (user) {
        await this.authenticate(socket, user, password);
      }

      this.expect(await this.command(socket, `MAIL FROM:<${from}>`), [250], 'MAIL FROM');
      this.expect(await this.command(socket, `RCPT TO:<${to}>`), [250, 251], 'RCPT TO');
      this.expect(await this.command(socket, 'DATA'), [354], 'DATA');

      const message = this.buildMessage(from, to, mail);
      this.expect(await this.command(socket, `${message}\r\n.`), [250], 'message body');
      await this.command(socket, 'QUIT').catch(() => undefined);
    } finally {
      socket?.end();
      socket?.destroy();
    }
  }

  private smtpHost(): string {
    return this.config.get<string>('SMTP_HOST')?.trim() ?? '';
  }

  private smtpPort(): number {
    const raw = Number.parseInt(this.config.get<string>('SMTP_PORT') ?? '465', 10);
    return Number.isFinite(raw) && raw > 0 && raw <= 65535 ? raw : 465;
  }

  private smtpSecure(port: number): boolean {
    const raw = this.config.get<string>('SMTP_SECURE');
    if (raw === undefined || raw === null || raw === '') return port === 465;
    return raw.toLocaleLowerCase('en-US') === 'true';
  }

  private smtpStartTls(secure: boolean): boolean {
    if (secure) return false;
    const raw = this.config.get<string>('SMTP_STARTTLS');
    if (raw === undefined || raw === null || raw === '') return true;
    return raw.toLocaleLowerCase('en-US') === 'true';
  }

  private fromAddress(): string {
    return (
      this.config.get<string>('SMTP_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      ''
    ).trim();
  }

  private heloName(): string {
    return this.config.get<string>('SMTP_HELO_NAME')?.trim() || 'ab-event.pro';
  }

  private timeoutMs(): number {
    const raw = Number.parseInt(this.config.get<string>('SMTP_TIMEOUT_MS') ?? '15000', 10);
    return Number.isFinite(raw) && raw >= 1000 ? raw : 15000;
  }

  private openPlainSocket(host: string, port: number): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port });
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`SMTP connection timeout after ${this.timeoutMs()} ms`));
      }, this.timeoutMs());
      socket.once('connect', () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private openTlsSocket(host: string, port: number): Promise<TLSSocket> {
    return new Promise((resolve, reject) => {
      const socket = createTlsConnection({
        host,
        port,
        servername: host,
        rejectUnauthorized: true,
      });
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`SMTP TLS connection timeout after ${this.timeoutMs()} ms`));
      }, this.timeoutMs());
      socket.once('secureConnect', () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private upgradeToTls(socket: Socket, host: string): Promise<TLSSocket> {
    return new Promise((resolve, reject) => {
      const tlsSocket = createTlsConnection({
        socket,
        servername: host,
        rejectUnauthorized: true,
      });
      const timer = setTimeout(() => {
        tlsSocket.destroy();
        reject(new Error(`SMTP STARTTLS timeout after ${this.timeoutMs()} ms`));
      }, this.timeoutMs());
      tlsSocket.once('secureConnect', () => {
        clearTimeout(timer);
        resolve(tlsSocket);
      });
      tlsSocket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private readResponse(socket: Socket | TLSSocket): Promise<SmtpResponse> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let expectedCode: string | null = null;
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`SMTP response timeout after ${this.timeoutMs()} ms`));
      }, this.timeoutMs());

      const cleanup = () => {
        clearTimeout(timer);
        socket.off('data', onData);
        socket.off('error', onError);
        socket.off('close', onClose);
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onClose = () => {
        cleanup();
        reject(new Error('SMTP connection closed before a complete response was received'));
      };
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/);
        const completeLines = buffer.endsWith('\n') ? lines.slice(0, -1) : lines.slice(0, -1);
        for (const line of completeLines) {
          const match = line.match(/^(\d{3})([ -])(.*)$/);
          if (!match) continue;
          if (!expectedCode) expectedCode = match[1];
          if (match[1] === expectedCode && match[2] === ' ') {
            cleanup();
            resolve({ code: Number.parseInt(match[1], 10), text: buffer.trim() });
            return;
          }
        }
      };

      socket.on('data', onData);
      socket.once('error', onError);
      socket.once('close', onClose);
    });
  }

  private async command(socket: Socket | TLSSocket, value: string): Promise<SmtpResponse> {
    const response = this.readResponse(socket);
    socket.write(`${value}\r\n`);
    return response;
  }

  private expect(response: SmtpResponse, codes: number[], step: string): void {
    if (!codes.includes(response.code)) {
      throw new Error(`${step} failed: SMTP ${response.code} ${response.text}`);
    }
  }

  private async authenticate(socket: Socket | TLSSocket, user: string, password: string): Promise<void> {
    const plainToken = Buffer.from(`\u0000${user}\u0000${password}`, 'utf8').toString('base64');
    const plain = await this.command(socket, `AUTH PLAIN ${plainToken}`);
    if (plain.code === 235) return;

    const login = await this.command(socket, 'AUTH LOGIN');
    this.expect(login, [334], 'AUTH LOGIN');
    this.expect(
      await this.command(socket, Buffer.from(user, 'utf8').toString('base64')),
      [334],
      'SMTP username',
    );
    this.expect(
      await this.command(socket, Buffer.from(password, 'utf8').toString('base64')),
      [235],
      'SMTP password',
    );
  }

  private buildMessage(from: string, to: string, mail: NeedsAttentionMail): string {
    const safeTitle = this.singleLine(mail.title || 'Без названия');
    const reasons = mail.reasons.length > 0 ? mail.reasons : ['Причина не указана'];
    const details = reasons
      .map((reason, index) => {
        const safeReason = this.singleLine(reason);
        return `${index + 1}. ${safeReason}\n   Что проверить: ${this.actionForReason(safeReason)}`;
      })
      .join('\n\n');
    const body = [
      'АБ Афиша Бухгалтера',
      '',
      'Событие попало в раздел «Требует внимания».',
      '',
      `Событие: ${safeTitle}`,
      '',
      'Причины и действия администратора:',
      details,
      '',
      `Открыть раздел «Требует внимания»: ${mail.adminUrl}`,
      '',
      'Это автоматическое служебное уведомление.',
    ].join('\n');

    const subject = this.encodeHeader(`[АБ Афиша] Требует внимания: ${safeTitle}`);
    const encodedBody = Buffer.from(body, 'utf8').toString('base64');
    const wrappedBody = encodedBody.match(/.{1,76}/g)?.join('\r\n') ?? encodedBody;

    return [
      `Date: ${new Date().toUTCString()}`,
      `From: <${from}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrappedBody,
    ].join('\r\n');
  }

  private actionForReason(reason: string): string {
    const normalized = reason.toLocaleLowerCase('ru-RU');
    if (normalized.includes('изображ')) {
      return 'Проверьте изображение мероприятия и при необходимости загрузите его вручную.';
    }
    if (normalized.includes('гибрид') || normalized.includes('очно')) {
      return 'Проверьте формат «Онлайн + офлайн», город, площадку и адрес очной части.';
    }
    if (normalized.includes('заголов')) {
      return 'Проверьте и заполните название мероприятия.';
    }
    if (normalized.includes('дат')) {
      return 'Проверьте дату начала и окончания мероприятия.';
    }
    if (normalized.includes('формат')) {
      return 'Выберите корректный формат мероприятия.';
    }
    if (normalized.includes('город') || normalized.includes('мест')) {
      return 'Укажите корректный город, площадку и адрес очного мероприятия.';
    }
    if (normalized.includes('направлен')) {
      return 'Выберите хотя бы одно подходящее направление мероприятия.';
    }
    if (normalized.includes('подборк')) {
      return 'Проверьте, нужно ли разделить пост-подборку на отдельные события.';
    }
    return 'Откройте карточку события и исправьте указанную причину перед публикацией.';
  }

  private encodeHeader(value: string): string {
    return `=?UTF-8?B?${Buffer.from(this.singleLine(value), 'utf8').toString('base64')}?=`;
  }

  private singleLine(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private assertEmail(value: string, name: string): void {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error(`${name} is not a valid email address`);
    }
  }
}

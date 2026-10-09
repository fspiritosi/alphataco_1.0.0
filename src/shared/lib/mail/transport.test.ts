import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMailSpy } = vi.hoisted(() => ({ sendMailSpy: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: sendMailSpy }) },
}));

import { resetMailTransport, sendMail } from './transport';

describe('sendMail con adjuntos', () => {
  beforeEach(() => {
    vi.stubEnv('SMTP_HOST', 'smtp.test');
    resetMailTransport();
    sendMailSpy.mockReset();
    sendMailSpy.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetMailTransport();
  });

  it('pasa los adjuntos a nodemailer', async () => {
    const content = new Uint8Array([37, 80, 68, 70]);
    const ok = await sendMail({
      to: 'proveedor@test.com',
      subject: 'OC',
      text: 'adjunta',
      attachments: [{ filename: 'OC-000001.pdf', content, contentType: 'application/pdf' }],
    });

    expect(ok).toBe(true);
    const [message] = sendMailSpy.mock.calls[0];
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0].filename).toBe('OC-000001.pdf');
    expect(message.attachments[0].contentType).toBe('application/pdf');
    expect(Buffer.isBuffer(message.attachments[0].content)).toBe(true);
    expect([...message.attachments[0].content]).toEqual([37, 80, 68, 70]);
  });

  it('sin adjuntos no manda la clave', async () => {
    await sendMail({ to: 'a@test.com', subject: 'x', text: 'y' });
    const [message] = sendMailSpy.mock.calls[0];
    expect(message.attachments).toBeUndefined();
  });
});

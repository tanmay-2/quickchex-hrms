import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Fingerprint, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import './EmployeeOtpVerification.css';

import { getApiBaseUrl } from '../../../utils/apiBase';

const API_BASE_URL = getApiBaseUrl();
const VERIFY_URL = import.meta.env.VITE_OTP_VERIFY_URL || `${API_BASE_URL}/auth/verify-otp`;
const RESEND_URL = import.meta.env.VITE_OTP_RESEND_URL || `${API_BASE_URL}/auth/resend-otp`;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskEmail(value) {
  const text = String(value || '').trim();
  const at = text.indexOf('@');
  if (at < 0) return text || 'your registered email';
  const local = text.slice(0, at);
  const domain = text.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export default function EmployeeOtpVerification({
  email = sessionStorage.getItem('hrms_otp_email') || '',
  transactionId = sessionStorage.getItem('hrms_otp_tx') || '',
  onVerified,
  onDifferentAccount,
}) {
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  const code = useMemo(() => digits.join(''), [digits]);
  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    const timer = window.setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updateDigit = (index, raw) => {
    const value = raw.replace(/\D/g, '').slice(-1);
    setError('');
    setStatus('idle');
    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, index) => { next[index] = char; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  };

  const verify = async () => {
    if (code.length !== OTP_LENGTH) {
      setError('Enter the complete 6-digit verification code.');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers.Authorization = `Bearer ${token}`;
      const payload = { otp: code, code, email, transactionId };

      const response = await fetch(VERIFY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('OTP verification failed');
      const data = await response.json().catch(() => ({}));
      if (data.success === false || data.valid === false) throw new Error('INVALID_OTP');

      setStatus('success');
      sessionStorage.removeItem('hrms_otp_required');
      sessionStorage.removeItem('hrms_otp_email');
      sessionStorage.removeItem('hrms_otp_tx');
      sessionStorage.removeItem('hrms_dev_otp');
      window.setTimeout(() => onVerified?.(data), 450);
    } catch (err) {
      setStatus('error');
      setError(err?.message === 'INVALID_OTP' ? 'That verification code is incorrect. Please try again.' : 'Unable to verify the code right now. Please try again.');
    }
  };

  const resend = async () => {
    if (seconds > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, transactionId }),
      });
      if (!response.ok) throw new Error('RESEND_FAILED');
      const data = await response.json().catch(() => ({}));
      setSeconds(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch {
      setError('We could not resend the code. Please try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="employee-otp-overlay" role="dialog" aria-modal="true" aria-labelledby="employee-otp-title">
      <div className="employee-otp-backdrop" />
      <div className="employee-otp-modal">
        <div className="employee-otp-top-glow" />
        <div className="employee-otp-icon"><ShieldCheck size={25} /></div>
        <div className="employee-otp-eyebrow"><Sparkles size={13} /> SECURE EMPLOYEE VERIFICATION</div>
        <h2 id="employee-otp-title">Verify your identity</h2>
        <p className="employee-otp-description">We sent a 6-digit verification code to your registered work email via Outlook.</p>

        <div className="employee-otp-account">
          <span className="employee-otp-account-icon"><Fingerprint size={17} /></span>
          <div><small>Verification code sent to</small><strong>{maskedEmail}</strong></div>
        </div>

        <div className="employee-otp-inputs" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => { inputRefs.current[index] = node; }}
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              inputMode="numeric"
              maxLength={1}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              aria-label={`Verification digit ${index + 1}`}
              className={status === 'error' ? 'is-error' : status === 'success' ? 'is-success' : ''}
            />
          ))}
        </div>

        {error && <div className="employee-otp-error"><span />{error}</div>}
        {status === 'success' && <div className="employee-otp-success"><CheckCircle2 size={16} /> Verification successful.</div>}

        <button className="employee-otp-verify" type="button" onClick={verify} disabled={status === 'loading' || status === 'success'}>
          {status === 'loading' ? <><LoaderCircle size={17} className="employee-otp-spin" /> Verifying…</> : <>Verify &amp; Continue <span>→</span></>}
        </button>

        <div className="employee-otp-resend-row">
          <span><Clock3 size={14} /> {seconds > 0 ? `Resend available in ${seconds}s` : 'Didn’t receive the code?'}</span>
          <button type="button" onClick={resend} disabled={seconds > 0 || resending}>
            {resending ? <LoaderCircle size={14} className="employee-otp-spin" /> : <RefreshCw size={14} />}
            Resend code
          </button>
        </div>

        <div className="employee-otp-security"><ShieldCheck size={14} /><span>Your verification is encrypted and protected by company security policy.</span></div>
        <button type="button" className="employee-otp-switch" onClick={onDifferentAccount}>Use a different account</button>
      </div>
    </div>
  );
}

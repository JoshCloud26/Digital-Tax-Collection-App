"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

interface LoginData {
  email: string;
  password: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });

  const states = [
    { value: 'abia', label: 'Abia' }, { value: 'adamawa', label: 'Adamawa' },
    { value: 'akwa_ibom', label: 'Akwa Ibom' }, { value: 'anambra', label: 'Anambra' },
    { value: 'bauchi', label: 'Bauchi' }, { value: 'bayelsa', label: 'Bayelsa' },
    { value: 'benue', label: 'Benue' }, { value: 'borno', label: 'Borno' },
    { value: 'cross_river', label: 'Cross River' }, { value: 'delta', label: 'Delta' },
    { value: 'ebonyi', label: 'Ebonyi' }, { value: 'edo', label: 'Edo' }, { value: 'ekiti', label: 'Ekiti' },
    { value: 'enugu', label: 'Enugu' }, { value: 'gombe', label: 'Gombe' }, { value: 'imo', label: 'Imo' },
    { value: 'jigawa', label: 'Jigawa' }, { value: 'kaduna', label: 'Kaduna' }, { value: 'kano', label: 'Kano' },
    { value: 'katsina', label: 'Katsina' }, { value: 'kebbi', label: 'Kebbi' }, { value: 'kogi', label: 'Kogi' },
    { value: 'kwara', label: 'Kwara' }, { value: 'lagos', label: 'Lagos' }, { value: 'nasarawa', label: 'Nasarawa' },
    { value: 'niger', label: 'Niger' }, { value: 'ogun', label: 'Ogun' }, { value: 'ondo', label: 'Ondo' },
    { value: 'osun', label: 'Osun' }, { value: 'oyo', label: 'Oyo' }, { value: 'plateau', label: 'Plateau' },
    { value: 'rivers', label: 'Rivers' }, { value: 'sokoto', label: 'Sokoto' }, { value: 'taraba', label: 'Taraba' },
    { value: 'yobe', label: 'Yobe' }, { value: 'zamfara', label: 'Zamfara' }, { value: 'fct', label: 'FCT - Abuja' },
  ];

  const [selectedState, setSelectedState] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('selected_state') || 'fct';
    return 'fct';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Customer support chat state
  const [chatOpen, setChatOpen] = useState(false);
  // Keep initial messages static to avoid server/client hydration differences.
  const [chatMessages, setChatMessages] = useState<Array<{from: 'user'|'support'; text: string; time: string}>>([
    { from: 'support', text: 'Welcome to support — if you are having trouble registering or logging in, please describe the issue and we will assist you.', time: '' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const sendCustomerSupportMessage = async () => {
    if (!chatInput || chatInput.trim() === '') return;
    const text = chatInput.trim();
    const userMsg = { from: 'user' as const, text, time: new Date().toISOString() };
    setChatMessages((s) => [...s, userMsg]);
    setChatInput('');

    // Try sending to server endpoint; fall back to showing contact info
    try {
      const payload = { email: formData.email || '', message: text };
      const res = await apiFetch('/api/notifications/support/', {
        method: 'POST',
        body: payload,
      });

      if (res.ok) {
        // assume server returns { reply: '...' } optionally
        const data = await res.json().catch(() => ({}));
        const reply = data.reply || 'Thanks — our support team has received your message and will contact you shortly.';
        setChatMessages((s) => [...s, { from: 'support', text: reply, time: new Date().toISOString() }]);
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      setChatMessages((s) => [...s, { from: 'support', text: 'Could not send via chat. Please email support@taxplatform.gov.ng or call +234-800-000-0000 for immediate help.', time: new Date().toISOString() }]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await apiFetch('/api/accounts/auth/login/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens in localStorage
        localStorage.setItem('access_token', data.tokens.access);
        localStorage.setItem('refresh_token', data.tokens.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Save selected state for multi-state support
        localStorage.setItem('selected_state', selectedState);
        const selectedLabel = states.find((s) => s.value === selectedState)?.label || selectedState;
        localStorage.setItem('selected_state_label', selectedLabel);

        setMessage('Login successful! Redirecting...');

        // Redirect based on user type
        setTimeout(() => {
          if (data.user.user_type === 'tax_officer' || data.user.user_type === 'admin') {
            router.push('/dashboard');
          } else {
            router.push('/taxpayer-dashboard');
          }
        }, 1000);
      } else {
        setMessage(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left - brand & features */}
        <div className="hidden lg:flex flex-col justify-center px-8">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold">PIT</span>
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900">PIT Collection System</h2>
                <p className="mt-1 text-slate-600">Powerful, secure and transparent tax collection for government agencies.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-indigo-50 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 8 4-16 3 8h4"/></svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Real-time Analytics</h4>
                <p className="text-sm text-slate-600">Monitor collections and compliance in one place.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Secure Payments</h4>
                <p className="text-sm text-slate-600">Bank-integrated deductions with audit trails.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3"/></svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Citizen Services</h4>
                <p className="text-sm text-slate-600">Access certificates, incentives, and support.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right - form */}
        <div className="mx-auto w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-slate-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-slate-900">Sign in to your account</h3>
              <p className="text-sm text-slate-600">Enter credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-2">State</label>
                <select
                  id="state"
                  name="state"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                >
                  {states.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                  placeholder="you@agency.gov"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                  placeholder="Your secure password"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-500 text-white font-semibold shadow-md hover:scale-[1.01] transition-transform disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                </button>
              </div>
            </form>

            {message && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('successful') ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                {message}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
              <a href="/register" className="text-indigo-600 hover:underline">Create account</a>
              <a href="/" className="text-slate-500 hover:underline">Back to Home</a>
            </div>
          </div>
        </div>
      </div>
      {/* Support Chat Widget */}
      <div>
        {/* Chat Panel */}
        <div className={`fixed right-6 bottom-20 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-transform ${chatOpen ? 'translate-y-0' : 'translate-y-6 opacity-0 pointer-events-none'}`} style={{ zIndex: 60 }}>
          <div className="p-3 bg-gradient-to-r from-indigo-600 to-emerald-500 text-white flex items-center justify-between">
            <div className="text-sm font-semibold">Customer Support</div>
            <button onClick={() => setChatOpen(false)} className="text-white/90 hover:text-white">Close</button>
          </div>
          <div className="p-3 h-56 overflow-auto space-y-3 bg-slate-50">
            {chatMessages.map((m, idx) => (
              <div key={idx} className={`${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`${m.from === 'user' ? 'inline-block bg-indigo-600 text-white' : 'inline-block bg-slate-200 text-slate-800'} px-3 py-2 rounded-full text-sm`}>{m.text}</div>
                <div className="text-xs text-slate-400 mt-1">{m.time ? new Date(m.time).toLocaleString() : ''}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendCustomerSupportMessage(); } }}
                placeholder="Describe your issue..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-full text-sm focus:outline-none"
              />
              <button onClick={sendCustomerSupportMessage} className="px-3 py-2 bg-indigo-600 text-white rounded-full text-sm">Send</button>
            </div>
          </div>
        </div>

        {/* Floating Toggle Button */}
        <button onClick={() => setChatOpen((s) => !s)} className="fixed right-6 bottom-6 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center" style={{ zIndex: 60 }} aria-label="Open support chat">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.326 0-2.58-.204-3.718-.57L3 20l1.57-4.282C3.65 14.574 3 13.33 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
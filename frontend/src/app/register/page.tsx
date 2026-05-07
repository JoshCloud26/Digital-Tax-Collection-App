'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';

interface FormData {
  nin: string;
  bvn: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  password: string;
  password_confirm: string;
  sector: string;
  location: string;
  monthly_income: string;
  bank_account_number: string;
  bank_name: string;
  state: string;
  deduction_day: string;
  home_address: string;
  business_address: string;
  business_state: string;
  next_of_kin_phone: string;
  next_of_kin_address: string;
}

export default function Register() {
  const [formData, setFormData] = useState<FormData>({
    nin: '',
    bvn: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    password: '',
    password_confirm: '',
    sector: '',
    location: '',
    monthly_income: '',
    bank_account_number: '',
    bank_name: '',
    state: 'fct',
    deduction_day: '10',
    home_address: '',
    business_address: '',
    business_state: 'fct',
    next_of_kin_phone: '',
    next_of_kin_address: '',
  });

  const [usePersonalState, setUsePersonalState] = useState<boolean>(false);

  // Keep business_state in sync with personal state while the toggle is enabled
  useEffect(() => {
    if (usePersonalState) {
      setFormData((f) => ({ ...f, business_state: f.state }));
    }
  }, [formData.state, usePersonalState]);

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

  const deductionDays = Array.from({ length: 28 }, (_, i) => i + 1);

  const [selectedStateLabel, setSelectedStateLabel] = useState<string>('Your State');

  // Minimal fallback LGAs (only used if the backend LGA endpoint is unreachable).
  const FALLBACK_LGAS: { value: string; label: string }[] = [
    { value: 'other', label: 'Other' },
  ];

  const [lgas, setLgas] = useState<{ value: string; label: string }[]>([]);
  const [lgasLoading, setLgasLoading] = useState<boolean>(false);

  // Clear previously selected location when business state changes
  useEffect(() => {
    setFormData((f) => ({ ...f, location: '' }));

    // Fetch LGAs for the selected business state from backend API, fallback to local map
    const stateCode = formData.business_state;
    setLgasLoading(true);
    apiFetch(`/api/accounts/locations/lgas/?state=${stateCode}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLgas(data as { value: string; label: string }[]);
        } else {
          setLgas(FALLBACK_LGAS);
        }
      })
      .catch(() => {
        setLgas(FALLBACK_LGAS);
      })
      .finally(() => setLgasLoading(false));
  }, [formData.business_state]);

  useEffect(() => {
    try {
      const label = localStorage.getItem('selected_state_label') || 'Your State';
      setSelectedStateLabel(label);
    } catch (e) {}
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const response = await apiFetch('/api/accounts/taxpayers/register/', {
        method: 'POST',
        body: {
          ...formData,
          monthly_income: parseFloat(formData.monthly_income),
          deduction_day: parseInt(formData.deduction_day as any, 10),
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Registration successful! Your Taxpayer ID is: ${data.taxpayer_id}`);
        // Persist selected state for subsequent pages
        try {
          localStorage.setItem('selected_state', formData.state);
          const label = states.find((s) => s.value === formData.state)?.label || formData.state;
          localStorage.setItem('selected_state_label', label);
        } catch (e) {
          // ignore if running server-side
        }

        setFormData({
          nin: '',
          bvn: '',
          first_name: '',
          last_name: '',
          phone_number: '',
          email: '',
          password: '',
          password_confirm: '',
          sector: '',
          location: '',
          monthly_income: '',
          bank_account_number: '',
          bank_name: '',
          state: 'fct',
          deduction_day: '10',
          home_address: '',
          business_address: '',
          business_state: 'fct',
          next_of_kin_phone: '',
          next_of_kin_address: '',
        });
        setCurrentStep(1);
      } else {
        setMessage('Registration failed. Please check your information and try again.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PIT</span>
                </div>
                <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  {selectedStateLabel} Tax System
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Home
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-green-600 px-8 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Taxpayer Registration
              </h1>
              <p className="text-blue-100">
                Join the digital tax revolution in {selectedStateLabel}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-center space-x-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step <= currentStep
                          ? 'bg-white text-blue-600'
                          : 'bg-blue-200 text-blue-600'
                      }`}
                    >
                      {step}
                    </div>
                    {step < 3 && (
                      <div
                        className={`w-12 h-1 mx-2 ${
                          step < currentStep ? 'bg-white' : 'bg-blue-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-2 space-x-16 text-xs text-blue-100">
                <span>Personal Info</span>
                <span>Business Info</span>
                <span>Bank Details</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Personal Information
                  </h2>
                  <p className="text-gray-600">
                    Please provide your identification details
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="nin" className="block text-sm font-semibold text-gray-700">
                      NIN (National Identification Number) *
                    </label>
                    <input
                      type="text"
                      name="nin"
                      id="nin"
                      required
                      maxLength={11}
                      value={formData.nin}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter 11-digit NIN"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="bvn" className="block text-sm font-semibold text-gray-700">
                      BVN (Bank Verification Number) *
                    </label>
                    <input
                      type="text"
                      name="bvn"
                      id="bvn"
                      required
                      maxLength={11}
                      value={formData.bvn}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter 11-digit BVN"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      id="first_name"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      id="last_name"
                      required
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    id="phone_number"
                    required
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <label htmlFor="state" className="block text-sm font-semibold text-gray-700">State *</label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      {states.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="deduction_day" className="block text-sm font-semibold text-gray-700">Preferred Deduction Day (monthly)</label>
                    <select
                      id="deduction_day"
                      name="deduction_day"
                      value={formData.deduction_day}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                      {deductionDays.map((d) => (
                        <option key={d} value={String(d)}>{d}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-500">Choose a day between 1 and 28 for monthly deductions.</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter email address (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="home_address" className="block text-sm font-semibold text-gray-700">Home Address</label>
                  <textarea
                    id="home_address"
                    name="home_address"
                    value={formData.home_address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your home/residential address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="next_of_kin_phone" className="block text-sm font-semibold text-gray-700">Next of Kin Phone</label>
                    <input
                      type="tel"
                      id="next_of_kin_phone"
                      name="next_of_kin_phone"
                      value={formData.next_of_kin_phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter next of kin phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="next_of_kin_address" className="block text-sm font-semibold text-gray-700">Next of Kin Address</label>
                    <input
                      type="text"
                      id="next_of_kin_address"
                      name="next_of_kin_address"
                      value={formData.next_of_kin_address}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Next of kin's address"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Business Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Business Information
                  </h2>
                  <p className="text-gray-600">
                    Tell us about your business sector and location
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="sector" className="block text-sm font-semibold text-gray-700">
                      Business Sector *
                    </label>
                    <select
                      name="sector"
                      id="sector"
                      required
                      value={formData.sector}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select your sector</option>
                      <option value="barber">Barber</option>
                      <option value="hairdresser">Hairdresser</option>
                      <option value="driver">Uber Driver</option>
                      <option value="artisan">Artisan</option>
                      <option value="trader">Trader</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="location" className="block text-sm font-semibold text-gray-700">
                      Location *
                    </label>
                    <select
                      name="location"
                      id="location"
                      required
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select your location</option>
                      {lgasLoading ? (
                        <option disabled>Loading...</option>
                      ) : lgas.length > 0 ? (
                        lgas.map((lg) => (
                          <option key={lg.value} value={lg.value}>{lg.label}</option>
                        ))
                      ) : (
                        <>
                          <option value="other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <input type="checkbox" id="use_personal_state" checked={usePersonalState} onChange={(e) => setUsePersonalState(e.target.checked)} className="h-4 w-4" />
                    <label htmlFor="use_personal_state" className="text-sm text-gray-700">Use personal state for business</label>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="business_state" className="block text-sm font-semibold text-gray-700">Business State</label>
                      <select
                        id="business_state"
                        name="business_state"
                        value={formData.business_state}
                        onChange={handleChange}
                        disabled={usePersonalState}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                      >
                        {states.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="business_address" className="block text-sm font-semibold text-gray-700">Business Address</label>
                      <input
                        type="text"
                        id="business_address"
                        name="business_address"
                        value={formData.business_address}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your business address"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="monthly_income" className="block text-sm font-semibold text-gray-700">
                    Monthly Income (₦) *
                  </label>
                  <input
                    type="number"
                    name="monthly_income"
                    id="monthly_income"
                    required
                    min="0"
                    step="0.01"
                    value={formData.monthly_income}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your monthly income"
                  />
                  <p className="text-sm text-gray-500">
                    This will be used to calculate your monthly PIT (5% of income)
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Bank Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Bank Account Details
                  </h2>
                  <p className="text-gray-600">
                    Provide your bank details for automatic PIT deductions
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Automatic Deductions
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        PIT will be automatically deducted from this account on the 10th of each month.
                        You'll receive SMS notifications for all transactions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="bank_account_number" className="block text-sm font-semibold text-gray-700">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      name="bank_account_number"
                      id="bank_account_number"
                      required
                      maxLength={10}
                      value={formData.bank_account_number}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter 10-digit account number"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="bank_name" className="block text-sm font-semibold text-gray-700">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      id="bank_name"
                      required
                      value={formData.bank_name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter bank name"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  Previous
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="ml-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registering...
                    </div>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Success/Error Messages */}
          {message && (
            <div className={`mx-8 mb-8 p-4 rounded-lg ${
              message.includes('successful')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {message.includes('successful') ? (
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

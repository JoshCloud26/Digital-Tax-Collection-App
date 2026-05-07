'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/api';

interface DashboardData {
  total_taxpayers: number;
  verified_taxpayers: number;
  active_users: number;
  non_compliant_users: number;
  successful_payments: number;
  failed_payments: number;
  total_revenue: number;
  total_service_fees: number;
  compliance_rate: number;
  top_performing_lga: string | null;
  low_compliance_alerts: Array<{
    location: string;
    compliance_rate: number;
  }>;
}

interface SectorData {
  sector: string;
  total_taxpayers: number;
  total_revenue: number;
  average_income: number;
}

interface LocationData {
  location: string;
  total_taxpayers: number;
  total_revenue: number;
}

interface Transaction {
  id: number;
  transaction_type: string;
  amount: number;
  reference: string;
  description: string;
  timestamp: string;
  taxpayer_name: string;
}

interface TaxpayerDetail {
  id: number;
  taxpayer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  sector: string;
  location: string;
  monthly_income: number;
  status: string;
  compliance_score: number;
  is_verified: boolean;
  registration_date: string;
  last_payment_date: string | null;
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const states = [
    { value: 'all', label: 'All Nigeria' }, { value: 'abia', label: 'Abia' }, { value: 'adamawa', label: 'Adamawa' },
    { value: 'akwa_ibom', label: 'Akwa Ibom' }, { value: 'anambra', label: 'Anambra' }, { value: 'bauchi', label: 'Bauchi' },
    { value: 'bayelsa', label: 'Bayelsa' }, { value: 'benue', label: 'Benue' }, { value: 'borno', label: 'Borno' },
    { value: 'cross_river', label: 'Cross River' }, { value: 'delta', label: 'Delta' }, { value: 'ebonyi', label: 'Ebonyi' },
    { value: 'edo', label: 'Edo' }, { value: 'ekiti', label: 'Ekiti' }, { value: 'enugu', label: 'Enugu' },
    { value: 'gombe', label: 'Gombe' }, { value: 'imo', label: 'Imo' }, { value: 'jigawa', label: 'Jigawa' },
    { value: 'kaduna', label: 'Kaduna' }, { value: 'kano', label: 'Kano' }, { value: 'katsina', label: 'Katsina' },
    { value: 'kebbi', label: 'Kebbi' }, { value: 'kogi', label: 'Kogi' }, { value: 'kwara', label: 'Kwara' },
    { value: 'lagos', label: 'Lagos' }, { value: 'nasarawa', label: 'Nasarawa' }, { value: 'niger', label: 'Niger' },
    { value: 'ogun', label: 'Ogun' }, { value: 'ondo', label: 'Ondo' }, { value: 'osun', label: 'Osun' },
    { value: 'oyo', label: 'Oyo' }, { value: 'plateau', label: 'Plateau' }, { value: 'rivers', label: 'Rivers' },
    { value: 'sokoto', label: 'Sokoto' }, { value: 'taraba', label: 'Taraba' }, { value: 'yobe', label: 'Yobe' },
    { value: 'zamfara', label: 'Zamfara' }, { value: 'fct', label: 'FCT - Abuja' },
  ];

  const [selectedState, setSelectedState] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('selected_state') || 'all';
    return 'all';
  });

  // Persist selected state
  useEffect(() => {
    try {
      localStorage.setItem('selected_state', selectedState);
      const label = states.find((s) => s.value === selectedState)?.label || selectedState;
      localStorage.setItem('selected_state_label', label);
    } catch (e) {
      // ignore server-side
    }
  }, [selectedState]);

  const displayStateName = (slug: string) => {
    if (!slug || slug === 'all') return 'Nigeria';
    return slug.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }
  const [taxpayerDetails, setTaxpayerDetails] = useState<TaxpayerDetail[]>([]);
  const [selectedView, setSelectedView] = useState<'overview' | 'taxpayers' | 'transactions' | 'deductions'>('overview');
  const [selectedFilter, setSelectedFilter] = useState<{status?: string, sector?: string, location?: string, state?: string}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedState]);

  const fetchDashboardData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedState && selectedState !== 'all') params.append('state', selectedState);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [summaryRes, sectorsRes, locationsRes, transactionsRes] = await Promise.all([
        apiFetch(`/api/dashboard/dashboard/${qs}`),
        apiFetch(`/api/dashboard/dashboard/sectors/${qs}`),
        apiFetch(`/api/dashboard/dashboard/locations/${qs}`),
        apiFetch(`/api/dashboard/dashboard/transactions/${qs}`),
      ]);

      const summary = await summaryRes.json();
      const sectors = await sectorsRes.json();
      const locations = await locationsRes.json();
      const transactions = await transactionsRes.json();

      setDashboardData(summary);
      setSectorData(sectors);
      setLocationData(locations);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxpayerDetails = async (filter: {status?: string, sector?: string, location?: string} = {}) => {
    try {
      const params = new URLSearchParams();
      if (filter.status && filter.status !== 'all') params.append('status', filter.status);
      if (filter.sector && filter.sector !== 'all') params.append('sector', filter.sector);
      if (filter.location && filter.location !== 'all') params.append('location', filter.location);
      if (selectedState && selectedState !== 'all') params.append('state', selectedState);

      const response = await apiFetch(`/api/accounts/dashboard/?${params}`);
      const data = await response.json();
      const list = data && typeof data === 'object' && 'results' in data ? data.results : data;
      setTaxpayerDetails(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching taxpayer details:', error);
    }
  };
  
  const [deductions, setDeductions] = useState<any[]>([]);

  const fetchDeductions = async (status?: string) => {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (selectedState && selectedState !== 'all') params.append('state', selectedState);
      const res = await apiFetch(`/api/payments/deductions/?${params}`);
      const data = await res.json();
      const list = data && typeof data === 'object' && 'results' in data ? data.results : data;
      setDeductions(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching deductions:', error);
    }
  };

  const handleViewChange = (view: 'overview' | 'taxpayers' | 'transactions' | 'deductions') => {
    setSelectedView(view);
    if (view === 'taxpayers') {
      fetchTaxpayerDetails();
    }
    if (view === 'transactions') {
      // transactions already loaded by fetchDashboardData, but refresh if needed
      fetchDashboardData();
    }
    if (view === 'deductions') {
      fetchDeductions();
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilter = { ...selectedFilter, [filterType]: value };
    setSelectedFilter(newFilter);
    if (selectedView === 'taxpayers') {
      fetchTaxpayerDetails(newFilter);
    }
  };

  // Helpers to show details when tiles are clicked
  const showTaxpayers = (status?: string, location?: string) => {
    setSelectedView('taxpayers');
    const filter: {status?: string; location?: string; state?: string} = {};
    if (status) filter.status = status;
    if (location) filter.location = location;
    // include state in the filter for multi-state support
    if (selectedState && selectedState !== 'all') filter.state = selectedState;
    setSelectedFilter(filter);
    fetchTaxpayerDetails(filter);
  };

  const showCompliantTaxpayers = async (threshold = 75) => {
    setSelectedView('taxpayers');
    setSelectedFilter({});
    try {
      // fetch a page of taxpayers then filter by compliance_score
      const params = new URLSearchParams();
      params.append('page_size', '100');
      if (selectedState && selectedState !== 'all') params.append('state', selectedState);
      const res = await apiFetch(`/api/accounts/dashboard/?${params}`);
      const data = await res.json();
      const list = data && typeof data === 'object' && 'results' in data ? data.results : data;
      const arr = Array.isArray(list) ? list : [];
      const filtered = arr.filter((t: any) => Number(t.compliance_score) >= threshold);
      setTaxpayerDetails(filtered);
    } catch (err) {
      console.error('Error fetching compliant taxpayers', err);
      setTaxpayerDetails([]);
    }
  };

  const showDeductions = (status?: string) => {
    setSelectedView('deductions');
    fetchDeductions(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">Fetching real-time tax collection data...</p>
        </div>
      </div>
    );
  }

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
                  Government Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">PIT Collection Dashboard</h1>
                    <p className="text-blue-100 text-lg">Real-time monitoring and analytics for {displayStateName(selectedState)}</p>
                  </div>
                  <div className="ml-4">
                    <label className="sr-only">Select state</label>
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState((e.target as HTMLSelectElement).value)}
                      className="rounded-md border border-white/30 bg-white/10 text-black px-3 py-2 text-sm"
                    >
                      {states.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
      
              {/* Full detail view for selected metric */}
              {selectedView !== 'overview' && (
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{selectedView === 'taxpayers' ? 'Taxpayers' : selectedView === 'transactions' ? 'Transactions' : 'Deductions'} Details</h3>
                      <button onClick={() => setSelectedView('overview')} className="text-sm text-gray-600 hover:text-gray-900">Close</button>
                    </div>

                    {selectedView === 'taxpayers' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Taxpayer ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Payment</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {taxpayerDetails.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No taxpayers found for the selected filter.</td>
                              </tr>
                            ) : (
                              taxpayerDetails.map((t) => (
                                <tr key={t.id}>
                                  <td className="px-4 py-2 text-sm text-gray-700">{t.taxpayer_id}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{t.first_name} {t.last_name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{t.email}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{t.status}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{t.location}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{t.last_payment_date || 'N/A'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {selectedView === 'transactions' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Taxpayer</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {recentTransactions.map((tr) => (
                              <tr key={tr.id}>
                                <td className="px-4 py-2 text-sm text-gray-700">{tr.reference}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{tr.transaction_type}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{tr.taxpayer_name}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">₦{tr.amount.toLocaleString()}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{new Date(tr.timestamp).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {selectedView === 'deductions' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Taxpayer</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service Fee</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Processed At</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {deductions.map((d) => (
                              <tr key={d.id}>
                                <td className="px-4 py-2 text-sm text-gray-700">{d.id}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{d.calculation?.taxpayer || d.calculation?.taxpayer_name || d.id}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">₦{Number(d.amount_deducted).toLocaleString()}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">₦{Number(d.service_fee_deducted).toLocaleString()}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{d.status}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{d.processed_at || d.deduction_date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        {dashboardData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Taxpayers */}
              <div role="button" onClick={() => showTaxpayers('all')} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Taxpayers</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData.total_taxpayers.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Users */}
              <div role="button" onClick={() => showTaxpayers('active')} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData.active_users.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Successful Payments */}
              <div role="button" onClick={() => showDeductions('successful')} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-emerald-100 rounded-lg">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Successful Payments</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData.successful_payments.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Failed Payments */}
              <div role="button" onClick={() => showDeductions('failed')} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Failed Payments</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData.failed_payments.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Compliance Rate */}
              <div role="button" onClick={() => showCompliantTaxpayers(75)} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData.compliance_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Performing LGA */}
              <div role="button" onClick={() => showTaxpayers(undefined, dashboardData?.top_performing_lga || undefined)} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Top Performing LGA</p>
                      <p className="text-2xl font-bold text-gray-900 capitalize">{dashboardData.top_performing_lga || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Non-compliant Users */}
              <div role="button" onClick={() => showTaxpayers('non_compliant')} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Non-compliant Users</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData.non_compliant_users.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Low Compliance Alerts */}
            {dashboardData.low_compliance_alerts && dashboardData.low_compliance_alerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Low Compliance Alert
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>The following LGAs have compliance rates below 50%:</p>
                      <ul className="mt-2 list-disc list-inside">
                        {dashboardData.low_compliance_alerts.map((alert, index) => (
                          <li key={index} className="capitalize">
                            {alert.location}: {alert.compliance_rate.toFixed(1)}%
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sector Breakdown */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Revenue by Sector
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {sectorData.map((sector, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-white font-semibold text-sm capitalize">
                          {sector.sector.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{sector.sector}</p>
                        <p className="text-sm text-gray-600">{sector.total_taxpayers} taxpayers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₦{sector.total_revenue?.toLocaleString() || '0'}</p>
                      <p className="text-sm text-gray-600">Avg: ₦{sector.average_income?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Transactions
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                        transaction.transaction_type === 'pit_deduction' ? 'bg-red-100' :
                        transaction.transaction_type === 'service_fee' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-sm font-semibold ${
                          transaction.transaction_type === 'pit_deduction' ? 'text-red-600' :
                          transaction.transaction_type === 'service_fee' ? 'text-yellow-600' : 'text-blue-600'
                        }`}>
                          {transaction.transaction_type === 'pit_deduction' ? 'PIT' :
                           transaction.transaction_type === 'service_fee' ? 'FEE' : 'REF'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {transaction.transaction_type.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-600">{transaction.taxpayer_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.transaction_type === 'pit_deduction' ? 'text-red-600' :
                        transaction.transaction_type === 'service_fee' ? 'text-yellow-600' : 'text-blue-600'
                      }`}>
                        ₦{transaction.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Service Fee Information */}
        <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Service Fee Transparency
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  All transactions include a 1% service fee that supports the maintenance and operation of the tax collection system.
                  Total service fees collected: <span className="font-semibold">₦{dashboardData?.total_service_fees.toLocaleString()}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

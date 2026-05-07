'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  phone_number: string;
  is_verified: boolean;
}

interface TaxPayer {
  id?: number;
  taxpayer_id: string;
  nin?: string;
  bvn?: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email: string;
  sector?: string;
  location?: string;
  monthly_income?: number;
  bank_account_number?: string;
  bank_name?: string;
  is_verified: boolean;
  registration_date?: string;
  home_address?: string | null;
  business_address?: string | null;
  business_state?: string | null;
  next_of_kin_phone?: string | null;
  next_of_kin_address?: string | null;
}

interface Transaction {
  id: number;
  transaction_type: string;
  amount: number;
  reference: string;
  description: string;
  timestamp: string;
}

interface AnnualReconciliation {
  id: number;
  year: number;
  total_pit_paid: number;
  total_service_fees: number;
  expected_annual_pit: number;
  adjustment_amount: number;
  status: string;
  compliance_certificate_issued: boolean;
  certificate_number: string;
  processed_at: string;
}

interface ComplianceIncentive {
  id: number;
  incentive_type: string;
  incentive_type_display: string;
  year: number;
  is_eligible: boolean;
  granted_at: string;
  description: string;
}

export default function TaxpayerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [taxpayer, setTaxpayer] = useState<TaxPayer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editLgas, setEditLgas] = useState<{ value: string; label: string }[]>([]);
  const [editLgasLoading, setEditLgasLoading] = useState(false);
  const router = useRouter();

  const STATES = [
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

  const FALLBACK_LGAS = [{ value: 'other', label: 'Other' }];

  const openEditProfile = () => {
    if (!taxpayer) return;
    // Prefill form with taxpayer data
    setEditForm({
      id: taxpayer.id,
      first_name: taxpayer.first_name,
      last_name: taxpayer.last_name,
      phone_number: taxpayer.phone_number || 'N/A',
      email: taxpayer.email || 'N/A',
      home_address: taxpayer.home_address || 'N/A',
      business_address: taxpayer.business_address || 'N/A',
      business_state: taxpayer.business_state || 'N/A',
      location: taxpayer.location || '',
      next_of_kin_phone: (taxpayer as any).next_of_kin_phone || '',
      next_of_kin_address: (taxpayer as any).next_of_kin_address || '',
    });
    setIsEditing(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const stateCode = editForm.business_state;
    if (!stateCode) {
      setEditLgas(FALLBACK_LGAS);
      return;
    }
    setEditLgasLoading(true);
    apiFetch(`/api/accounts/locations/lgas/?state=${stateCode}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setEditLgas(data as any);
        else setEditLgas(FALLBACK_LGAS);
      })
      .catch(() => setEditLgas(FALLBACK_LGAS))
      .finally(() => setEditLgasLoading(false));
  }, [editForm.business_state]);

  const submitEditForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      router.push('/login');
      return;
    }

    try {
      const resp = await apiFetch(`/api/accounts/taxpayers/${editForm.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: editForm,
      });

      if (resp.ok) {
        const updated = await resp.json();
        setTaxpayer(updated as TaxPayer);
        setIsEditing(false);
      } else {
        console.error('Update failed', resp.status);
      }
    } catch (err) {
      console.error('Update error', err);
    }
  };

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const accessToken = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (!accessToken || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Load taxpayer profile
      const profileResponse = await apiFetch('/api/accounts/taxpayers/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (profileResponse.ok) {
        const taxpayers = await profileResponse.json();
        // Handle both paginated and non-paginated responses
        const taxpayerList = taxpayers.results || taxpayers;
        // Find the taxpayer that matches the user's email
        const userTaxpayer = taxpayerList.find((t: any) => t.email === parsedUser.email);
        if (userTaxpayer) {
          setTaxpayer(userTaxpayer);
        } else {
          console.log('Taxpayer not found for user:', parsedUser.email, 'Available taxpayers:', taxpayerList);
        }
      } else {
        console.log('Failed to load taxpayer profile:', profileResponse.status);
      }

      // Load transactions if we have taxpayer data
      if (parsedUser.email) {
        const transactionsResponse = await apiFetch(`/api/payments/transactions/by_taxpayer/?taxpayer_id=${parsedUser.email}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (transactionsResponse.ok) {
          const data = await transactionsResponse.json();
          setTransactions(data);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      // If there's an auth error, redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');

    try {
      await apiFetch('/api/accounts/auth/logout/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: { refresh_token: refreshToken },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/');
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
          <p className="text-gray-600">Fetching your tax information...</p>
        </div>
      </div>
    );
  }

  if (!user || !taxpayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">You need to be logged in as a taxpayer to access this page.</p>
          <a
            href="/login"
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-200"
          >
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">PIT</div>
              <div>
                <div className="text-lg font-semibold text-slate-900">Taxpayer Dashboard</div>
                <div className="text-xs text-slate-500">Manage your profile, payments and incentives</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-700">{user.first_name} {user.last_name}</div>
              <button onClick={handleLogout} className="px-3 py-2 rounded-md text-sm bg-red-50 text-red-600 hover:bg-red-100">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 flex items-center justify-center text-white text-xl font-bold">{taxpayer.first_name.charAt(0)}</div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">{taxpayer.first_name} {taxpayer.last_name}</div>
                  <div className="text-sm text-slate-500">Taxpayer ID: <span className="font-medium text-slate-700">{taxpayer.taxpayer_id}</span></div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="text-sm text-slate-500">Email</div>
                <div className="text-sm text-slate-900">{taxpayer.email}</div>

                <div className="text-sm text-slate-500 mt-3">Phone</div>
                <div className="text-sm text-slate-900">{taxpayer.phone_number}</div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                            <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">View Certificates</button>
                            <button onClick={() => openEditProfile()} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">Update Profile</button>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white rounded-2xl shadow p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Account Status</h3>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${taxpayer.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{taxpayer.is_verified ? 'Verified' : 'Pending Verification'}</div>
              <div className="mt-4 text-sm text-slate-600">Location: <span className="font-medium text-slate-800 capitalize">{taxpayer.location}</span></div>
              <div className="mt-2 text-sm text-slate-600">Sector: <span className="font-medium text-slate-800 capitalize">{taxpayer.sector}</span></div>
            </div>
          </aside>

          <section className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow p-5 flex flex-col">
                <div className="text-sm text-slate-500">Monthly PIT Due</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">₦{((taxpayer.monthly_income ?? 0) * 0.05).toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-auto">(5% of income)</div>
              </div>

              <div className="bg-white rounded-2xl shadow p-5 flex flex-col">
                <div className="text-sm text-slate-500">Service Fee</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">₦{(((taxpayer.monthly_income ?? 0) * 0.05) * 0.01).toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-auto">(1% of PIT)</div>
              </div>

              <div className="bg-white rounded-2xl shadow p-5 flex flex-col">
                <div className="text-sm text-slate-500">Total Deduction</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">₦{(((taxpayer.monthly_income ?? 0) * 0.05) * 1.01).toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-auto">Next deduction: 10th of month</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h3>
              {transactions.length > 0 ? (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-500 text-xs uppercase">
                      <tr>
                        <th className="p-2 text-left">Ref</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {transactions.slice(0, 10).map((tx) => (
                        <tr key={tx.id} className="border-t border-slate-100">
                          <td className="p-2">{tx.reference}</td>
                          <td className="p-2 capitalize">{tx.transaction_type.replace('_', ' ')}</td>
                          <td className="p-2 text-right">₦{tx.amount.toLocaleString()}</td>
                          <td className="p-2 text-right">{new Date(tx.timestamp).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">No transactions yet</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow p-6">
                <h4 className="font-semibold text-slate-900 mb-3">Year-End Reconciliation</h4>
                <p className="text-sm text-slate-600">Annual reconciliation will run at year-end. Compliant taxpayers receive certificates and incentives.</p>
              </div>

              <div className="bg-white rounded-2xl shadow p-6">
                <h4 className="font-semibold text-slate-900 mb-3">Compliance Incentives</h4>
                <p className="text-sm text-slate-600">Compliant taxpayers gain access to loans, grants and cooperative benefits.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>

            <form onSubmit={(e) => submitEditForm(e)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700">First Name</label>
                  <input name="first_name" value={editForm.first_name || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700">Last Name</label>
                  <input name="last_name" value={editForm.last_name || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700">Phone</label>
                  <input name="phone_number" value={editForm.phone_number || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700">Email</label>
                  <input name="email" value={editForm.email || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-700">Home Address</label>
                <textarea name="home_address" value={editForm.home_address || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded" />
              </div>

              <div>
                <label className="block text-sm text-slate-700">Business Address</label>
                <textarea name="business_address" value={editForm.business_address || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700">Business State</label>
                  <select name="business_state" value={editForm.business_state || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded">
                    <option value="">Select state</option>
                    {STATES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-700">Location (LGA)</label>
                  <select name="location" value={editForm.location || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded">
                    <option value="">Select location</option>
                    {editLgasLoading ? (
                      <option>Loading...</option>
                    ) : (
                      editLgas.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700">Next of Kin Phone</label>
                  <input name="next_of_kin_phone" value={editForm.next_of_kin_phone || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700">Next of Kin Address</label>
                  <input name="next_of_kin_address" value={editForm.next_of_kin_address || ''} onChange={handleEditChange} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

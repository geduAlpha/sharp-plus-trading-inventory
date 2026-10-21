import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  UserX,
  X,
  Save,
  Server,
  Zap,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function DeveloperConsole() {
  const { user, isDeveloper } = useAuth();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Drawers
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyStaff, setCompanyStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  // Form states
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });

  const [newCompany, setNewCompany] = useState({
    name: '',
    tradeName: '',
    systemEmail: '',
    phone: '',
    address: '',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    tinNumber: '',
    currency: 'ETB',
    taxRate: 15,
    maxUsers: 50,
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPhone: '',
    notes: '',
  });

  const [editCompanyForm, setEditCompanyForm] = useState(null);

  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    role: 'storekeeper',
    phone: '',
  });

  const showToast = (text, type = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage({ type: '', text: '' }), 4500);
  };

  // Fetch all companies
  const fetchCompanies = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/companies');
      setCompanies(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load companies', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch staff for selected company
  const fetchStaffForCompany = async (companyId) => {
    setStaffLoading(true);
    try {
      const res = await api.get(`/companies/${companyId}/staff`);
      setCompanyStaff(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load company staff', 'error');
    } finally {
      setStaffLoading(false);
    }
  };

  // Toggle Company Access (Give Access / Deny Access)
  const handleToggleCompanyAccess = async (company) => {
    const nextAccess = !company.accessGranted;
    setActionLoading(true);
    try {
      const res = await api.put(`/companies/${company._id}/access`, {
        accessGranted: nextAccess,
        accessNotes: nextAccess
          ? `Access granted by Developer ${user?.name || ''}`
          : `Access suspended by Developer ${user?.name || ''}`,
      });
      showToast(
        nextAccess
          ? `Access granted for "${company.name}". Staff can now access the system.`
          : `Access suspended for "${company.name}". Staff access blocked.`,
        nextAccess ? 'success' : 'warning'
      );
      // Update local state
      setCompanies((prev) =>
        prev.map((c) => (c._id === company._id ? { ...c, ...res.data.company } : c))
      );
      if (selectedCompany?._id === company._id) {
        setSelectedCompany((prev) => ({ ...prev, ...res.data.company }));
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update company access', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open staff modal
  const handleOpenStaffModal = (company) => {
    setSelectedCompany(company);
    setShowStaffModal(true);
    fetchStaffForCompany(company._id);
  };

  // Toggle Staff Member Access (Give Access / Deny Access)
  const handleToggleStaffAccess = async (staffMember) => {
    if (!selectedCompany) return;
    const nextActive = !staffMember.isActive;
    setActionLoading(true);
    try {
      const res = await api.put(
        `/companies/${selectedCompany._id}/staff/${staffMember._id}`,
        { isActive: nextActive }
      );
      showToast(
        nextActive
          ? `Access granted for staff "${staffMember.name}".`
          : `Access denied for staff "${staffMember.name}".`,
        nextActive ? 'success' : 'warning'
      );
      setCompanyStaff((prev) =>
        prev.map((s) => (s._id === staffMember._id ? { ...s, ...res.data } : s))
      );
      fetchCompanies(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update staff access', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Change staff role
  const handleStaffRoleChange = async (staffMember, newRole) => {
    if (!selectedCompany) return;
    setActionLoading(true);
    try {
      const res = await api.put(
        `/companies/${selectedCompany._id}/staff/${staffMember._id}`,
        { role: newRole }
      );
      showToast(`Role for "${staffMember.name}" changed to ${newRole.toUpperCase()}.`);
      setCompanyStaff((prev) =>
        prev.map((s) => (s._id === staffMember._id ? { ...s, ...res.data } : s))
      );
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change staff role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create new staff member
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setActionLoading(true);
    try {
      await api.post(`/companies/${selectedCompany._id}/staff`, newStaff);
      showToast(`Staff member "${newStaff.name}" added to ${selectedCompany.name}.`);
      setShowAddStaffModal(false);
      setNewStaff({ name: '', email: '', password: '', role: 'storekeeper', phone: '' });
      fetchStaffForCompany(selectedCompany._id);
      fetchCompanies(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create staff member', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create new company
  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/companies', newCompany);
      showToast(`Company "${res.data.name}" created and provisioned successfully!`);
      setShowCreateCompanyModal(false);
      setNewCompany({
        name: '',
        tradeName: '',
        systemEmail: '',
        phone: '',
        address: '',
        city: 'Addis Ababa',
        country: 'Ethiopia',
        tinNumber: '',
        currency: 'ETB',
        taxRate: 15,
        maxUsers: 50,
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        ownerPhone: '',
        notes: '',
      });
      fetchCompanies(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create company', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const handleOpenEditCompany = (company) => {
    setEditCompanyForm({ ...company });
    setShowEditCompanyModal(true);
  };

  // Save edit company
  const handleSaveEditCompany = async (e) => {
    e.preventDefault();
    if (!editCompanyForm) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/companies/${editCompanyForm._id}`, editCompanyForm);
      showToast(`Company "${res.data.name}" updated successfully.`);
      setShowEditCompanyModal(false);
      setCompanies((prev) =>
        prev.map((c) => (c._id === res.data._id ? { ...c, ...res.data } : c))
      );
      if (selectedCompany?._id === res.data._id) {
        setSelectedCompany((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update company', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(search.toLowerCase())) ||
        (c.ownerName && c.ownerName.toLowerCase().includes(search.toLowerCase())) ||
        (c.ownerEmail && c.ownerEmail.toLowerCase().includes(search.toLowerCase())) ||
        (c.tinNumber && c.tinNumber.includes(search));

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'granted'
          ? c.accessGranted === true
          : c.accessGranted === false;

      return matchSearch && matchStatus;
    });
  }, [companies, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = companies.length;
    const granted = companies.filter((c) => c.accessGranted).length;
    const suspended = total - granted;
    const totalStaff = companies.reduce((acc, c) => acc + (c.staffCount || 0), 0);
    return { total, granted, suspended, totalStaff };
  }, [companies]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage.text && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : toastMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
          ) : toastMessage.type === 'warning' ? (
            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage({ type: '', text: '' })}
            className="ml-2 text-slate-400 hover:text-slate-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Banner / System Owner Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase">
              <Zap size={13} className="text-blue-400" />
              <span>System Developer &amp; Platform Owner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Multi-Company &amp; Staff Access Governance
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              As the System Developer and Owner, you have complete authority to provision companies,
              grant or deny tenant access, and oversee all staff accounts across the entire ecosystem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchCompanies(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700/80 shadow transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <button
              onClick={() => setShowCreateCompanyModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              <Plus size={15} />
              <span>Provision New Company</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Companies</p>
            <h3 className="text-2xl font-black text-slate-900">{stats.total}</h3>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Granted</p>
            <h3 className="text-2xl font-black text-emerald-600">{stats.granted}</h3>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Suspended</p>
            <h3 className="text-2xl font-black text-rose-600">{stats.suspended}</h3>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staff Members</p>
            <h3 className="text-2xl font-black text-indigo-600">{stats.totalStaff}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company name, owner, TIN, or email..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          {['all', 'granted', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition capitalize ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'granted' ? 'Access Granted' : st === 'suspended' ? 'Access Denied' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Companies List / Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 size={16} className="text-blue-600" />
            <span>Registered Companies ({filteredCompanies.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Click Give / Deny Access to toggle platform access in real time
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span>Loading company directory...</span>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
            <Building2 size={36} className="text-slate-300" />
            <p className="font-bold text-slate-700">No companies found</p>
            <p className="text-xs text-slate-400">
              No registered companies match your filter or search criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCompanies.map((comp) => {
              const isGranted = comp.accessGranted !== false && comp.status !== 'suspended';
              return (
                <div
                  key={comp._id}
                  className={`p-5 transition hover:bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    !isGranted ? 'bg-rose-50/20' : ''
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0 uppercase">
                      {comp.logo ? (
                        <img
                          src={comp.logo}
                          alt={comp.name}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        comp.name.slice(0, 2)
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base">{comp.name}</h3>
                        {comp.tradeName && comp.tradeName !== comp.name && (
                          <span className="text-xs text-slate-500 font-medium">({comp.tradeName})</span>
                        )}
                        {comp.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                            Primary Root
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isGranted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isGranted ? (
                            <>
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>Access Granted</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={12} className="text-rose-600" />
                              <span>Access Denied (Suspended)</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <UserCheck size={13} className="text-slate-400" />
                          <span>Owner: <strong>{comp.ownerName}</strong> ({comp.ownerEmail})</span>
                        </span>
                        {comp.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={13} className="text-slate-400" />
                            <span>{comp.phone}</span>
                          </span>
                        )}
                        {comp.tinNumber && (
                          <span className="flex items-center gap-1">
                            <FileText size={13} className="text-slate-400" />
                            <span>TIN: {comp.tinNumber}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={13} className="text-slate-400" />
                          <span>
                            <strong>{comp.staffCount || 0}</strong> staff members (
                            {comp.activeStaffCount || 0} active)
                          </span>
                        </span>
                      </div>

                      {comp.accessNotes && (
                        <p className="text-[11px] text-slate-400 italic">
                          Developer note: {comp.accessNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 shrink-0">
                    {/* GIVE ACCESS / DENY ACCESS TOGGLE */}
                    <button
                      type="button"
                      onClick={() => handleToggleCompanyAccess(comp)}
                      disabled={actionLoading}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer disabled:opacity-50 ${
                        isGranted
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {isGranted ? (
                        <>
                          <Lock size={13} />
                          <span>Deny Access</span>
                        </>
                      ) : (
                        <>
                          <Unlock size={13} />
                          <span>Give Access</span>
                        </>
                      )}
                    </button>

                    {/* MANAGE STAFF */}
                    <button
                      type="button"
                      onClick={() => handleOpenStaffModal(comp)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 shadow-sm"
                    >
                      <Users size={13} className="text-slate-500" />
                      <span>Manage Staff ({comp.staffCount || 0})</span>
                    </button>

                    {/* EDIT PROFILE */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditCompany(comp)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs transition border border-slate-200"
                      title="Edit Company Details"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ MODAL 1: COMPANY STAFF DRAWER / MODAL ══ */}
      {showStaffModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/50">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase">
                  <Building2 size={14} />
                  <span>{selectedCompany.name}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Company Staff Access Management
                </h3>
                <p className="text-xs text-slate-500">
                  Manage individual staff access, change roles, or assign permissions for this company.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition"
                >
                  <Plus size={13} />
                  <span>Add Staff Member</span>
                </button>
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {staffLoading ? (
                <div className="p-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={20} className="animate-spin text-indigo-600" />
                  <span>Loading company staff...</span>
                </div>
              ) : companyStaff.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Users size={30} className="text-slate-300" />
                  <p className="font-bold text-slate-700">No staff members enrolled yet</p>
                  <p className="text-slate-400">
                    Click "Add Staff Member" to enroll an employee under {selectedCompany.name}.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {companyStaff.map((staff) => (
                    <div
                      key={staff._id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                          {staff.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{staff.name}</h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                staff.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : staff.role === 'manager'
                                  ? 'bg-blue-100 text-blue-700'
                                  : staff.role === 'cashier'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {staff.role}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                staff.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {staff.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{staff.email} · {staff.phone || 'No phone'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        {/* Role selector */}
                        <select
                          value={staff.role}
                          onChange={(e) => handleStaffRoleChange(staff, e.target.value)}
                          className="text-xs font-bold rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="storekeeper">Storekeeper</option>
                          <option value="cashier">Cashier</option>
                        </select>

                        {/* Give / Deny Staff Access */}
                        <button
                          type="button"
                          onClick={() => handleToggleStaffAccess(staff)}
                          disabled={actionLoading}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                            staff.isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {staff.isActive ? (
                            <>
                              <UserX size={12} />
                              <span>Deny Access</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} />
                              <span>Give Access</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL 2: ADD STAFF MEMBER UNDER COMPANY ══ */}
      {showAddStaffModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                Add Staff under {selectedCompany.name}
              </h3>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="e.g. Abebe Bikila"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="staff@company.com"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Access Role</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="storekeeper">Storekeeper</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    placeholder="0911..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                >
                  {actionLoading ? 'Creating...' : 'Enroll Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL 3: PROVISION NEW COMPANY ══ */}
      {showCreateCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Provision New Company Tenant
                </h3>
                <p className="text-xs text-slate-500">
                  Register a new entrance company and provision its initial Owner account.
                </p>
              </div>
              <button
                onClick={() => setShowCreateCompanyModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-3">
                <h4 className="text-xs font-black text-blue-700 uppercase tracking-wider">
                  1. Company Profile
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Company Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      placeholder="e.g. Abyssinia Trading PLC"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Trade / Brand Name</label>
                    <input
                      type="text"
                      value={newCompany.tradeName}
                      onChange={(e) => setNewCompany({ ...newCompany, tradeName: e.target.value })}
                      placeholder="e.g. Abyssinia Stores"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">TIN Number</label>
                    <input
                      type="text"
                      value={newCompany.tinNumber}
                      onChange={(e) => setNewCompany({ ...newCompany, tinNumber: e.target.value })}
                      placeholder="10-digit TIN"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Company Phone</label>
                    <input
                      type="text"
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                      placeholder="+251..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">City / Region</label>
                    <input
                      type="text"
                      value={newCompany.city}
                      onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tax Rate (%)</label>
                    <input
                      type="number"
                      value={newCompany.taxRate}
                      onChange={(e) => setNewCompany({ ...newCompany, taxRate: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider">
                  2. Company Owner Account
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newCompany.ownerName}
                      onChange={(e) => setNewCompany({ ...newCompany, ownerName: e.target.value })}
                      placeholder="e.g. Dawit Tadesse"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Owner Email (Login ID) *</label>
                    <input
                      type="email"
                      required
                      value={newCompany.ownerEmail}
                      onChange={(e) => setNewCompany({ ...newCompany, ownerEmail: e.target.value })}
                      placeholder="owner@abyssinia.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Owner Password *</label>
                    <input
                      type="password"
                      required
                      value={newCompany.ownerPassword}
                      onChange={(e) => setNewCompany({ ...newCompany, ownerPassword: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Owner Phone</label>
                    <input
                      type="text"
                      value={newCompany.ownerPhone}
                      onChange={(e) => setNewCompany({ ...newCompany, ownerPhone: e.target.value })}
                      placeholder="0911..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCompanyModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {actionLoading ? 'Provisioning...' : 'Provision Company & Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL 4: EDIT COMPANY DETAILS ══ */}
      {showEditCompanyModal && editCompanyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-base">
                Edit {editCompanyForm.name}
              </h3>
              <button
                onClick={() => setShowEditCompanyModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditCompany} className="p-6 overflow-y-auto space-y-3 flex-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={editCompanyForm.name || ''}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Trade Name</label>
                  <input
                    type="text"
                    value={editCompanyForm.tradeName || ''}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, tradeName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">TIN Number</label>
                  <input
                    type="text"
                    value={editCompanyForm.tinNumber || ''}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, tinNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    value={editCompanyForm.ownerName || ''}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={editCompanyForm.ownerEmail || ''}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, ownerEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Currency</label>
                  <input
                    type="text"
                    value={editCompanyForm.currency || 'ETB'}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, currency: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={editCompanyForm.taxRate ?? 15}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, taxRate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Max Users</label>
                  <input
                    type="number"
                    value={editCompanyForm.maxUsers || 50}
                    onChange={(e) => setEditCompanyForm({ ...editCompanyForm, maxUsers: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Developer Access Note</label>
                <input
                  type="text"
                  value={editCompanyForm.accessNotes || ''}
                  onChange={(e) => setEditCompanyForm({ ...editCompanyForm, accessNotes: e.target.value })}
                  placeholder="e.g. Standard production license"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditCompanyModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {actionLoading ? 'Saving...' : 'Save Company Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

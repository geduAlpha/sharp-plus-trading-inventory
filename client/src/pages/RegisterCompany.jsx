import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Coins,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Globe,
  Percent,
  Check,
  Send,
  FileBadge2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function RegisterCompany() {
  const navigate = useNavigate();
  const { registerCompany } = useAuth();

  const [step, setStep] = useState(1); // 1 = Company Profile, 2 = Owner Admin, 3 = Confirm
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    // Company Profile
    companyName: '',
    tradeName: '',
    systemEmail: '',
    phone: '',
    address: '',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    tinNumber: '',
    currency: 'ETB',
    currencySymbol: 'ETB',
    taxRate: 15,
    notes: '',
    companyLogo: '',
    // Owner Admin Credentials
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
    ownerPhone: '',
    telegramChatId: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Quick pre-fetch public info if system already has defaults
  useEffect(() => {
    let isMounted = true;
    api.get('/settings/public')
      .then((res) => {
        if (!isMounted || !res.data) return;
        const d = res.data;
        if (!formData.companyName && d.companyName && d.companyName !== 'Sharp Plus') {
          setFormData((prev) => ({
            ...prev,
            companyName: d.companyName || '',
            tradeName: d.tradeName || '',
            systemEmail: d.systemEmail || '',
            phone: d.phone || '',
            address: d.address || '',
            city: d.city || 'Addis Ababa',
            country: d.country || 'Ethiopia',
            currency: d.currency || 'ETB',
            currencySymbol: d.currencySymbol || 'ETB',
            taxRate: d.taxRate !== undefined ? d.taxRate : 15,
          }));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (serverError) setServerError('');
  };

  const validateStep1 = () => {
    if (!formData.companyName.trim()) {
      setServerError('Company Name is required.');
      return false;
    }
    if (!formData.currency.trim()) {
      setServerError('Operating Currency is required.');
      return false;
    }
    setServerError('');
    return true;
  };

  const validateStep2 = () => {
    if (!formData.ownerName.trim()) {
      setServerError('Owner Full Name is required.');
      return false;
    }
    if (!formData.ownerEmail.trim()) {
      setServerError('Owner Email Address is required for login.');
      return false;
    }
    if (!formData.ownerPassword || formData.ownerPassword.length < 6) {
      setServerError('Password must be at least 6 characters long.');
      return false;
    }
    if (formData.ownerPassword !== formData.confirmPassword) {
      setServerError('Passwords do not match.');
      return false;
    }
    if (!formData.ownerPhone.trim()) {
      setServerError('Owner Phone Number is required for identity verification.');
      return false;
    }
    setServerError('');
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    setServerError('');
    try {
      const res = await registerCompany(formData);
      setSuccessData(res);
      // Auto redirect after short celebration delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2200);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to register company profile.';
      setServerError(msg);
      setStep(step === 3 ? 2 : step);
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/20 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-inner mb-6 border border-emerald-100">
            <Sparkles size={40} className="animate-bounce" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-3">
            System Ownership Established
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            Welcome, {formData.companyName}!
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Your company profile has been captured and successfully registered as the <strong>primary owner</strong> of this system.
          </p>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Registered Company:</span>
              <span className="text-slate-900 font-bold">{formData.companyName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">System Owner (Admin):</span>
              <span className="text-slate-900 font-bold">{formData.ownerName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Admin Login Email:</span>
              <span className="text-indigo-600 font-semibold">{formData.ownerEmail}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Default Currency:</span>
              <span className="text-slate-900 font-bold">{formData.currency} ({formData.currencySymbol})</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <div className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
            <span>Redirecting to your new company dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Building2 size={20} />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight">System Onboarding</span>
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Company Profile Registration</p>
            </div>
          </Link>

          <Link
            to="/login"
            className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/60"
          >
            Already registered? <span className="text-indigo-400 underline underline-offset-2">Sign in</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-1">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold mb-4">
            <Sparkles size={14} className="text-indigo-400" />
            <span>New Company Onboarding &amp; Profile Setup</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Register Your Company Profile
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-2 leading-relaxed">
            Fill in your company details to initialize and capture your company profile. The registering company will instantly become the <strong>sole registered owner</strong> of this stock and inventory management system.
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl transition border ${
                step === 1
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : step > 1
                  ? 'bg-slate-800/80 text-emerald-400 border-slate-700'
                  : 'bg-slate-900/60 text-slate-500 border-slate-800'
              }`}
            >
              {step > 1 ? <Check size={14} /> : <span>1</span>}
              <span>Company Profile</span>
            </button>

            <button
              type="button"
              onClick={() => { if (validateStep1()) setStep(2); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl transition border ${
                step === 2
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : step > 2
                  ? 'bg-slate-800/80 text-emerald-400 border-slate-700'
                  : 'bg-slate-900/60 text-slate-500 border-slate-800'
              }`}
            >
              {step > 2 ? <Check size={14} /> : <span>2</span>}
              <span>Owner Account</span>
            </button>

            <button
              type="button"
              onClick={() => { if (validateStep1() && validateStep2()) setStep(3); }}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl transition border ${
                step === 3
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/60 text-slate-500 border-slate-800'
              }`}
            >
              <span>3</span>
              <span>Confirm &amp; Launch</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative">
          {serverError && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs sm:text-sm text-rose-300">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 font-medium">{serverError}</div>
            </div>
          )}

          <form onSubmit={step === 3 ? handleSubmit : handleNext}>
            {/* ══ STEP 1: Company Profile Info ══ */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building size={18} className="text-indigo-400" />
                    Company &amp; Organization Details
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter the legal or brand identity of the company entering this system.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Company / Organization Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="companyName"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="e.g. Acme Trading PLC / Sharp Plus Trading"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Brand / Trade Name (Optional)
                    </label>
                    <input
                      type="text"
                      name="tradeName"
                      value={formData.tradeName}
                      onChange={handleChange}
                      placeholder="e.g. Acme Stores / Sharp Plus"
                      className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      TIN / Business Registration Number
                    </label>
                    <div className="relative">
                      <FileBadge2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="tinNumber"
                        value={formData.tinNumber}
                        onChange={handleChange}
                        placeholder="e.g. 0012345678"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Company Official Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        name="systemEmail"
                        value={formData.systemEmail}
                        onChange={handleChange}
                        placeholder="info@yourcompany.com"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Official Contact Phone
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+251 911 000 111"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Operating Currency Code <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Coins size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="currency"
                        required
                        value={formData.currency}
                        onChange={handleChange}
                        placeholder="ETB, USD, EUR..."
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Currency Symbol
                    </label>
                    <input
                      type="text"
                      name="currencySymbol"
                      value={formData.currencySymbol}
                      onChange={handleChange}
                      placeholder="ETB, $, €, Br..."
                      className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Physical Address / Headquarters Location
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Bole Sub-city, Addis Ababa, Ethiopia"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Default VAT / Sales Tax Rate (%)
                    </label>
                    <div className="relative">
                      <Percent size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        name="taxRate"
                        value={formData.taxRate}
                        onChange={handleChange}
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Company Logo URL (Optional)
                    </label>
                    <input
                      type="text"
                      name="companyLogo"
                      value={formData.companyLogo}
                      onChange={handleChange}
                      placeholder="https://... or /logo.png"
                      className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
                  >
                    <span>Next: Owner Account</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 2: Owner & Master Administrator Credentials ══ */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield size={18} className="text-indigo-400" />
                    System Owner &amp; Super-Administrator Account
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Set up the owner credentials who will hold master administrative privileges for <strong>{formData.companyName || 'your company'}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Owner Full Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="ownerName"
                        required
                        value={formData.ownerName}
                        onChange={handleChange}
                        placeholder="e.g. Gedamu Walelgn / Company Director"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Owner Login Email <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        name="ownerEmail"
                        required
                        value={formData.ownerEmail}
                        onChange={handleChange}
                        placeholder="owner@yourcompany.com"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Owner Phone Number (for OTP &amp; Alerts) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="ownerPhone"
                        required
                        value={formData.ownerPhone}
                        onChange={handleChange}
                        placeholder="0912627366 or +251..."
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Master Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="ownerPassword"
                        required
                        minLength={6}
                        value={formData.ownerPassword}
                        onChange={handleChange}
                        placeholder="At least 6 characters"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        required
                        minLength={6}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Telegram Chat ID (Optional)
                    </label>
                    <div className="relative">
                      <Send size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="telegramChatId"
                        value={formData.telegramChatId}
                        onChange={handleChange}
                        placeholder="e.g. 5930970864 (from @SharpPlusBot)"
                        className="w-full rounded-xl bg-slate-950 border border-slate-700/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      If provided, you will immediately receive login OTP codes and transaction alerts on Telegram.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Back to Company Profile
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
                  >
                    <span>Next: Review &amp; Confirm</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 3: Review, Confirm & Establish Ownership ══ */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-400" />
                    Review &amp; Establish System Ownership
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Please review your company details before completing registration.
                  </p>
                </div>

                <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow">
                      {formData.companyName ? formData.companyName.slice(0, 2).toUpperCase() : 'CO'}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{formData.companyName}</h3>
                      <p className="text-xs text-indigo-300">New Entrance Company &amp; System Owner</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-indigo-500/20">
                    <div>
                      <span className="text-slate-400">Trade / Brand:</span>{' '}
                      <strong className="text-slate-200">{formData.tradeName || formData.companyName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">TIN / Reg No:</span>{' '}
                      <strong className="text-slate-200">{formData.tinNumber || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">System Email:</span>{' '}
                      <strong className="text-slate-200">{formData.systemEmail || formData.ownerEmail}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Company Phone:</span>{' '}
                      <strong className="text-slate-200">{formData.phone || formData.ownerPhone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Address / City:</span>{' '}
                      <strong className="text-slate-200">{formData.address || 'Addis Ababa'}, {formData.city}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Currency &amp; Tax:</span>{' '}
                      <strong className="text-slate-200">{formData.currency} ({formData.currencySymbol}) · {formData.taxRate}% VAT</strong>
                    </div>
                  </div>
                </div>

                {/* Owner Account Summary */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Master Administrator</h4>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Owner Name:</span>
                    <strong className="text-white">{formData.ownerName}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Login Email:</span>
                    <strong className="text-indigo-400">{formData.ownerEmail}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Owner Phone:</span>
                    <strong className="text-slate-200">{formData.ownerPhone}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">System Role:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                      SUPER ADMIN / OWNER
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200 leading-relaxed">
                    By submitting this registration, <strong>{formData.companyName}</strong> will be captured and set as the permanent active owner of this inventory and trading installation.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Back to Owner Details
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3 text-sm font-bold text-white hover:from-indigo-500 hover:to-violet-500 transition shadow-xl shadow-indigo-600/30 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Capturing &amp; Registering Company...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Complete Registration &amp; Launch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 px-6 py-4 text-center text-xs text-slate-500">
        <p>© 2026 {formData.companyName || 'Stock & Inventory Management System'}. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Globe,
  Languages,
  Check,
  Search,
  Sparkles,
  ChevronDown,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageMenu({ variant = 'topbar', className = '' }) {
  const {
    currentLanguage,
    setLanguage,
    supportedLanguages,
    autoTranslateEnabled,
    toggleAutoTranslate,
    isTranslating,
    t,
  } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter languages
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return supportedLanguages;
    const q = searchQuery.toLowerCase();
    return supportedLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [searchQuery, supportedLanguages]);

  // Topbar Header Menu
  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/90 hover:bg-indigo-50/80 hover:border-indigo-300 px-2.5 sm:px-3 text-xs text-slate-600 transition shadow-2xs group"
        title={`Language: ${currentLanguage.name} (${currentLanguage.nativeName}). Click to change language and translate info.`}
        aria-label="Language and translation menu"
      >
        <Languages size={15} className={`text-indigo-600 group-hover:scale-110 transition-transform shrink-0 ${isTranslating ? 'animate-spin' : ''}`} />
        <span className="text-xs shrink-0">{currentLanguage.flag}</span>
        <span className="hidden md:inline text-xs font-bold capitalize text-slate-700 group-hover:text-indigo-700 transition">
          {currentLanguage.nativeName}
        </span>
        <ChevronDown size={12} className={`text-slate-400 group-hover:text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Globe size={15} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {t('select_language', 'Select Language')}
                </p>
                <p className="text-[10px] text-slate-500">
                  {t('translate_data_info', 'Translate info & system data')}
                </p>
              </div>
            </div>
            {currentLanguage.code !== 'en' && (
              <button
                type="button"
                onClick={() => {
                  setLanguage('en');
                  setIsOpen(false);
                }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
              >
                Reset
              </button>
            )}
          </div>

          {/* Search box */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_language', 'Search language...')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Languages List */}
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredLanguages.map((lang) => {
              const isSelected = currentLanguage.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div>
                      <p className="font-semibold text-xs leading-tight">{lang.nativeName}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{lang.name}</p>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Footer controls: Auto translate toggle */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between px-1 text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoTranslateEnabled}
                onChange={toggleAutoTranslate}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-[11px] font-medium text-slate-700">
                {t('auto_translate_tables', 'Auto-translate data & tables')}
              </span>
            </label>
            {autoTranslateEnabled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <Sparkles size={11} /> On
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


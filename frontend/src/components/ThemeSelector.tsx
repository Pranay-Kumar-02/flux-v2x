import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { useTheme, THEMES, ThemeId } from '../context/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme, currentThemeMeta } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Theme Trigger Button */}
      <button
        id="theme-selector-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select theme"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-flux-surface hover:bg-flux-hover border border-flux-border text-xs text-flux-text transition-all focus:outline-none focus:ring-1 focus:ring-flux-accent select-none shadow-sm"
      >
        <Palette size={13} className="text-flux-accent flex-shrink-0" />
        {/* Tiny color swatch preview pill */}
        <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-flux-subsurface border border-flux-border/60">
          <span
            className="w-2 h-2 rounded-full border border-black/20"
            style={{ backgroundColor: currentThemeMeta.preview.bg }}
          />
          <span
            className="w-2 h-2 rounded-full border border-black/20"
            style={{ backgroundColor: currentThemeMeta.preview.surface }}
          />
          <span
            className="w-2 h-2 rounded-full border border-black/20"
            style={{ backgroundColor: currentThemeMeta.preview.accent }}
          />
        </div>
        <span className="font-medium text-xs tracking-tight text-flux-text">
          {currentThemeMeta.name}
        </span>
        <ChevronDown
          size={12}
          className={`text-flux-muted transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Theme Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Available themes"
          className="absolute right-0 mt-2 w-72 rounded-lg bg-flux-surface border border-flux-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{ backdropFilter: 'blur(16px)' }}
        >
          <div className="px-2.5 py-1.5 pb-2 border-b border-flux-border/60 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-flux-muted font-semibold">
              Interface Theme
            </span>
            <span className="text-[10px] text-flux-muted/80">4 Presets</span>
          </div>

          <div className="mt-1 space-y-1">
            {THEMES.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  id={`theme-option-${t.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setTheme(t.id as ThemeId);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-md text-xs transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-flux-elevated border border-flux-accent/40 shadow-sm text-flux-text'
                      : 'hover:bg-flux-hover text-flux-secondary hover:text-flux-text border border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {/* Swatch previews */}
                      <div className="flex items-center gap-1 p-0.5 rounded bg-flux-subsurface border border-flux-border/60 flex-shrink-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: t.preview.bg }}
                          title={`Background: ${t.preview.bg}`}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: t.preview.surface }}
                          title={`Surface: ${t.preview.surface}`}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: t.preview.accent }}
                          title={`Accent: ${t.preview.accent}`}
                        />
                      </div>
                      <span className="font-medium text-xs text-flux-text truncate">
                        {t.name}
                      </span>
                      {t.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            isSelected
                              ? 'bg-flux-accent/15 text-flux-accent border border-flux-accent/25'
                              : 'bg-flux-subsurface text-flux-muted border border-flux-border/50'
                          }`}
                        >
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-flux-muted line-clamp-1 leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="pt-0.5 flex-shrink-0">
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-flux-accent/20 flex items-center justify-center text-flux-accent">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-flux-border/80" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

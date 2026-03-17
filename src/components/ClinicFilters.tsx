'use client';

import { SERVICE_OPTIONS, LANGUAGE_OPTIONS } from '@/types/clinic';

interface ClinicFiltersProps {
  selectedServices: string[];
  selectedLanguages: string[];
  onServicesChange: (services: string[]) => void;
  onLanguagesChange: (languages: string[]) => void;
  onClear: () => void;
}

export default function ClinicFilters({
  selectedServices,
  selectedLanguages,
  onServicesChange,
  onLanguagesChange,
  onClear,
}: ClinicFiltersProps) {
  const hasFilters =
    selectedServices.length > 0 || selectedLanguages.length > 0;

  function toggleService(service: string) {
    onServicesChange(
      selectedServices.includes(service)
        ? selectedServices.filter((s) => s !== service)
        : [...selectedServices, service]
    );
  }

  function toggleLanguage(language: string) {
    onLanguagesChange(
      selectedLanguages.includes(language)
        ? selectedLanguages.filter((l) => l !== language)
        : [...selectedLanguages, language]
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="border-sage-muted/40 rounded-2xl border bg-white p-5 shadow-sm">
        {/* Services */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-sage-text text-sm font-medium">Services</h3>
            {hasFilters && (
              <button
                onClick={onClear}
                className="text-sage-primary text-xs hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map((service) => {
              const active = selectedServices.includes(service);
              return (
                <button
                  key={service}
                  onClick={() => toggleService(service)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-sage-primary text-white'
                      : 'bg-sage-bg text-sage-text/70 hover:bg-sage-accent/20 hover:text-sage-text'
                  }`}
                >
                  {service}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-sage-muted/30 my-4 border-t" />

        {/* Languages */}
        <div>
          <h3 className="text-sage-text mb-2.5 text-sm font-medium">
            Languages
          </h3>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((language) => {
              const active = selectedLanguages.includes(language);
              return (
                <button
                  key={language}
                  onClick={() => toggleLanguage(language)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-sage-primary text-white'
                      : 'bg-sage-bg text-sage-text/70 hover:bg-sage-accent/20 hover:text-sage-text'
                  }`}
                >
                  {language}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

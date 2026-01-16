import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import type { LlmProviderConfig } from "../types";

interface SettingsModalProps {
    onClose: () => void;
    onEditProvider: (provider: LlmProviderConfig | null) => void;
    onDeleteProvider: (providerId: string) => void;
}

export function SettingsModal({ onClose, onEditProvider, onDeleteProvider }: SettingsModalProps) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<'general' | 'provider'>('general');
    const providers = useAppStore((state) => state.providers);
    const selectedProviderId = useAppStore((state) => state.selectedProviderId);
    const setSelectedProviderId = useAppStore((state) => state.setSelectedProviderId);

    const selectedProvider = providers.find((p) => p.id === selectedProviderId);

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/20 px-4 py-8 backdrop-blur-sm">
            <div className="flex h-[600px] w-full max-w-3xl overflow-hidden rounded-2xl border border-ink-900/5 bg-surface shadow-elevated">
                {/* Sidebar */}
                <div className="w-64 border-r border-ink-900/5 bg-surface-secondary flex flex-col">
                    <div className="p-6 pb-4">
                        <h2 className="text-xl font-semibold text-ink-800">{t('settings.title')}</h2>
                    </div>
                    <nav className="flex-1 px-3 space-y-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === 'general'
                                    ? 'bg-surface text-ink-900 shadow-sm'
                                    : 'text-ink-500 hover:bg-ink-900/5 hover:text-ink-700'
                                }`}
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            {t('settings.general')}
                        </button>
                        <button
                            onClick={() => setActiveTab('provider')}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === 'provider'
                                    ? 'bg-surface text-ink-900 shadow-sm'
                                    : 'text-ink-500 hover:bg-ink-900/5 hover:text-ink-700'
                                }`}
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                            {t('settings.provider')}
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col bg-surface overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-ink-900/5">
                        <h3 className="text-lg font-medium text-ink-800">
                            {activeTab === 'general' ? t('settings.general_title') : t('settings.provider_title')}
                        </h3>
                        <button
                            className="rounded-full p-2 text-muted hover:bg-surface-tertiary hover:text-ink-700 transition-colors"
                            onClick={onClose}
                        >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-ink-700">{t('settings.language_label')}</label>
                                    <select
                                        className="w-full rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                                        value={i18n.language}
                                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                                    >
                                        <option value="en">English</option>
                                        <option value="zh">简体中文</option>
                                    </select>
                                    <p className="text-xs text-muted">{t('settings.language_description')}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'provider' && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-ink-700">{t('settings.active_provider_label')}</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                                            value={selectedProviderId || ""}
                                            onChange={(e) => setSelectedProviderId(e.target.value || null)}
                                        >
                                            <option value="">{t('sidebar.default_provider')}</option>
                                            {providers.map((provider) => (
                                                <option key={provider.id} value={provider.id}>
                                                    {provider.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-ink-500">
                                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M6 9l6 6 6-6" />
                                            </svg>
                                        </div>
                                    </div>
                                    {selectedProvider && (
                                        <p className="text-xs text-muted">{selectedProvider.baseUrl}</p>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-ink-700">{t('settings.configured_providers_label')}</label>
                                        <button
                                            onClick={() => onEditProvider(null)}
                                            className="text-sm font-medium text-accent hover:text-accent-hover"
                                        >
                                            + {t('settings.add_provider')}
                                        </button>
                                    </div>

                                    <div className="grid gap-3">
                                        {providers.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-ink-900/10 bg-surface-secondary/50 p-4 text-center text-sm text-muted">
                                                {t('settings.no_custom_providers')}
                                            </div>
                                        ) : (
                                            providers.map((provider) => (
                                                <div
                                                    key={provider.id}
                                                    className="flex items-center justify-between rounded-xl border border-ink-900/10 bg-surface p-4"
                                                >
                                                    <div>
                                                        <div className="font-medium text-ink-800">{provider.name}</div>
                                                        <div className="text-xs text-muted">{provider.baseUrl}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => onEditProvider(provider)}
                                                            className="rounded-lg p-2 text-ink-500 hover:bg-surface-tertiary hover:text-ink-700"
                                                            aria-label={t('common.edit')}
                                                        >
                                                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteProvider(provider.id)}
                                                            className="rounded-lg p-2 text-ink-500 hover:bg-error-light hover:text-error"
                                                            aria-label={t('common.delete')}
                                                        >
                                                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M3 6h18" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

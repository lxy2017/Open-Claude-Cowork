import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LlmProviderConfig } from "../types";

interface ProviderModalProps {
  provider?: LlmProviderConfig | null;
  onSave: (provider: LlmProviderConfig) => void;
  onDelete?: (providerId: string) => void;
  onClose: () => void;
}

export function ProviderModal({ provider, onSave, onDelete, onClose }: ProviderModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(provider?.name || "");
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl || "");
  const [authToken, setAuthToken] = useState(provider?.authToken || "");
  const [defaultModel, setDefaultModel] = useState(provider?.defaultModel || "");
  const [opusModel, setOpusModel] = useState(provider?.models?.opus || "");
  const [sonnetModel, setSonnetModel] = useState(provider?.models?.sonnet || "");
  const [haikuModel, setHaikuModel] = useState(provider?.models?.haiku || "");

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setBaseUrl(provider.baseUrl);
      setAuthToken(provider.authToken);
      setDefaultModel(provider.defaultModel || "");
      setOpusModel(provider.models?.opus || "");
      setSonnetModel(provider.models?.sonnet || "");
      setHaikuModel(provider.models?.haiku || "");
    }
  }, [provider]);

  const handleSave = () => {
    if (!name.trim() || !baseUrl.trim() || !authToken.trim()) {
      return;
    }

    const providerConfig: LlmProviderConfig = {
      id: provider?.id || "",
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      authToken: authToken.trim(),
      defaultModel: defaultModel.trim() || undefined,
      models: {
        opus: opusModel.trim() || undefined,
        sonnet: sonnetModel.trim() || undefined,
        haiku: haikuModel.trim() || undefined
      }
    };

    // Remove empty models object if all are empty
    if (!providerConfig.models?.opus && !providerConfig.models?.sonnet && !providerConfig.models?.haiku) {
      providerConfig.models = undefined;
    }

    onSave(providerConfig);
    onClose();
  };

  const handleDelete = () => {
    if (provider?.id && onDelete) {
      onDelete(provider.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/20 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-ink-900/5 bg-surface p-6 shadow-elevated max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold text-ink-800">
            {provider ? t('provider.edit_title') : t('provider.add_title')}
          </div>
          <button
            className="rounded-full p-1.5 text-muted hover:bg-surface-tertiary hover:text-ink-700 transition-colors"
            onClick={onClose}
            aria-label={t('provider.close')}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-sm text-muted mb-4">
          {t('provider.description')}
        </p>

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">{t('provider.name_label')}</span>
            <input
              className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              placeholder={t('provider.name_placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">{t('provider.base_url_label')}</span>
            <input
              className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              placeholder={t('provider.base_url_placeholder')}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
            />
            <span className="text-[10px] text-muted-light">
              {t('provider.base_url_hint')}
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">{t('provider.auth_token_label')}</span>
            <input
              className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              placeholder={t('provider.auth_token_placeholder')}
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              required
            />
            <span className="text-[10px] text-muted-light">
              {t('provider.auth_token_hint')}
            </span>
          </label>

          <div className="border-t border-ink-900/10 pt-4 mt-2">
            <span className="text-xs font-medium text-muted mb-3 block">{t('provider.model_config_title')}</span>

            <label className="grid gap-1.5 mb-3">
              <span className="text-xs font-medium text-muted-light">{t('provider.default_model_label')}</span>
              <input
                className="rounded-xl border border-ink-900/10 bg-surface-secondary px-4 py-2.5 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                placeholder={t('provider.default_model_placeholder')}
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-1 gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-light">{t('provider.opus_model_label')}</span>
                <input
                  className="w-full rounded-xl border border-ink-900/10 bg-surface-secondary px-3 py-2 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                  placeholder={t('provider.opus_model_placeholder')}
                  value={opusModel}
                  onChange={(e) => setOpusModel(e.target.value)}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-light">{t('provider.sonnet_model_label')}</span>
                <input
                  className="w-full rounded-xl border border-ink-900/10 bg-surface-secondary px-3 py-2 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                  placeholder={t('provider.sonnet_model_placeholder')}
                  value={sonnetModel}
                  onChange={(e) => setSonnetModel(e.target.value)}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-light">{t('provider.haiku_model_label')}</span>
                <input
                  className="w-full rounded-xl border border-ink-900/10 bg-surface-secondary px-3 py-2 text-sm text-ink-800 placeholder:text-muted-light focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
                  placeholder={t('provider.haiku_model_placeholder')}
                  value={haikuModel}
                  onChange={(e) => setHaikuModel(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            {provider && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                {t('provider.delete_button')}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !baseUrl.trim() || !authToken.trim()}
              className="flex-1 flex justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white shadow-soft hover:bg-accent-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {provider ? t('provider.save_button') : t('provider.add_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '../context/AuthContext';
import styles from './Settings.module.css';

export default function Settings() {
  const [settings, setSettings] = useState<{
    telegramEnabled?: boolean;
    telegramId?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch('/api/settings/notifications')
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage('Настройки сохранены');
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? 'Ошибка сохранения');
      }
    } catch {
      setMessage('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const [telegramCode, setTelegramCode] = useState<{ code: string; botUsername: string | null; instruction: string } | null>(null);
  const [botInfo, setBotInfo] = useState<{ botLink: string | null; botUsername: string | null } | null>(null);

  useEffect(() => {
    apiFetch('/api/settings/telegram/bot-info')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.botLink || data?.botUsername) {
          setBotInfo({ botLink: data.botLink ?? null, botUsername: data.botUsername ?? null });
        }
      })
      .catch(() => {});
  }, []);

  const requestTelegramCode = async () => {
    try {
      setTelegramCode(null);
      const res = await apiFetch('/api/settings/telegram/request-code', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message ?? '');
      if (data.code) {
        setTelegramCode({
          code: data.code,
          botUsername: data.botUsername ?? null,
          instruction: data.telegramConfigured
            ? `Отправьте боту ${data.botUsername || 'в Telegram'} команду: /start ${data.code}`
            : data.message ?? '',
        });
      }
    } catch {
      setMessage('Ошибка запроса кода');
    }
  };

  if (loading) return <p className={styles.loading}>Загрузка…</p>;
  if (!settings) return <p className={styles.error}>Не удалось загрузить настройки</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Настройки</h1>
      <p className={styles.subtitle}>Уведомления только через Telegram</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2>Telegram</h2>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={settings.telegramEnabled ?? false}
              onChange={(e) => setSettings((s) => ({ ...s!, telegramEnabled: e.target.checked }))}
            />
            Включить уведомления в Telegram
          </label>
          <p className={styles.hint}>
            {settings.telegramId
              ? 'Аккаунт привязан. Уведомления о новых пожарных сигналах и ответы на заявки будут приходить в Telegram.'
              : 'Откройте бота в Telegram, затем запросите код и отправьте ему команду /start КОД — аккаунт привяжется.'}
          </p>
          {botInfo?.botLink && (
            <a
              href={botInfo.botLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.botLink}
            >
              Открыть бота в Telegram {botInfo.botUsername && `(${botInfo.botUsername})`}
            </a>
          )}
          {settings.telegramId ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await apiFetch('/api/settings/telegram/unlink', { method: 'POST' });
                  setMessage('Telegram отвязан');
                  setSettings((s) => s ? { ...s, telegramId: null } : null);
                } catch {
                  setMessage('Ошибка');
                }
              }}
              className={styles.dangerBtn}
            >
              Отвязать Telegram
            </button>
          ) : (
            <button type="button" onClick={requestTelegramCode} className={styles.secondaryBtn}>
              Запросить код привязки
            </button>
          )}
          {telegramCode && (
            <div className={styles.telegramCode}>
              <p><strong>Код:</strong> <code>{telegramCode.code}</code></p>
              <p className={styles.hint}>{telegramCode.instruction}</p>
              {telegramCode.botUsername && (
                <p>Бот: <a href={`https://t.me/${telegramCode.botUsername.replace('@', '')}`} target="_blank" rel="noopener noreferrer">{telegramCode.botUsername}</a></p>
              )}
            </div>
          )}
        </section>
        {message && <p className={styles.message}>{message}</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить настройки'}
        </button>
      </form>
    </div>
  );
}

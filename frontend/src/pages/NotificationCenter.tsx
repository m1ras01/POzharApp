import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import styles from './NotificationCenter.module.css';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новое',
  IN_PROGRESS: 'В обработке',
  VERIFIED: 'Проверено',
  FALSE_ALARM: 'Ложное',
  CLOSED: 'Закрыто',
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState<{
    telegramEnabled?: boolean;
    telegramId?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/notifications?limit=50'),
      apiFetch('/api/settings/notifications'),
    ])
      .then(async ([listRes, settingsRes]) => {
        const list = listRes.ok ? await listRes.json() : null;
        const s = settingsRes.ok ? await settingsRes.json() : null;
        setNotifications(Array.isArray(list) ? list : []);
        if (s && typeof s === 'object') setSettings(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Центр уведомлений</h1>
      <section className={styles.section}>
        <h2>Telegram</h2>
        <p className={styles.text}>
          {settings?.telegramId
            ? 'Ваш аккаунт привязан к боту. Уведомления о новых пожарных сигналах приходят в Telegram.'
            : 'Для привязки Telegram перейдите в Настройки и запросите код привязки, затем отправьте его боту.'}
        </p>
        <p className={styles.hint}>Статус: {settings?.telegramId ? 'подключено' : 'не подключено'}</p>
        <Link to="/settings" className={styles.link}>
          Настройки Telegram →
        </Link>
      </section>
      <section className={styles.section}>
        <h2>Список уведомлений</h2>
        {loading ? (
          <p className={styles.loading}>Загрузка…</p>
        ) : notifications.length === 0 ? (
          <p className={styles.empty}>Нет уведомлений</p>
        ) : (
          <ul className={styles.list}>
            {notifications.map((n) => (
              <li key={n.id}>
                <Link to={`/notifications/${n.id}`}>
                  <span className={styles.date}>
                    {new Date(n.createdAt).toLocaleString('ru')}
                  </span>
                  <span className={styles.status} data-status={n.status}>
                    {STATUS_LABELS[n.status] ?? n.status}
                  </span>
                  {n.source} — {n.address}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.section}>
        <h2>История доставки в Telegram</h2>
        <p className={styles.hint}>
          Уведомления о новых пожарных сигналах отправляются админам с включённым Telegram. Детальная история доставки — в разработке.
        </p>
      </section>
    </div>
  );
}

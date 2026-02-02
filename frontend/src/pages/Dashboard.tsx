import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import styles from './Dashboard.module.css';

type Stats = { active: number; processed: number };

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/notifications/stats'),
      apiFetch('/api/notifications?limit=5'),
    ])
      .then(async ([statsRes, listRes]) => {
        const statsData = statsRes.ok ? await statsRes.json() : null;
        const listData = listRes.ok ? await listRes.json() : null;
        if (statsData && typeof statsData.active === 'number' && typeof statsData.processed === 'number') {
          setStats({ active: statsData.active, processed: statsData.processed });
        }
        if (Array.isArray(listData)) {
          setNotifications(listData.slice(0, 5));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.loading}>Загрузка…</p>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Главная панель</h1>
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Активные уведомления</span>
          <span className={styles.cardValue}>{stats?.active ?? 0}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Обработанные</span>
          <span className={styles.cardValue}>{stats?.processed ?? 0}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <h2>Быстрые действия</h2>
        <div className={styles.buttons}>
          <Link to="/notifications" className={styles.btn}>
            Все уведомления
          </Link>
          <Link to="/send-message" className={styles.btn}>
            Отправить заявку
          </Link>
        </div>
      </div>
      <section className={styles.section}>
        <h2>Последние события</h2>
        {notifications.length === 0 ? (
          <p className={styles.empty}>Нет уведомлений</p>
        ) : (
          <ul className={styles.list}>
            {notifications.map((n) => (
              <li key={n.id}>
                <Link to={`/notifications/${n.id}`}>
                  <span className={styles.status} data-status={n.status}>
                    {n.status}
                  </span>
                  {n.address} — {n.source}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../data/departments';
import styles from './NotificationDetail.module.css';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новое',
  IN_PROGRESS: 'В обработке',
  VERIFIED: 'Проверено',
  FALSE_ALARM: 'Ложное',
  CLOSED: 'Закрыто',
};

export default function NotificationDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [n, setN] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/notifications/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setN)
      .catch(() => setN(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (n) {
      setStatus(n.status);
      setDepartment(n.department ?? '');
      setComments(n.comments ?? '');
    }
  }, [n]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, department: department || null, comments }),
      });
      if (res.ok) setN(await res.json());
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className={styles.loading}>Загрузка…</p>;
  if (!n) return <p className={styles.error}>Уведомление не найдено</p>;

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  return (
    <div className={styles.page}>
      <Link to="/notifications" className={styles.back}>← К списку</Link>
      <h1 className={styles.title}>Уведомление</h1>
      <div className={styles.card}>
        <dl className={styles.dl}>
          <dt>Дата и время</dt>
          <dd>{new Date(n.createdAt).toLocaleString('ru')}</dd>
          <dt>Источник сигнала</dt>
          <dd>{n.source}</dd>
          <dt>Адрес объекта</dt>
          <dd>{n.address}</dd>
          <dt>Отделение</dt>
          <dd>{n.department ?? '—'}</dd>
          <dt>Статус</dt>
          <dd>
            <span className={styles.status} data-status={n.status}>
              {STATUS_LABELS[n.status] ?? n.status}
            </span>
          </dd>
          {n.assignedTo && (
            <>
              <dt>Ответственный</dt>
              <dd>{n.assignedTo.name ?? n.assignedTo.login}</dd>
            </>
          )}
          {n.description && (
            <>
              <dt>Описание</dt>
              <dd>{n.description}</dd>
            </>
          )}
        </dl>
        {canEdit && (
          <div className={styles.edit}>
            <label>
              Статус
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Отделение
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">— не выбрано —</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label>
              Комментарии
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Комментарии..."
              />
            </label>
            <button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        )}
        <div className={styles.actions}>
          <Link to={`/send-message?notificationId=${n.id}`} className={styles.btn}>
            Отправить администратору
          </Link>
        </div>
      </div>
    </div>
  );
}

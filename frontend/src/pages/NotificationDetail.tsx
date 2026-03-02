import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../data/departments';
import { PROBLEM_TYPES } from '../data/problemTypes';
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
  const [saveError, setSaveError] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [comments, setComments] = useState('');
  const [source, setSource] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [problemType, setProblemType] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<{ id: string; login: string; name: string | null }[]>([]);
  const [commentList, setCommentList] = useState<any[]>([]);
  const [changelog, setChangelog] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'comments' | 'changelog'>('card');

  const loadNotification = () => {
    if (!id) return;
    apiFetch(`/api/notifications/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setN)
      .catch(() => setN(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadNotification();
  }, [id]);

  useEffect(() => {
    if (n) {
      setStatus(n.status);
      setDepartment(n.department ?? '');
      setComments(n.comments ?? '');
      setSource(n.source ?? '');
      setAddress(n.address ?? '');
      setDescription(n.description ?? '');
      setProblemType(n.problemType ?? '');
      setAssignedToId(n.assignedToId ?? '');
    }
  }, [n]);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/notifications/${id}/comments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCommentList(Array.isArray(data) ? data : []))
      .catch(() => setCommentList([]));
    apiFetch(`/api/notifications/${id}/changelog`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setChangelog(Array.isArray(data) ? data : []))
      .catch(() => setChangelog([]));
  }, [id, n]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    apiFetch('/api/users')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, [user?.role]);

  const handleSave = async () => {
    if (!id) return;
    setSaveError('');
    setSaving(true);
    try {
      const res = await apiFetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          department: department || null,
          comments,
          source: source.trim() || undefined,
          address: address.trim() || undefined,
          description: description.trim() || null,
          problemType: problemType || null,
          assignedToId: user?.role === 'ADMIN' ? (assignedToId || null) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setN(data);
      } else {
        setSaveError(data.error ?? 'Ошибка сохранения');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка';
      setSaveError(msg === 'Failed to fetch' ? 'Сервер недоступен. Запустите backend.' : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;
    setAddingComment(true);
    try {
      const res = await apiFetch(`/api/notifications/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCommentList((prev) => [...prev, data]);
        setNewComment('');
      }
    } finally {
      setAddingComment(false);
    }
  };

  if (loading) return <p className={styles.loading}>Загрузка…</p>;
  if (!n) return <p className={styles.error}>Уведомление не найдено</p>;

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OPERATOR';
  const isObserver = user?.role === 'OBSERVER';

  return (
    <div className={styles.page}>
      <Link to="/notifications" className={styles.back}>← К списку</Link>
      <h1 className={styles.title}>Карточка обращения</h1>
      <div className={styles.card}>
        <dl className={styles.dl}>
          <dt>Дата и время</dt>
          <dd>{new Date(n.createdAt).toLocaleString('ru')}</dd>
          <dt>Источник</dt>
          <dd>{n.source}</dd>
          <dt>Адрес / местонахождение</dt>
          <dd>{n.address}</dd>
          <dt>Структурное подразделение</dt>
          <dd>{n.department ?? '—'}</dd>
          <dt>Тип проблемы</dt>
          <dd>{n.problemType ?? '—'}</dd>
          <dt>Статус</dt>
          <dd>
            <span className={styles.status} data-status={n.status}>
              {STATUS_LABELS[n.status] ?? n.status}
            </span>
          </dd>
          {n.createdBy && (
            <>
              <dt>Автор обращения</dt>
              <dd>{n.createdBy.name ?? n.createdBy.login}</dd>
            </>
          )}
          {n.assignedTo && (
            <>
              <dt>Ответственный (зона ответственности)</dt>
              <dd>{n.assignedTo.name ?? n.assignedTo.login}</dd>
            </>
          )}
          {n.description && (
            <>
              <dt>Описание</dt>
              <dd>{n.description}</dd>
            </>
          )}
          {n.comments && (
            <>
              <dt>Комментарии (общие)</dt>
              <dd>{n.comments}</dd>
            </>
          )}
        </dl>
        {canEdit && (
          <div className={styles.edit}>
            <h3 className={styles.editTitle}>Редактирование заявки</h3>
            <label>
              Источник
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)} />
            </label>
            <label>
              Адрес / местонахождение
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label>
              Статус
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Структурное подразделение
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">— не выбрано —</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label>
              Тип проблемы
              <select value={problemType} onChange={(e) => setProblemType(e.target.value)}>
                <option value="">— не выбрано —</option>
                {PROBLEM_TYPES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            {user?.role === 'ADMIN' && (
              <label>
                Ответственный (назначение по зоне ответственности)
                <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
                  <option value="">— не назначен —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.login}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Описание
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </label>
            <label>
              Комментарии (общее поле)
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} placeholder="Комментарии..." />
            </label>
            {saveError && <p className={styles.error}>{saveError}</p>}
            <button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        )}
        {!isObserver && (
          <div className={styles.actions}>
            <Link to={`/send-message?notificationId=${n.id}`} className={styles.btn}>
              Отправить администратору
            </Link>
          </div>
        )}
      </div>

      <div className={styles.tabs}>
        <button type="button" className={activeTab === 'card' ? styles.tabActive : ''} onClick={() => setActiveTab('card')}>
          Карточка
        </button>
        <button type="button" className={activeTab === 'comments' ? styles.tabActive : ''} onClick={() => setActiveTab('comments')}>
          Комментарии ({commentList.length})
        </button>
        <button type="button" className={activeTab === 'changelog' ? styles.tabActive : ''} onClick={() => setActiveTab('changelog')}>
          Журнал изменений
        </button>
      </div>

      {activeTab === 'comments' && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Диалог по заявке</h3>
          {commentList.length === 0 ? (
            <p className={styles.muted}>Нет комментариев</p>
          ) : (
            <ul className={styles.commentList}>
              {commentList.map((c) => (
                <li key={c.id}>
                  <strong>{c.user?.name ?? c.user?.login}</strong>{' '}
                  <span className={styles.muted}>{new Date(c.createdAt).toLocaleString('ru')}</span>
                  <p>{c.text}</p>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form onSubmit={handleAddComment} className={styles.commentForm}>
              <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={2} placeholder="Новый комментарий..." required />
              <button type="submit" disabled={addingComment || !newComment.trim()}>
                {addingComment ? 'Отправка…' : 'Добавить комментарий'}
              </button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'changelog' && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Журнал изменений</h3>
          {changelog.length === 0 ? (
            <p className={styles.muted}>Нет записей</p>
          ) : (
            <ul className={styles.changelogList}>
              {changelog.map((log) => (
                <li key={log.id}>
                  <span className={styles.muted}>{new Date(log.createdAt).toLocaleString('ru')}</span>{' '}
                  <strong>{log.user?.name ?? log.user?.login}</strong>: {log.action}
                  {log.details && <span className={styles.muted}> — {log.details}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

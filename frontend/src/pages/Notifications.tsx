import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../data/departments';
import styles from './Notifications.module.css';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новое',
  IN_PROGRESS: 'В обработке',
  VERIFIED: 'Проверено',
  FALSE_ALARM: 'Ложное',
  CLOSED: 'Закрыто',
};

export default function Notifications() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createSource, setCreateSource] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createDepartment, setCreateDepartment] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('');

  const canCreate = user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (search.trim()) params.set('search', search.trim());
    apiFetch(`/api/notifications?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.resolve([])))
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status, from, to, departmentFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!createSource.trim() || !createAddress.trim()) {
      setCreateError('Укажите источник и адрес');
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: createSource.trim(),
          address: createAddress.trim(),
          department: createDepartment.trim() || undefined,
          description: createDescription.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Ошибка создания');
      }
      setShowCreate(false);
      setCreateSource('');
      setCreateAddress('');
      setCreateDepartment('');
      setCreateDescription('');
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка создания';
      setCreateError(msg === 'Failed to fetch' ? 'Сервер недоступен. Запустите backend.' : msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Уведомления</h1>
      <p className={styles.intro}>
        <strong>Что такое уведомление?</strong> Это запись о пожарном сигнале: откуда пришёл сигнал (источник), адрес объекта и при необходимости описание. Уведомление создаёт оператор или администратор. После создания все админы с включённым Telegram получают сообщение в бота. Статус можно менять: Новое → В обработке → Проверено / Ложное / Закрыто. Ответственного назначает администратор.
      </p>
      {canCreate && (
        <div className={styles.createBlock}>
          {!showCreate ? (
            <button type="button" onClick={() => setShowCreate(true)} className={styles.addBtn}>
              Создать уведомление
            </button>
          ) : (
            <div className={styles.createFormWrap}>
              <h2 className={styles.createTitle}>Новое уведомление</h2>
              <form onSubmit={handleCreate} className={styles.createForm}>
                <label>
                  Источник сигнала *
                  <input
                    type="text"
                    value={createSource}
                    onChange={(e) => setCreateSource(e.target.value)}
                    placeholder="Например: ПС, АПС, вызов 101"
                    required
                  />
                </label>
                <label>
                  Адрес объекта *
                  <input
                    type="text"
                    value={createAddress}
                    onChange={(e) => setCreateAddress(e.target.value)}
                    placeholder="Адрес объекта"
                    required
                  />
                </label>
                <label>
                  Отделение
                  <select
                    value={createDepartment}
                    onChange={(e) => setCreateDepartment(e.target.value)}
                  >
                    <option value="">— не выбрано —</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Описание (необязательно)
                  <textarea
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Дополнительные сведения"
                    rows={2}
                  />
                </label>
                {createError && <p className={styles.createError}>{createError}</p>}
                <div className={styles.createActions}>
                  <button type="submit" disabled={creating}>
                    {creating ? 'Создание…' : 'Создать'}
                  </button>
                  <button type="button" onClick={() => { setShowCreate(false); setCreateError(''); }}>
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      <div className={styles.filters}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по источнику, адресу..."
          />
          <button type="submit">Поиск</button>
        </form>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="">Все отделения</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <label>
          С
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          По
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {loading ? (
        <p className={styles.loading}>Загрузка…</p>
      ) : list.length === 0 ? (
        <p className={styles.empty}>Нет уведомлений</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Источник</th>
                <th>Адрес</th>
                <th>Отделение</th>
                <th>Статус</th>
                <th>Ответственный</th>
              </tr>
            </thead>
            <tbody>
              {list.map((n) => (
                <tr key={n.id}>
                  <td>{new Date(n.createdAt).toLocaleString('ru')}</td>
                  <td>{n.source}</td>
                  <td>{n.address}</td>
                  <td>{n.department ?? '—'}</td>
                  <td>
                    <span className={styles.status} data-status={n.status}>
                      {STATUS_LABELS[n.status] ?? n.status}
                    </span>
                  </td>
                  <td>{n.assignedTo?.name ?? n.assignedTo?.login ?? '—'}</td>
                  <td>
                    <Link to={`/notifications/${n.id}`}>Подробнее</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

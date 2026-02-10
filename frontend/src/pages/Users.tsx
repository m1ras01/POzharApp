import { useEffect, useState } from 'react';
import { apiFetch } from '../context/AuthContext';
import styles from './Users.module.css';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  OPERATOR: 'Оператор',
  OBSERVER: 'Наблюдатель',
};

export default function Users() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    login: '',
    password: '',
    name: '',
    role: 'OPERATOR',
    telegramEnabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch('/api/users')
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({
      login: '',
      password: '',
      name: '',
      role: 'OPERATOR',
      telegramEnabled: false,
    });
    setError('');
    setModal('create');
  };

  const openEdit = (u: any) => {
    setEditingId(u.id);
    setForm({
      login: u.login,
      password: '',
      name: u.name ?? '',
      role: u.role,
      telegramEnabled: u.telegramEnabled ?? false,
    });
    setError('');
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? (res.status === 401 ? 'Войдите снова' : 'Ошибка создания'));
      }
      closeModal();
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка создания';
      const isNetwork = msg === 'Failed to fetch' || msg.includes('fetch');
      setError(isNetwork ? 'Сервер недоступен. Запустите backend (Запустить всё.bat).' : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSaving(true);
    try {
      const body: any = { name: form.name, role: form.role, telegramEnabled: form.telegramEnabled };
      if (form.password) body.password = form.password;
      const res = await apiFetch(`/api/users/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Ошибка сохранения');
      }
      closeModal();
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(msg === 'Failed to fetch' ? 'Сервер недоступен. Запустите backend.' : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить пользователя?')) return;
    const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Ошибка удаления');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Пользователи</h1>
        <button type="button" onClick={openCreate} className={styles.addBtn}>
          Создать пользователя
        </button>
      </div>
      {loading ? (
        <p className={styles.loading}>Загрузка…</p>
      ) : list.length === 0 ? (
        <p className={styles.empty}>Нет пользователей</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Логин</th>
                <th>Имя</th>
                <th>Роль</th>
                <th>Telegram</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.login}</td>
                  <td>{u.name ?? '—'}</td>
                  <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td>{u.telegramId ? 'привязан' : '—'}</td>
                  <td>
                    <button type="button" onClick={() => openEdit(u)} className={styles.linkBtn}>
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id)}
                      className={styles.dangerBtn}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'create' ? 'Создание пользователя' : 'Редактирование'}</h2>
            <form onSubmit={modal === 'create' ? handleCreate : handleEdit} className={styles.form}>
              <label>
                Логин
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
                  required
                  disabled={modal === 'edit'}
                />
              </label>
              {modal === 'create' && (
                <label>
                  Пароль
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </label>
              )}
              {modal === 'edit' && (
                <label>
                  Новый пароль (оставьте пустым, чтобы не менять)
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </label>
              )}
              <label>
                Имя
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label>
                Роль
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              {modal === 'edit' && (
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.telegramEnabled}
                    onChange={(e) => setForm((f) => ({ ...f, telegramEnabled: e.target.checked }))}
                  />
                  Уведомления в Telegram включены
                </label>
              )}
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.buttons}>
                <button type="submit" disabled={saving}>
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
                <button type="button" onClick={closeModal}>
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

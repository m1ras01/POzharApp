import { useState, useEffect } from 'react';
import { apiFetch } from '../context/AuthContext';
import styles from './Reports.module.css';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новое',
  IN_PROGRESS: 'В обработке',
  VERIFIED: 'Проверено',
  FALSE_ALARM: 'Ложное',
  CLOSED: 'Закрыто',
};

export default function Reports() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  type ReportsPageData = {
    period: { from: string; to: string };
    total: number;
    byStatus: Record<string, number>;
    notifications: any[];
  };
  const [data, setData] = useState<ReportsPageData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    apiFetch(`/api/reports?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
      .then((data: ReportsPageData | null) => {
        if (data && typeof data.total === 'number' && Array.isArray(data.notifications)) {
          setData(data);
        } else {
          setData(null);
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const exportText = () => {
    if (!data) return;
    const lines = [
      `Отчёт FireNotify за период ${data.period.from} — ${data.period.to}`,
      `Всего уведомлений: ${data.total}`,
      '',
      'По статусам:',
      ...Object.entries(data.byStatus).map(([k, v]) => `  ${STATUS_LABELS[k] ?? k}: ${v}`),
      '',
      'Список уведомлений:',
      ...data.notifications.map(
        (n) =>
          `${new Date(n.createdAt).toLocaleString('ru')} | ${n.status} | ${n.source} | ${n.address} | ${n.department ?? '—'}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firenotify-report-${from}-${to}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Отчёты</h1>
      <form onSubmit={handleGenerate} className={styles.form}>
        <label>
          Период с
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          по
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Загрузка…' : 'Сформировать отчёт'}
        </button>
      </form>
      {data && (
        <div className={styles.result}>
          <h2>Результат</h2>
          <p>
            Период: {new Date(data.period.from).toLocaleDateString('ru')} — {new Date(data.period.to).toLocaleDateString('ru')}. Всего уведомлений: {data.total}.
          </p>
          <div className={styles.byStatus}>
            {Object.entries(data.byStatus).map(([k, v]) => (
              <span key={k} className={styles.badge}>
                {STATUS_LABELS[k] ?? k}: {v}
              </span>
            ))}
          </div>
          <div className={styles.export}>
            <button type="button" onClick={exportText}>
              Экспорт в TXT
            </button>
            <p className={styles.hint}>Экспорт в PDF/Excel — в следующей версии (библиотеки на фронте или API).</p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Статус</th>
                  <th>Источник</th>
                  <th>Адрес</th>
                  <th>Отделение</th>
                  <th>Ответственный</th>
                </tr>
              </thead>
              <tbody>
                {data.notifications.map((n) => (
                  <tr key={n.id}>
                    <td>{new Date(n.createdAt).toLocaleString('ru')}</td>
                    <td>{STATUS_LABELS[n.status] ?? n.status}</td>
                    <td>{n.source}</td>
                    <td>{n.address}</td>
                    <td>{n.department ?? '—'}</td>
                    <td>{n.assignedTo?.name ?? n.assignedTo?.login ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

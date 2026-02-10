import { useState, useEffect, useRef, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import { WORK_OBJECTS } from '../data/workObjects';
import styles from './SendMessage.module.css';

/** Быстрые темы — вставляются в поле «Тема». */
const QUICK_SUBJECTS = [
  'Рапорт',
  'Доклад о выполнении',
  'Уведомление',
  'Требуется решение',
  'Замечания',
  'Отчёт',
];

/** Быстрые фразы — вставляются в текст заявки (в конец). */
const QUICK_PHRASES = [
  'Работы выполнены в полном объёме.',
  'Требуется проверка на объекте.',
  'Замечания устранены.',
  'Ситуация под контролем.',
  'Докладываю о выполнении работ.',
  'Ожидаю указаний.',
  'Выезд на объект выполнен.',
  'Обход территории проведён, замечаний нет.',
  'Пожарная безопасность обеспечена.',
  'Сообщаю о завершении смены.',
  'Необходимо согласование.',
  'Работы приостановлены до получения указаний.',
];

export default function SendMessage() {
  const [searchParams] = useSearchParams();
  const notificationId = searchParams.get('notificationId');
  const [workObject, setWorkObject] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (notificationId) {
      setSubject(`Уведомление #${notificationId.slice(-6)}`);
    }
  }, [notificationId]);

  const insertSubject = (text: string) => {
    setSubject((prev) => (prev ? `${prev}. ${text}` : text));
  };

  const insertBody = (text: string) => {
    setBody((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!ok) {
      setError('Разрешены только фото (JPG, PNG и т.д.) и PDF');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Файл не более 15 МБ');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Ошибка загрузки');
      }
      const data = await res.json();
      setAttachmentUrl(data.url ?? '');
      setAttachmentName(data.filename ?? file.name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки файла';
      let friendly = msg;
      if (msg === 'Failed to fetch') {
        friendly = 'Сервер недоступен. Запустите backend и обновите страницу.';
      } else if (msg === 'Требуется авторизация') {
        friendly = 'Сессия истекла. Выйдите и войдите снова (Выйти → войти заново).';
      }
      setError(friendly);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const clearAttachment = () => {
    setAttachmentUrl('');
    setAttachmentName('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workObject: workObject || undefined,
          subject: subject || undefined,
          body,
          attachmentUrl: attachmentUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error ?? (res.status === 401 ? 'Требуется авторизация. Выйдите и войдите снова.' : 'Ошибка отправки');
        throw new Error(msg);
      }
      setSent(true);
      setBody('');
      setSubject('');
      setWorkObject('');
      setAttachmentUrl('');
      setAttachmentName('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка отправки';
      const isNetwork = msg === 'Failed to fetch' || (err instanceof TypeError && (err as Error).message?.includes('fetch'));
      setError(isNetwork
        ? 'Сервер недоступен. Запустите backend (порт 3001): дважды щёлкните «Запустить всё.bat» в папке проекта и дождитесь запуска.'
        : msg);
      console.error('Send message error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Отправка заявки</h1>
        <div className={styles.success}>
          Заявка отправлена.
          <button type="button" onClick={() => setSent(false)}>Отправить ещё</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Отправка заявки</h1>
      <p className={styles.hint}>Заявка уйдёт всем администраторам (и в Telegram при включённых уведомлениях). Укажите объект и текст.</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Объект для выполнения работ
          <select
            value={workObject}
            onChange={(e) => setWorkObject(e.target.value)}
            required
          >
            <option value="">Выберите объект</option>
            {WORK_OBJECTS.map((obj) => (
              <option key={obj} value={obj}>
                {obj}
              </option>
            ))}
          </select>
        </label>
        <label>
          Тема
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Тема заявки"
          />
        </label>
        <div className={styles.quickSection}>
          <span className={styles.quickLabel}>Быстрые темы:</span>
          <div className={styles.quickChips}>
            {QUICK_SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.quickChip}
                onClick={() => insertSubject(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <label>
          Текст заявки
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            placeholder="Введите текст..."
          />
        </label>
        <div className={styles.quickSection}>
          <span className={styles.quickLabel}>Быстрые фразы (вставить в текст):</span>
          <div className={styles.quickChips}>
            {QUICK_PHRASES.map((p) => (
              <button
                key={p}
                type="button"
                className={styles.quickChip}
                onClick={() => insertBody(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.attachmentSection}>
          <span className={styles.quickLabel}>Фото или PDF (до 15 МБ)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className={styles.fileInput}
          />
          {attachmentName && (
            <div className={styles.attachmentRow}>
              <span className={styles.attachmentName}>📎 {attachmentName}</span>
              <button type="button" className={styles.quickChip} onClick={clearAttachment}>
                Удалить
              </button>
            </div>
          )}
          {uploading && <span className={styles.uploading}>Загрузка…</span>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Отправка…' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}

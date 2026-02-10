import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import styles from './Messages.module.css';

type Message = {
  id: string;
  workObject?: string | null;
  subject: string | null;
  body: string;
  attachmentUrl?: string | null;
  readAt: string | null;
  createdAt: string;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
  adminRepliedBy?: { id: string; login: string; name: string | null } | null;
  sender?: { id: string; login: string; name: string | null };
  recipient?: { id: string; login: string; name: string | null };
};

export default function Messages() {
  const { user } = useAuth();
  const [received, setReceived] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const attachmentBlobUrlRef = useRef<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
  const quickReplies = ['Ваше сообщение проверили.', 'Спец отправляется.', 'Посмотрим.', 'Принято в работу.'];
  const [botLink, setBotLink] = useState<string | null>(null);
  useEffect(() => {
    if (isAdmin) return;
    apiFetch('/api/settings/telegram/bot-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.botLink && setBotLink(data.botLink))
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!selected?.attachmentUrl) {
      if (attachmentBlobUrlRef.current) {
        URL.revokeObjectURL(attachmentBlobUrlRef.current);
        attachmentBlobUrlRef.current = null;
      }
      setAttachmentPreviewUrl(null);
      return;
    }
    const filename = selected.attachmentUrl.replace(/^uploads\/?/, '');
    if (!filename) {
      setAttachmentPreviewUrl(null);
      return;
    }
    let cancelled = false;
    apiFetch(`/api/upload/${filename}`)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        if (attachmentBlobUrlRef.current) {
          URL.revokeObjectURL(attachmentBlobUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        attachmentBlobUrlRef.current = url;
        setAttachmentPreviewUrl(url);
      })
      .catch(() => setAttachmentPreviewUrl(null));
    return () => {
      cancelled = true;
      if (attachmentBlobUrlRef.current) {
        URL.revokeObjectURL(attachmentBlobUrlRef.current);
        attachmentBlobUrlRef.current = null;
      }
      setAttachmentPreviewUrl(null);
    };
  }, [selected?.id, selected?.attachmentUrl]);

  const load = () => {
    setLoading(true);
    apiFetch('/api/messages')
      .then((r) => (r.ok ? r.json() : Promise.resolve({ sent: [], received: [] })))
      .then((data: { sent?: Message[]; received?: Message[] }) => {
        setReceived(Array.isArray(data?.received) ? data.received : []);
        setSent(Array.isArray(data?.sent) ? data.sent : []);
      })
      .catch(() => { setReceived([]); setSent([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Для админа: раз в 30 сек обновляем список, чтобы новые заявки из Telegram появлялись в интерфейсе
  useEffect(() => {
    if (!isAdmin) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [isAdmin]);

  const openMessage = (msg: Message) => {
    setSelected(msg);
    setReplyText('');
    const canMarkRead =
      !msg.readAt &&
      (msg.recipient?.id === user?.id || (msg.recipient == null && user?.role === 'ADMIN'));
    if (canMarkRead) {
      apiFetch(`/api/messages/${msg.id}/read`, { method: 'PATCH' }).then(() => load());
    }
  };

  const sendReply = () => {
    if (!selected || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    apiFetch(`/api/messages/${selected.id}/reply`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyText.trim() }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Ошибка'))))
      .then((updated: Message) => {
        setSelected(updated);
        setReplyText('');
        load();
      })
      .catch(() => {})
      .finally(() => setSendingReply(false));
  };

  if (loading) return <p className={styles.loading}>Загрузка…</p>;

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          {isAdmin ? 'Входящие заявки (проверка)' : 'Заявки'}
        </h1>
        <button type="button" onClick={() => load()} disabled={loading} className={styles.refreshBtn}>
          Обновить
        </button>
      </div>
      <p className={styles.hint}>
        {isAdmin
          ? 'Заявки от операторов приходят в блок «Входящие» ниже. Уведомление о новой заявке приходит в Telegram; здесь нажмите «Обновить», чтобы увидеть её в списке.'
          : 'Отправленные и полученные заявки. Ответы администратора приходят здесь и в Telegram, если привязать бота в Настройках.'}
      </p>
      {!isAdmin && botLink && (
        <p className={styles.telegramHint}>
          <a href={botLink} target="_blank" rel="noopener noreferrer" className={styles.telegramLink}>
            Открыть бота в Telegram
          </a>
          {' — чтобы получать ответы админа в мессенджере. '}
          <Link to="/settings" className={styles.telegramLink}>Привязать в Настройках</Link>
        </p>
      )}

      <section className={styles.section}>
        <h2>Входящие</h2>
        {received.length === 0 ? (
          <p className={styles.empty}>Нет входящих заявок</p>
        ) : (
          <ul className={styles.list}>
            {received.map((msg) => (
              <li
                key={msg.id}
                className={selected?.id === msg.id ? styles.selected : ''}
                onClick={() => openMessage(msg)}
              >
                <span className={styles.unread}>{!msg.readAt ? '• ' : ''}</span>
                <span className={styles.sender}>
                  {msg.sender?.name ?? msg.sender?.login ?? '—'}
                </span>
                {msg.workObject && (
                  <span className={styles.workObject}>{msg.workObject}</span>
                )}
                <span className={styles.subject}>{msg.subject || '(без темы)'}</span>
                <span className={styles.date}>
                  {new Date(msg.createdAt).toLocaleString('ru')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <div className={styles.detail}>
          <h3>{selected.subject || '(без темы)'}</h3>
          <p className={styles.meta}>
            От: {selected.sender?.name ?? selected.sender?.login ?? '—'} •{' '}
            {new Date(selected.createdAt).toLocaleString('ru')}
            {selected.readAt && ' • Прочитано'}
          </p>
          {selected.workObject && (
            <p className={styles.meta}>
              <strong>Объект:</strong> {selected.workObject}
            </p>
          )}
          <div className={styles.body}>{selected.body}</div>
          {selected.adminReply && (
            <div className={styles.adminReply}>
              <strong>Ответ администратора</strong>
              {selected.adminRepliedAt && (
                <span className={styles.adminReplyDate}>
                  {' '}
                  {new Date(selected.adminRepliedAt).toLocaleString('ru')}
                  {selected.adminRepliedBy && ` — ${selected.adminRepliedBy.name ?? selected.adminRepliedBy.login}`}
                </span>
              )}
              <p className={styles.adminReplyText}>{selected.adminReply}</p>
            </div>
          )}
          {isAdmin && !selected.adminReply && (
            <div className={styles.replyForm}>
              <label className={styles.replyLabel}>Ответить оператору (фидбек придёт в интерфейс и в Telegram):</label>
              <div className={styles.quickReplies}>
                {quickReplies.map((text) => (
                  <button
                    key={text}
                    type="button"
                    className={styles.quickReplyBtn}
                    onClick={() => setReplyText(text)}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <textarea
                className={styles.replyTextarea}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Или введите свой ответ..."
                rows={3}
              />
              <button
                type="button"
                className={styles.sendReplyBtn}
                onClick={sendReply}
                disabled={!replyText.trim() || sendingReply}
              >
                {sendingReply ? 'Отправка…' : 'Отправить ответ'}
              </button>
            </div>
          )}
          {selected.attachmentUrl && (
            <div className={styles.attachment}>
              <span className={styles.attachmentLabel}>Вложение:</span>
              {attachmentPreviewUrl &&
              (selected.attachmentUrl.match(/\.(jpe?g|png|gif|webp)$/i) ?? []).length > 0 ? (
                <img src={attachmentPreviewUrl} alt="Вложение" className={styles.attachmentImage} />
              ) : (
                <span className={styles.attachmentLink}>
                  📎 {selected.attachmentUrl.replace(/^uploads\/?/, '')}
                  {attachmentPreviewUrl && (
                    <a href={attachmentPreviewUrl} download={selected.attachmentUrl.replace(/^uploads\/?/, '')} className={styles.downloadLink}>
                      Скачать
                    </a>
                  )}
                </span>
              )}
            </div>
          )}
          <button type="button" onClick={() => setSelected(null)} className={styles.close}>
            Закрыть
          </button>
        </div>
      )}

      <section className={styles.section}>
        <h2>Отправленные</h2>
        {sent.length === 0 ? (
          <p className={styles.empty}>Нет отправленных заявок</p>
        ) : (
          <ul className={styles.list}>
            {sent.map((msg) => (
              <li
                key={msg.id}
                className={selected?.id === msg.id ? styles.selected : ''}
                onClick={() => openMessage(msg)}
              >
                {msg.adminReply && <span className={styles.hasReply}>✓ Ответ</span>}
                <span className={styles.recipient}>
                  Кому: {msg.recipient ? (msg.recipient.name ?? msg.recipient.login) : 'Всем админам'}
                </span>
                <span className={styles.subject}>{msg.subject || '(без темы)'}</span>
                <span className={styles.date}>
                  {new Date(msg.createdAt).toLocaleString('ru')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

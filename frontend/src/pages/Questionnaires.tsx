import { useState, FormEvent } from 'react';
import { apiFetch } from '../context/AuthContext';
import { WORK_OBJECTS } from '../data/workObjects';
import {
  QUESTIONNAIRE_TEMPLATES,
  type QuestionnaireTemplate,
  type QuestionnaireField,
} from '../data/questionnaires';
import styles from './Questionnaires.module.css';

export default function Questionnaires() {
  const [selected, setSelected] = useState<QuestionnaireTemplate | null>(null);
  const [workObject, setWorkObject] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const openTemplate = (t: QuestionnaireTemplate) => {
    setSelected(t);
    setAnswers({});
    setError('');
  };

  const setAnswer = (fieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const formatBody = (template: QuestionnaireTemplate): string => {
    const lines: string[] = [`Опросник: ${template.title}`, ''];
    template.fields.forEach((f) => {
      const value = answers[f.id]?.trim() || '—';
      lines.push(`${f.label}: ${value}`);
    });
    return lines.join('\n');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setLoading(true);
    try {
      const body = formatBody(selected);
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workObject: workObject.trim(),
          subject: selected.title,
          body,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Ошибка отправки');
      }
      setSent(true);
      setSelected(null);
      setAnswers({});
      setWorkObject('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка отправки';
      setError(msg === 'Failed to fetch' ? 'Сервер недоступен. Запустите backend.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (f: QuestionnaireField) => {
    const value = answers[f.id] ?? '';
    const setValue = (v: string) => setAnswer(f.id, v);
    if (f.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={f.placeholder}
          rows={3}
          required={f.required}
        />
      );
    }
    if (f.type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required={f.required}
        >
          <option value="">Выберите</option>
          {(f.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={f.placeholder}
        required={f.required}
      />
    );
  };

  if (sent) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Опросники</h1>
        <div className={styles.success}>
          Опросник отправлен администратору.
          <button type="button" onClick={() => setSent(false)}>
            Заполнить ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Опросники</h1>
      <p className={styles.hint}>
        Выберите шаблон опросника, заполните поля и отправьте отчёт администратору. Ответы будут отправлены как заявка.
      </p>

      {!selected ? (
        <div className={styles.list}>
          {QUESTIONNAIRE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={styles.card}
              onClick={() => openTemplate(t)}
            >
              <span className={styles.cardTitle}>{t.title}</span>
              <span className={styles.cardDesc}>{t.description}</span>
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>{selected.title}</h2>
            <p className={styles.formDesc}>{selected.description}</p>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setSelected(null)}
            >
              ← Другой опросник
            </button>
          </div>

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

          <div className={styles.fields}>
            <h3 className={styles.fieldsTitle}>Ответы</h3>
            {selected.fields.map((f) => (
              <label key={f.id}>
                {f.label}
                {f.required && ' *'}
                {renderField(f)}
              </label>
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setSelected(null)}>
              Отмена
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Отправка…' : 'Отправить опросник'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

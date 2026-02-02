/** Поле опросника */
export type QuestionnaireField = {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

/** Шаблон опросника */
export type QuestionnaireTemplate = {
  id: string;
  title: string;
  description: string;
  fields: QuestionnaireField[];
};

export const QUESTIONNAIRE_TEMPLATES: QuestionnaireTemplate[] = [
  {
    id: 'walkaround',
    title: 'Чек-лист обхода территории',
    description: 'Результаты обхода территории объекта',
    fields: [
      { id: 'date', label: 'Дата обхода', type: 'text', placeholder: 'ДД.ММ.ГГГГ', required: true },
      { id: 'time', label: 'Время', type: 'text', placeholder: 'ЧЧ:ММ', required: true },
      { id: 'area', label: 'Участок / зона', type: 'text', placeholder: 'Наименование участка', required: true },
      { id: 'result', label: 'Результат обхода', type: 'select', options: ['Без замечаний', 'Есть замечания', 'Требуется повторный обход'], required: true },
      { id: 'remarks', label: 'Замечания (если есть)', type: 'textarea', placeholder: 'Опишите замечания' },
      { id: 'signature', label: 'ФИО ответственного', type: 'text', placeholder: 'Фамилия И.О.', required: true },
    ],
  },
  {
    id: 'fire-safety-check',
    title: 'Отчёт о проверке пожарной безопасности',
    description: 'Проверка средств пожаротушения и эвакуации',
    fields: [
      { id: 'date', label: 'Дата проверки', type: 'text', placeholder: 'ДД.ММ.ГГГГ', required: true },
      { id: 'location', label: 'Место проверки (здание, этаж)', type: 'text', placeholder: 'Наименование', required: true },
      { id: 'extinguishers', label: 'Огнетушители', type: 'select', options: ['В норме', 'Требуется перезарядка', 'Отсутствуют'], required: true },
      { id: 'hydrants', label: 'Пожарные краны', type: 'select', options: ['В норме', 'Неисправны', 'Не проверялись'], required: true },
      { id: 'evacuation', label: 'Эвакуационные выходы', type: 'select', options: ['Свободны', 'Заблокированы', 'Частично заняты'], required: true },
      { id: 'remarks', label: 'Замечания и рекомендации', type: 'textarea', placeholder: 'Текст' },
      { id: 'inspector', label: 'ФИО проверяющего', type: 'text', placeholder: 'Фамилия И.О.', required: true },
    ],
  },
  {
    id: 'shift-report',
    title: 'Анкета смены',
    description: 'Отчёт о смене и передача дежурства',
    fields: [
      { id: 'date', label: 'Дата смены', type: 'text', placeholder: 'ДД.ММ.ГГГГ', required: true },
      { id: 'shift', label: 'Смена', type: 'select', options: ['Дневная', 'Ночная', 'Суточная'], required: true },
      { id: 'incidents', label: 'Происшествия за смену', type: 'select', options: ['Не было', 'Был сигнал', 'Был выезд', 'Другое'], required: true },
      { id: 'incidents_detail', label: 'Подробности (если были)', type: 'textarea', placeholder: 'Опишите' },
      { id: 'handover', label: 'Передача смены / замечания для следующей смены', type: 'textarea', placeholder: 'Текст' },
      { id: 'operator', label: 'ФИО оператора', type: 'text', placeholder: 'Фамилия И.О.', required: true },
    ],
  },
  {
    id: 'object-status',
    title: 'Уведомление о состоянии объекта',
    description: 'Текущее состояние объекта и оборудования',
    fields: [
      { id: 'date', label: 'Дата', type: 'text', placeholder: 'ДД.ММ.ГГГГ', required: true },
      { id: 'status', label: 'Общее состояние', type: 'select', options: ['Норма', 'Требуется внимание', 'Аварийная ситуация'], required: true },
      { id: 'equipment', label: 'Состояние оборудования', type: 'select', options: ['В работе', 'Резерв', 'Неисправно', 'На ремонте'], required: true },
      { id: 'details', label: 'Подробности', type: 'textarea', placeholder: 'Опишите состояние, замечания' },
      { id: 'reporter', label: 'ФИО составившего', type: 'text', placeholder: 'Фамилия И.О.', required: true },
    ],
  },
  {
    id: 'instruction-completion',
    title: 'Выполнение предписания / указания',
    description: 'Отчёт об исполнении полученного указания',
    fields: [
      { id: 'date', label: 'Дата исполнения', type: 'text', placeholder: 'ДД.ММ.ГГГГ', required: true },
      { id: 'instruction_ref', label: 'Номер/суть предписания', type: 'text', placeholder: 'Ссылка на указание', required: true },
      { id: 'done', label: 'Выполнено', type: 'select', options: ['Полностью', 'Частично', 'Не выполнено (причина ниже)'], required: true },
      { id: 'comment', label: 'Комментарий / примечания', type: 'textarea', placeholder: 'Текст' },
      { id: 'executor', label: 'ФИО исполнителя', type: 'text', placeholder: 'Фамилия И.О.', required: true },
    ],
  },
];

export type Lang = 'ko' | 'en' | 'zh' | 'ru';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'ru', label: 'RU' },
];

interface Strings {
  report: string; selectAll: string; download: string; wechatHint: string;
  date: string; customer: string; route: string; photos: string; unit: string;
  documents: string; noDocs: string; invalid: string;
}

export const T: Record<Lang, Strings> = {
  ko: { report: '증빙 리포트', selectAll: '전체 선택', download: '선택 사진 다운로드', wechatHint: '위챗에서 스캔해 여세요', date: '작업일', customer: '거래처', route: '루트', photos: '사진', unit: '장', documents: '서류', noDocs: '첨부 없음', invalid: '잘못된 링크입니다.' },
  en: { report: 'Inspection Report', selectAll: 'Select all', download: 'Download selected', wechatHint: 'Scan in WeChat', date: 'Date', customer: 'Client', route: 'Route', photos: 'Photos', unit: '', documents: 'Documents', noDocs: 'No documents', invalid: 'Invalid link.' },
  zh: { report: '查验报告', selectAll: '全选', download: '下载所选照片', wechatHint: '在微信中扫描', date: '作业日期', customer: '客户', route: '路线', photos: '照片', unit: '张', documents: '文件', noDocs: '无附件', invalid: '链接无效。' },
  ru: { report: 'Отчёт о проверке', selectAll: 'Выбрать все', download: 'Скачать выбранные', wechatHint: 'Отсканируйте в WeChat', date: 'Дата', customer: 'Клиент', route: 'Маршрут', photos: 'Фото', unit: '', documents: 'Документы', noDocs: 'Нет вложений', invalid: 'Недействительная ссылка.' },
};

// Required-photo slot labels (matches TSR/TCR templates) + damage.
export const SLOT_LABELS: Record<string, Partial<Record<Lang, string>>> = {
  empty: { ko: '빈 컨테이너', en: 'Empty container', zh: '空箱', ru: 'Пустой контейнер' },
  half: { ko: '절반 적재', en: 'Half loaded', zh: '半载', ru: 'Половина загрузки' },
  full: { ko: '만재', en: 'Fully loaded', zh: '满载', ru: 'Полная загрузка' },
  shoring: { ko: '쇼링·고박 후', en: 'After shoring/lashing', zh: '固定后', ru: 'После крепления' },
  one_door: { ko: '한쪽 문 닫힘', en: 'One door closed', zh: '单门关闭', ru: 'Одна дверь закрыта' },
  sealed: { ko: '봉인 완료', en: 'Sealed', zh: '铅封完成', ru: 'Опломбировано' },
  seal: { ko: '씰 근접', en: 'Seal close-up', zh: '铅封特写', ru: 'Пломба крупным планом' },
  csc: { ko: 'CSC 명판', en: 'CSC plate', zh: 'CSC 铭牌', ru: 'Табличка CSC' },
  damage: { ko: '데미지', en: 'Damage', zh: '损坏', ru: 'Повреждение' },
};

/** Translated slot label, falling back to the manifest's stored (Korean) label. */
export function photoLabel(slotKey: string | null, fallback: string, lang: Lang): string {
  const t = slotKey ? SLOT_LABELS[slotKey]?.[lang] : undefined;
  return t ?? fallback;
}

import dayjs from 'dayjs';

/**
 * 统一时间格式化工具 - 处理后端返回的时间字符串
 *
 * 问题描述：
 * 后端返回的时间字符串格式为 "2025-12-30T19:08:30"（无时区信息）
 * JavaScript 默认将其当作 UTC 时间解析，导致显示时晚8小时
 *
 * 解决方案：
 * 为无时区后缀的时间字符串添加 "+08:00" 标识，表明这是 UTC+8 时区的时间
 */

/**
 * 格式化日期时间
 * @param dateString - 后端返回的时间字符串或Date对象
 * @param format - dayjs 格式化字符串，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的时间字符串
 */
export const formatDateTime = (
  dateString: string | Date | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!dateString) return '-';

  try {
    // 处理 Date 对象
    const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();

    // 后端返回格式: "2025-12-30T19:08:30" 或 "2025-12-30T19:08:30+08:00"
    // 如果没有时区后缀，添加 +08:00（中国时区 UTC+8）
    const normalizedDateStr = dateStr.includes('+')
      ? dateStr
      : dateStr.replace(/(\d{2}:\d{2}:\d{2})$/, '$1+08:00');

    return dayjs(normalizedDateStr).format(format);
  } catch (error) {
    console.error('时间格式化失败:', dateString, error);
    return String(dateString);
  }
};

/**
 * 格式化为相对时间（如"3分钟前"、"2小时前"）
 * @param dateString - 后端返回的时间字符串
 * @returns 相对时间字符串
 */
export const formatRelativeTime = (
  dateString: string | Date | null | undefined
): string => {
  if (!dateString) return '-';

  try {
    // 统一添加时区信息
    const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();
    const normalizedDateStr = dateStr.includes('+')
      ? dateStr
      : dateStr.replace(/(\d{2}:\d{2}:\d{2})$/, '$1+08:00');

    const date = dayjs(normalizedDateStr);
    const now = dayjs();

    const diffMinutes = now.diff(date, 'minute');
    const diffHours = now.diff(date, 'hour');
    const diffDays = now.diff(date, 'day');

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    // 超过7天显示完整日期
    return date.format('YYYY-MM-DD');
  } catch (error) {
    console.error('相对时间格式化失败:', dateString, error);
    return String(dateString);
  }
};

/**
 * 格式化为日期（不含时间）
 * @param dateString - 后端返回的时间字符串
 * @returns 格式化后的日期字符串
 */
export const formatDate = (
  dateString: string | Date | null | undefined
): string => {
  return formatDateTime(dateString, 'YYYY-MM-DD');
};

/**
 * 格式化为短时间（不含日期）
 * @param dateString - 后端返回的时间字符串
 * @returns 格式化后的时间字符串
 */
export const formatTime = (
  dateString: string | Date | null | undefined
): string => {
  return formatDateTime(dateString, 'HH:mm:ss');
};

/**
 * 获取友好的日期时间显示（根据时间差自动选择格式）
 * @param dateString - 后端返回的时间字符串
 * @returns 友好的时间显示
 */
export const formatFriendlyDateTime = (
  dateString: string | Date | null | undefined
): string => {
  if (!dateString) return '-';

  try {
    const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();
    const normalizedDateStr = dateStr.includes('+')
      ? dateStr
      : dateStr.replace(/(\d{2}:\d{2}:\d{2})$/, '$1+08:00');

    const date = dayjs(normalizedDateStr);
    const now = dayjs();

    // 如果是今天，显示时间
    if (date.isSame(now, 'day')) {
      return date.format('HH:mm:ss');
    }

    // 如果是今年，显示月-日 时:分
    if (date.isSame(now, 'year')) {
      return date.format('MM-DD HH:mm');
    }

    // 否则显示完整日期时间
    return date.format('YYYY-MM-DD HH:mm');
  } catch (error) {
    console.error('友好时间格式化失败:', dateString, error);
    return String(dateString);
  }
};

/**
 * 计算时间差（返回天数、小时数等）
 * @param startDate - 开始时间
 * @param endDate - 结束时间
 * @returns 时间差描述
 */
export const formatTimeDiff = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string => {
  if (!startDate || !endDate) return '-';

  try {
    const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString();
    const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString();

    const startNormalized = startStr.includes('+')
      ? startStr
      : startStr.replace(/(\d{2}:\d{2}:\d{2})$/, '$1+08:00');
    const endNormalized = endStr.includes('+')
      ? endStr
      : endStr.replace(/(\d{2}:\d{2}:\d{2})$/, '$1+08:00');

    const start = dayjs(startNormalized);
    const end = dayjs(endNormalized);
    const diffMs = end.diff(start);
    const diffSeconds = diffMs / 1000;
    const diffMinutes = diffSeconds / 60;
    const diffHours = diffMinutes / 60;
    const diffDays = diffHours / 24;

    if (diffDays >= 1) {
      return `${Math.floor(diffDays)}天${Math.floor(diffHours % 24)}小时`;
    } else if (diffHours >= 1) {
      return `${Math.floor(diffHours)}小时${Math.floor(diffMinutes % 60)}分钟`;
    } else if (diffMinutes >= 1) {
      return `${Math.floor(diffMinutes)}分钟`;
    } else {
      return `${Math.floor(diffSeconds)}秒`;
    }
  } catch (error) {
    console.error('时间差计算失败:', startDate, endDate, error);
    return '-';
  }
};

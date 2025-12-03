/**
 * 文件处理工具函数
 */

/**
 * 下载文件到本地
 * @param blob 文件数据
 * @param filename 文件名
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  try {
    // 创建临时URL
    const url = URL.createObjectURL(blob);

    // 创建临时下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;

    // 添加到DOM并触发点击
    document.body.appendChild(a);
    a.click();

    // 清理DOM和URL
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('文件下载失败:', error);
    throw new Error('文件下载失败');
  }
};

/**
 * 生成带时间戳的文件名
 * @param baseName 基础文件名
 * @param extension 文件扩展名
 * @param prefix 前缀（可选）
 * @returns 完整的文件名
 */
export const generateTimestampedFilename = (
  baseName: string,
  extension: string,
  prefix?: string
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const parts = [prefix, baseName, timestamp].filter(Boolean);
  return `${parts.join('_')}.${extension}`;
};

/**
 * 生成导出文件名
 * @param businessType 业务类型（可选）
 * @param format 文件格式
 * @returns 导出文件名
 */
export const generateExportFilename = (
  businessType?: string,
  format: string = 'xlsx'
): string => {
  const baseName = businessType
    ? `test_cases_${businessType.toLowerCase()}`
    : 'test_cases';

  return generateTimestampedFilename(baseName, format, 'export');
};

/**
 * 检查文件类型是否支持
 * @param mimeType 文件MIME类型
 * @param supportedTypes 支持的类型列表
 * @returns 是否支持
 */
export const isFileTypeSupported = (
  mimeType: string,
  supportedTypes: string[]
): boolean => {
  return supportedTypes.includes(mimeType);
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
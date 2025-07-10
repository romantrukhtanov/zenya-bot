export const pathToRedisKey = (filePath: string): string => {
  const trimmed = filePath.replace(/^\/+|\/+$/g, '');
  return trimmed.replace(/\//g, ':');
};

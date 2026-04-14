import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'vi'; // Default Vietnamese, switch via cookie/header later

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

const ENV = {
  dev: {
    // API_URL: process.env.EXPO_PUBLIC_API_URL_DEV || 'http://192.168.67.250:5211/api',
       API_URL: process.env.EXPO_PUBLIC_API_URL_DEV || 'http://10.0.1.254:5211/api',

//    API_URL: process.env.EXPO_PUBLIC_API_URL_DEV || 'https://localhost:7000/api',
    EXTERNAL_API_URL: process.env.EXPO_PUBLIC_EXTERNAL_API_URL_DEV || '',
  },
  prod: {
    API_URL: process.env.EXPO_PUBLIC_API_URL_PROD || 'https://tu-api-produccion.com/api',
    EXTERNAL_API_URL: process.env.EXPO_PUBLIC_EXTERNAL_API_URL_PROD || '',
  },
};

const currentEnv = __DEV__ ? ENV.dev : ENV.prod;

export default currentEnv;

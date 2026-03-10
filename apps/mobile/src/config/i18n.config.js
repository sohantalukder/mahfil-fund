import localStore from '@/services/storage/localStore.service';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Import translation files directly
import enEN from '../translations/en-EN.json';
import bnBN from '../translations/bn-BN.json';
const resources = {
    'en-EN': {
        translation: enEN,
    },
    'bn-BN': {
        translation: bnBN,
    },
};
i18n.use(initReactI18next).init({
    resources,
    returnNull: false,
    fallbackLng: 'en-EN',
    ns: ['translation'],
    defaultNS: 'translation',
    lng: localStore.getSystemLanguage(),
    returnEmptyString: false,
    interpolation: { escapeValue: false },
});
export default i18n;

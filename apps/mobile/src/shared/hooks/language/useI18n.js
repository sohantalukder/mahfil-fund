/* eslint-disable no-void */
import i18next from 'i18next';
const changeLanguage = (lang) => {
    void i18next.changeLanguage(lang);
};
const toggleLanguage = () => {
    void i18next.changeLanguage(i18next.language === "en-EN" /* SupportedLanguages.EN_EN */
        ? "bn-BN" /* SupportedLanguages.BN_BN */
        : "en-EN" /* SupportedLanguages.EN_EN */);
};
export const useI18n = () => {
    return { changeLanguage, toggleLanguage };
};

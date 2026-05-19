// client/src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import router from './router';
import './assets/main.css';

const APP_UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount('#app');

function checkForAppUpdate(registration) {
  if (!navigator.onLine) {
    return;
  }

  registration.update().catch(() => {});
}

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) {
      return;
    }

    checkForAppUpdate(registration);
    window.addEventListener('online', () => checkForAppUpdate(registration));
    window.setInterval(() => checkForAppUpdate(registration), APP_UPDATE_CHECK_INTERVAL);
  },
  onRegisterError(error) {
    console.error('Service worker registration failed', error);
  },
});

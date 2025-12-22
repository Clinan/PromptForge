import { createApp, ref, watch, h } from 'vue';
import Antd, { ConfigProvider, theme as antTheme } from 'ant-design-vue';
import App from './App.vue';
import 'ant-design-vue/dist/reset.css';
import './style.css';

const storedTheme = typeof window !== 'undefined' ? (localStorage.getItem('truestprompt-theme') as 'light' | 'dark' | null) : null;
const initialTheme = storedTheme === 'dark' ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', initialTheme);

// 创建响应式主题状态
const isDark = ref(initialTheme === 'dark');

// 监听 data-theme 属性变化
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === 'data-theme') {
      const newTheme = document.documentElement.getAttribute('data-theme');
      isDark.value = newTheme === 'dark';
    }
  });
});
observer.observe(document.documentElement, { attributes: true });

// 创建带 ConfigProvider 的根组件
const RootApp = {
  setup() {
    return () => h(
      ConfigProvider,
      {
        theme: {
          algorithm: isDark.value ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#4f8cff',
            borderRadius: 6,
          },
        },
      },
      () => h(App)
    );
  },
};

const app = createApp(RootApp);
app.use(Antd);
app.mount('#app');

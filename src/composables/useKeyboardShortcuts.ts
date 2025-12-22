/**
 * useKeyboardShortcuts - 键盘快捷键 composable
 * 
 * Requirements: 12.2, 12.3
 */
import { onMounted, onUnmounted, ref } from 'vue';

export interface KeyboardShortcutOptions {
  onStopAll?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutOptions = {}) {
  const isListening = ref(true);

  function handleKeyDown(event: KeyboardEvent) {
    if (!isListening.value) return;

    // Ctrl+. 或 Cmd+. 停止所有运行
    if ((event.ctrlKey || event.metaKey) && event.key === '.') {
      event.preventDefault();
      options.onStopAll?.();
      return;
    }

    // Escape 关闭模态框
    if (event.key === 'Escape') {
      // 不阻止默认行为，让模态框组件自己处理
      options.onEscape?.();
      return;
    }
  }

  function startListening() {
    isListening.value = true;
  }

  function stopListening() {
    isListening.value = false;
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    isListening,
    startListening,
    stopListening
  };
}

/**
 * useModalKeyboard - 模态框键盘处理 composable
 * 
 * Requirements: 12.3, 12.5
 */
export function useModalKeyboard(options: {
  onClose?: () => void;
  trapFocus?: boolean;
} = {}) {
  const modalRef = ref<HTMLElement | null>(null);

  function handleKeyDown(event: KeyboardEvent) {
    // Escape 关闭模态框
    if (event.key === 'Escape') {
      event.preventDefault();
      options.onClose?.();
      return;
    }

    // Tab 焦点陷阱
    if (options.trapFocus && event.key === 'Tab' && modalRef.value) {
      const focusableElements = modalRef.value.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: 如果在第一个元素，跳到最后一个
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: 如果在最后一个元素，跳到第一个
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  function setupFocusTrap(element: HTMLElement) {
    modalRef.value = element;
    element.addEventListener('keydown', handleKeyDown);
    
    // 自动聚焦到第一个可聚焦元素
    const firstFocusable = element.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }

  function removeFocusTrap() {
    if (modalRef.value) {
      modalRef.value.removeEventListener('keydown', handleKeyDown);
      modalRef.value = null;
    }
  }

  return {
    modalRef,
    setupFocusTrap,
    removeFocusTrap
  };
}

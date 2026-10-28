import { reactive, readonly } from 'vue';
const messages = reactive([]);
let sequence = 0;
export const notifications = readonly(messages);
export function dismissNotification(id) {
  const index = messages.findIndex((item) => item.id === id);
  if (index !== -1) messages.splice(index, 1);
}
export function notify(message, type = 'success') {
  const id = ++sequence;
  messages.push({
    id,
    message,
    type: ['success', 'error', 'warning'].includes(type) ? type : 'success',
  });
  if (messages.length > 5) messages.shift();
  return id;
}

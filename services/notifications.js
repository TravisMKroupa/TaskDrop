const { Notification } = require('electron');

function showToast({ title, body, reminderId, onSnooze }) {
  if (!Notification.isSupported()) {
    console.warn('[TaskDrop] Notifications not supported');
    return;
  }

  const notification = new Notification({
    title: title || 'TaskDrop',
    body,
    silent: false,
  });

  notification.on('click', () => {
    if (global.mainWindow) {
      global.mainWindow.show();
      global.mainWindow.focus();
    }
  });

  notification.show();
  return notification;
}

module.exports = { showToast };

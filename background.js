const ICON_URL = chrome.runtime.getURL('R.png');



chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync-check') {
    syncAlarmsWithStorage();
    return;
  }
  fireNotification(alarm.name);
});



function fireNotification(taskId) {
  chrome.storage.local.get({ tasks: [] }, (data) => {
    if (chrome.runtime.lastError) return;
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task || task.completed) return;

    chrome.notifications.create(
      taskId,
      {
        type:               'basic',
        iconUrl:            ICON_URL,
        title:              'Right Info, Right Time',
        message:            task.text,
        contextMessage:     task.formattedTime ? 'Scheduled: ' + task.formattedTime : '',
        priority:           2,
        requireInteraction: true,
        buttons: [
          { title: 'Mark Done' },
          { title: 'Snooze 10 min' },
        ],
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('[RITT] Notification failed:', chrome.runtime.lastError.message);
        } else {
          console.log('[RITT] Notification fired for:', task.text);
        }
      }
    );
  });
}



chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  const taskId = notificationId;

  chrome.storage.local.get({ tasks: [] }, (data) => {
    if (chrome.runtime.lastError) return;

    const tasks     = data.tasks;
    const taskIndex = tasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) {
      chrome.notifications.clear(notificationId);
      return;
    }

    if (buttonIndex === 0) {
      
      
      tasks[taskIndex].completed = true;
      tasks[taskIndex].snoozed   = false;
      chrome.storage.local.set({ tasks }, () => {
        if (chrome.runtime.lastError) return;
        chrome.alarms.clear(taskId);
        chrome.notifications.clear(notificationId);
        console.log('[RITT] Task marked done:', tasks[taskIndex].text);
      });

    } else if (buttonIndex === 1) {
      
      
      const snoozeDelay    = 10 * 60 * 1000;
      const newTimestamp   = Date.now() + snoozeDelay;
      const d              = new Date(newTimestamp);
      const h              = d.getHours();
      const mins           = d.getMinutes().toString().padStart(2, '0');
      const h12            = h % 12 === 0 ? 12 : h % 12;
      const ampm           = h >= 12 ? 'PM' : 'AM';

      tasks[taskIndex].timestamp     = newTimestamp;
      tasks[taskIndex].formattedTime = h12 + ':' + mins + ' ' + ampm;
      tasks[taskIndex].snoozed       = true;

      chrome.storage.local.set({ tasks }, () => {
        if (chrome.runtime.lastError) return;
        chrome.alarms.clear(taskId, () => {
          chrome.alarms.create(taskId, { when: newTimestamp });
          console.log('[RITT] Task snoozed until:', tasks[taskIndex].formattedTime);
        });
        chrome.notifications.clear(notificationId);
      });
    }
  });
});



chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
});

chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log('[RITT] Notification closed, byUser:', byUser, 'id:', notificationId);
});



chrome.runtime.onInstalled.addListener((details) => {
  console.log('[RITT] Extension installed/updated:', details.reason);
  syncAlarmsWithStorage();
  schedulePeriodicSync();
});



chrome.runtime.onStartup.addListener(() => {
  console.log('[RITT] Browser started — syncing alarms.');
  syncAlarmsWithStorage();
  schedulePeriodicSync();
});



function syncAlarmsWithStorage() {
  chrome.storage.local.get({ tasks: [] }, (data) => {
    if (chrome.runtime.lastError) return;
    const now = Date.now();

    data.tasks.forEach((task) => {
      if (task.completed || !task.timestamp) return;

      if (task.timestamp > now) {
        // Only create if missing — popup may have already created it
        chrome.alarms.get(task.id, (existing) => {
          if (!existing) {
            chrome.alarms.create(task.id, { when: task.timestamp });
            console.log('[RITT] Re-registered alarm for:', task.text);
          }
        });
      } else if (task.timestamp > now - 60 * 1000) {
        // Missed within the last minute — fire now
        console.log('[RITT] Missed alarm (within 1 min) — firing now:', task.text);
        fireNotification(task.id);
      }
    });
  });
}



function schedulePeriodicSync() {
  chrome.alarms.get('sync-check', (existing) => {
    if (!existing) {
      chrome.alarms.create('sync-check', { periodInMinutes: 1 });
    }
  });
}



chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'SCHEDULE_ALARM') {
    
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'CANCEL_ALARM') {
    chrome.alarms.clear(message.taskId, (cleared) => {
      sendResponse({ success: cleared });
    });
    return true;
  }

  if (message.type === 'TEST_NOTIFICATION') {
    chrome.notifications.create(
      'test_' + Date.now(),
      {
        type:               'basic',
        iconUrl:            ICON_URL,
        title:              'Right Info, Right Time',
        message:            'Notifications are working!',
        priority:           2,
        requireInteraction: false,
      },
      () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      }
    );
    return true;
  }
});

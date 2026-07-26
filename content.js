(function () {
  'use strict';

  let reminderContainer = null;
  let lastUrl = window.location.href;

  function cleanUrl(url) {
    let u = url.toLowerCase().trim();
    u = u.replace(/^(https?:\/\/)?(www\.)?/, '');
    if (u.endsWith('/')) u = u.slice(0, -1);
    return u;
  }

  function urlMatches(pageUrl, taskUrl) {
    if (!pageUrl || !taskUrl || taskUrl.length < 3) return false;
    return cleanUrl(pageUrl).includes(cleanUrl(taskUrl));
  }

  function ensureContainer() {
    if (reminderContainer && document.body.contains(reminderContainer)) return;

    reminderContainer = document.createElement('div');
    reminderContainer.id = 'ritt-reminder-container';
    Object.assign(reminderContainer.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: '2147483647',
      pointerEvents: 'none',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    });

    if (!document.getElementById('ritt-banner-styles')) {
      const style = document.createElement('style');
      style.id = 'ritt-banner-styles';
      style.textContent = [
        '@keyframes rittSlideIn {',
        '  from { opacity: 0; transform: translateX(50px) scale(0.9); }',
        '  to   { opacity: 1; transform: translateX(0) scale(1); }',
        '}',
        '@keyframes rittFadeOut {',
        '  from { opacity: 1; transform: translateX(0) scale(1); }',
        '  to   { opacity: 0; transform: translateX(50px) scale(0.9); margin-top: -50px; }',
        '}',
        '.ritt-banner {',
        '  animation: rittSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;',
        '  transition: all 0.3s ease;',
        '}',
        '.ritt-banner.ritt-fade-out {',
        '  animation: rittFadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;',
        '}',
        '.ritt-done-btn:hover {',
        '  background: rgba(52, 199, 89, 0.15) !important;',
        '  opacity: 1 !important;',
        '}',
        '.ritt-close-btn:hover {',
        '  opacity: 1 !important;',
        '}',
      ].join('\n');
      document.head.appendChild(style);
    }
    document.body.appendChild(reminderContainer);
  }

  function injectBanner(task) {
    if (document.querySelector('[data-ritt-task-id="' + task.id + '"]')) return;

    ensureContainer();

    const banner = document.createElement('div');
    banner.className = 'ritt-banner';
    banner.setAttribute('data-ritt-task-id', task.id);
    Object.assign(banner.style, {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      color: '#f8fafc',
      padding: '14px 20px',
      borderRadius: '12px',
      boxShadow:
        '0 10px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.4)',
      border: '1px solid rgba(255,255,255,0.08)',
      fontSize: '14px',
      fontWeight: '500',
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      minWidth: '250px',
      maxWidth: '400px',
    });

    const icon = document.createElement('span');
    icon.textContent = '\uD83D\uDCCC';
    icon.style.fontSize = '16px';
    icon.style.flexShrink = '0';

    const text = document.createElement('span');
    text.textContent = 'Reminder: ' + task.text;
    text.style.flex = '1';
    text.style.wordBreak = 'break-word';

    const doneBtn = document.createElement('span');
    doneBtn.className = 'ritt-done-btn';
    doneBtn.textContent = '\u2713';
    doneBtn.title = 'Mark as done';
    Object.assign(doneBtn.style, {
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '700',
      color: '#34c759',
      padding: '4px 8px',
      borderRadius: '6px',
      transition: 'background 0.2s, opacity 0.2s',
      opacity: '0.7',
      flexShrink: '0',
      background: 'transparent',
    });
    doneBtn.addEventListener('click', function () { markTaskDone(task.id); });

    const closeBtn = document.createElement('span');
    closeBtn.className = 'ritt-close-btn';
    closeBtn.textContent = '\u2715';
    closeBtn.title = 'Dismiss';
    Object.assign(closeBtn.style, {
      cursor: 'pointer',
      fontSize: '12px',
      opacity: '0.5',
      transition: 'opacity 0.2s',
      padding: '4px',
      flexShrink: '0',
    });
    closeBtn.addEventListener('click', function () { removeBanner(banner); });

    banner.appendChild(icon);
    banner.appendChild(text);
    banner.appendChild(doneBtn);
    banner.appendChild(closeBtn);
    reminderContainer.appendChild(banner);

    var timeout = setTimeout(function () { removeBanner(banner); }, 7000);
    banner._rittTimeout = timeout;
  }

  function removeBanner(el) {
    if (!el || el.classList.contains('ritt-fade-out')) return;
    if (el._rittTimeout) clearTimeout(el._rittTimeout);
    el.classList.add('ritt-fade-out');
    el.addEventListener('animationend', function () {
      el.remove();
      if (reminderContainer && reminderContainer.children.length === 0) {
        reminderContainer.remove();
        reminderContainer = null;
      }
    });
  }

  function removeBannerByTaskId(taskId) {
    var el = document.querySelector('[data-ritt-task-id="' + taskId + '"]');
    if (el) removeBanner(el);
  }

  function markTaskDone(taskId) {
    chrome.storage.local.get({ tasks: [] }, function (data) {
      if (chrome.runtime.lastError) return;
      var tasks = data.tasks.map(function (t) {
        if (t.id === taskId) {
          return { id: t.id, text: t.text, url: t.url, completed: true, timestamp: t.timestamp, formattedTime: t.formattedTime, snoozed: false };
        }
        return t;
      });
      chrome.storage.local.set({ tasks: tasks });
      try { chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' }); } catch (e) { }
    });
  }

  function evaluateTasks(tasks) {
    var pageUrl = window.location.href;
    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      if (task.completed || !task.url) continue;
      if (urlMatches(pageUrl, task.url)) {
        injectBanner(task);
      }
    }
  }

  chrome.storage.local.get({ tasks: [] }, function (data) {
    if (chrome.runtime.lastError) return;
    evaluateTasks(data.tasks);
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || !changes.tasks) return;

    var oldTasks = changes.tasks.oldValue || [];
    var newTasks = changes.tasks.newValue || [];

    var newTaskMap = {};
    for (var i = 0; i < newTasks.length; i++) {
      newTaskMap[newTasks[i].id] = newTasks[i];
    }

    for (var j = 0; j < oldTasks.length; j++) {
      var oldTask = oldTasks[j];
      var newTask = newTaskMap[oldTask.id];
      if (!newTask || (newTask.completed && !oldTask.completed)) {
        removeBannerByTaskId(oldTask.id);
      }
    }

    var oldIds = {};
    for (var k = 0; k < oldTasks.length; k++) {
      oldIds[oldTasks[k].id] = true;
    }

    var pageUrl = window.location.href;
    for (var m = 0; m < newTasks.length; m++) {
      var t = newTasks[m];
      if (t.completed || !t.url) continue;
      if (!oldIds[t.id] && urlMatches(pageUrl, t.url)) {
        injectBanner(t);
      }
    }
  });

  function onUrlChange() {
    var newUrl = window.location.href;
    if (newUrl === lastUrl) return;
    lastUrl = newUrl;

    var banners = document.querySelectorAll('.ritt-banner');
    for (var i = 0; i < banners.length; i++) {
      removeBanner(banners[i]);
    }

    chrome.storage.local.get({ tasks: [] }, function (data) {
      if (chrome.runtime.lastError) return;
      evaluateTasks(data.tasks);
    });
  }

  if (typeof navigation !== 'undefined') {
    try {
      navigation.addEventListener('navigatesuccess', onUrlChange);
    } catch (e) { }
  }

  setInterval(function () {
    if (window.location.href !== lastUrl) onUrlChange();
  }, 1000);

  window.addEventListener('popstate', function () {
    setTimeout(onUrlChange, 100);
  });
})();

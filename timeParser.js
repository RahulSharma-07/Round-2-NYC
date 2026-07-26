(function(root) {
  function parseTaskInput(input) {
    if (!input || typeof input !== 'string') {
      return { title: '', timestamp: null, formattedTime: '', hasTime: false, previewText: '' };
    }

    const text = input.trim();
    if (!text) {
      return { title: '', timestamp: null, formattedTime: '', hasTime: false, previewText: '' };
    }

    const now = new Date();
    let targetDate = null;
    let timeMatchStr = '';
    let isTomorrow = false;

    let textToParse = text;
    if (/\btomorrow\b/i.test(textToParse)) {
      isTomorrow = true;
      textToParse = textToParse.replace(/\btomorrow\b/gi, '').trim();
    }

    const relativeRegex = /\bin\s+(\d+)\s*(mins?|minutes?|m|hrs?|hours?|h|secs?|seconds?|s)\b/i;
    const relMatch = textToParse.match(relativeRegex);

    if (relMatch) {
      timeMatchStr = relMatch[0];
      const amount = parseInt(relMatch[1], 10);
      const unit = relMatch[2].toLowerCase();

      targetDate = new Date(now.getTime());
      if (unit.startsWith('h')) {
        targetDate.setHours(targetDate.getHours() + amount);
      } else if (unit.startsWith('s')) {
        targetDate.setSeconds(targetDate.getSeconds() + amount);
      } else {
        targetDate.setMinutes(targetDate.getMinutes() + amount);
      }
    }

    if (!targetDate) {
      let hours = null;
      let minutes = 0;
      let ampm = null;

      const colonRegex = /\b(?:at\s+)?(\d{1,2}):(\d{2})\s*(am|pm)?\b/i;
      const colonMatch = textToParse.match(colonRegex);

      const ampmRegex = /\b(?:at\s+)?(\d{1,2})\s*(am|pm)\b/i;
      const ampmMatch = textToParse.match(ampmRegex);

      const atRegex = /\bat\s+(\d{1,2})\b/i;
      const atMatch = textToParse.match(atRegex);

      let chosenMatch = null;

      if (colonMatch) {
        chosenMatch = colonMatch;
        timeMatchStr = colonMatch[0];
        hours = parseInt(colonMatch[1], 10);
        minutes = parseInt(colonMatch[2], 10);
        ampm = colonMatch[3] ? colonMatch[3].toLowerCase() : null;
      } else if (ampmMatch) {
        chosenMatch = ampmMatch;
        timeMatchStr = ampmMatch[0];
        hours = parseInt(ampmMatch[1], 10);
        minutes = 0;
        ampm = ampmMatch[2].toLowerCase();
      } else if (atMatch) {
        chosenMatch = atMatch;
        timeMatchStr = atMatch[0];
        hours = parseInt(atMatch[1], 10);
        minutes = 0;
        ampm = null;
      }

      if (chosenMatch && hours !== null) {
        if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60) {
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;

          if (!ampm && hours <= 12) {
            const candidateAM = new Date(now);
            candidateAM.setHours(hours, minutes, 0, 0);

            const candidatePM = new Date(now);
            candidatePM.setHours(hours === 12 ? 12 : hours + 12, minutes, 0, 0);

            if (now.getHours() >= 12 && candidatePM > now) {
              targetDate = candidatePM;
            } else if (candidateAM > now) {
              targetDate = candidateAM;
            } else if (candidatePM > now) {
              targetDate = candidatePM;
            } else {
              targetDate = candidateAM;
              targetDate.setDate(targetDate.getDate() + 1);
            }
          } else {
            targetDate = new Date(now);
            targetDate.setHours(hours, minutes, 0, 0);
            if (targetDate <= now && !isTomorrow) {
              targetDate.setDate(targetDate.getDate() + 1);
            }
          }
        }
      }
    }

    if (isTomorrow && targetDate) {
      if (targetDate.getDate() === now.getDate()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }

    let title = text;
    if (timeMatchStr) {
      title = title.replace(timeMatchStr, '').replace(/\b(?:at|in|by|for)\b\s*$/i, '').trim();
    }
    title = title.replace(/\btomorrow\b/gi, '').replace(/\s+/g, ' ').trim();

    if (!title) {
      title = text;
    }

    let formattedTime = '';
    let previewText = '';

    if (targetDate) {
      const h = targetDate.getHours();
      const m = targetDate.getMinutes().toString().padStart(2, '0');
      const ampmStr = h >= 12 ? 'PM' : 'AM';
      const displayHour12 = h % 12 === 0 ? 12 : h % 12;
      
      formattedTime = `${displayHour12}:${m} ${ampmStr}`;

      const dayLabel = targetDate.getDate() === now.getDate() ? 'Today' : 'Tomorrow';
      previewText = `Reminder set for ${displayHour12}:${m} ${ampmStr} ${dayLabel}`;
    }

    return {
      title,
      timestamp: targetDate ? targetDate.getTime() : null,
      formattedTime,
      hasTime: !!targetDate,
      previewText
    };
  }

  const exportObj = { parseTaskInput };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  root.TimeParser = exportObj;
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this);

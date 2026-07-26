# 📌 Right Info, Right Time

> A smart, lightweight Chrome Extension to track your daily tasks and get reminded at the right moment—whether by time or when visiting specific websites! 🚀

---

## 🌟 Features

- ⏰ **Smart Time Reminders**: Type tasks naturally like *"Call John at 7 PM"*, *"Meeting in 30 mins"*, or *"Submit report tomorrow at 10 AM"*. The extension automatically schedules a reminder!
- 🌐 **Website-Triggered Reminders**: Assign a specific website URL to a task (e.g., `facebook.com`, `github.com`). An in-page floating reminder banner will pop up as soon as you visit that site!
- 🔔 **Desktop Notifications**: Get system alerts at exact scheduled times with interactive options:
  - **Mark Done**: Complete task directly from the notification.
  - **Snooze 10 min**: Remind you again in 10 minutes.
- 🔢 **Live Extension Badge**: Displays the number of active uncompleted tasks directly on the browser extension icon.
- 🎨 **Modern & Sleek UI**: Beautiful dark mode theme with glassmorphism, animated task lists, and live time preview while typing.

---

## 🚀 How to Install in Chrome

Since this is a Chrome Extension, you can load it in less than 1 minute:

1. **Download or Clone** this project folder to your computer.
2. Open **Google Chrome** and navigate to `chrome://extensions/` in your address bar.
3. Turn **ON** **Developer mode** using the toggle switch in the top-right corner.
4. Click on the **Load unpacked** button in the top-left.
5. Select the `Rightinfo-main` folder.
6. 🎉 Done! Click the puzzle icon in Chrome to pin **Right Info, Right Time** to your toolbar.

---

## 💡 How to Use

### 1. Adding a Task with Time Reminders
1. Click the extension icon in your Chrome toolbar.
2. Click **+ Add Task**.
3. Type your task including time (e.g., `Doctor appointment at 5:30 PM` or `Take a break in 45 mins`).
4. Notice the live preview showing your detected reminder time.
5. Click **Add**.

### 2. Adding a Task with a Website Trigger
1. Click **+ Add Task**.
2. Type your task (e.g., `Check pull requests`).
3. Enter a target website domain in the **Trigger URL** box (e.g., `github.com`).
4. Click **Add**.
5. When you open GitHub, an interactive floating banner will pop up to remind you of your target!

### 3. Managing Tasks
- Click the **checkbox** next to any task to mark it done.
- Click **Remove Done** to clean up finished tasks.
- Click **Test Notify** to verify desktop notifications are enabled and working on your computer.

---

## 📂 File Structure

```
Rightinfo-main/
├── manifest.json      # Chrome extension configuration (Manifest V3)
├── popup.html         # User interface structure for the popup
├── popup.js           # Handles UI state, user input, and task rendering
├── style.css          # Glassmorphic dark styling & animations
├── background.js      # Service worker for background alarms, notifications, & badge count
├── content.js         # Content script for in-page floating banner reminders on target websites
├── timeParser.js      # Natural language time parser engine
└── R.png              # App icon & notification logo
```

---

## 🛠️ Built With

- **HTML5 & Vanilla CSS3** (Google Inter typography)
- **JavaScript (ES6+)**
- **Chrome Extension MV3 APIs** (`storage`, `alarms`, `notifications`, `tabs`)

---

## 📄 License

This project is open-source and free to use.

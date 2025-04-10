# Dock Swipe Tracker - GNOME Shell Extension

**Dock Swipe Tracker** is a GNOME Shell extension that monitors dock session activity (like swiping IN or OUT of a dock/office). It adds a compact panel widget to the GNOME top bar, displaying the user's current status (IN/OUT), total time spent for the day, and the time of the last sync. It also provides a dropdown menu with detailed stats and controls for manual refresh and preferences.

---

## ✨ Features

- 🔁 **Automatic polling** every 30 seconds to get updated swipe data.
- 🟢 **Live status indicator**: Shows whether the user is currently IN or OUT.
- ⏱ **Daily time tracker**: Shows how many hours and minutes the user has been IN today.
- 📅 **Last sync timestamp**.
- 🎨 **Styled panel and menu UI** with dynamic coloring and tooltips.
- ⚙️ **Manual refresh button** and preferences entry.
- 🧠 Smart formatting: Converts total swipe hours from either decimal (`6.5`) or time format (`6:30`) to human-readable form.
- 💡 **Tooltip warning** if user has exceeded 8 hours ("Time ho gaya, nikal ja!").

---

## 🛠 Installation

1. Clone or download this repo into your GNOME extensions directory:
   ```bash
   ~/.local/share/gnome-shell/extensions/dock-swipe-tracker@yourdomain.com/ choose whatever domain you use

# ProPing Monitor

**ProPing Monitor** is a modern, dark-themed network monitoring application built with Electron. It allows you to monitor the status (UP/DOWN) of multiple network targets (IP addresses or domains) in real-time, providing visual and email alerts when a target goes offline.

![ProPing Monitor UI](https://via.placeholder.com/800x500?text=ProPing+Monitor+Screenshot)

## 🚀 Features

*   **Real-time Monitoring:** Pings multiple targets concurrently every 2 seconds.
*   **Visual Dashboard:** Clean, dark-mode interface with cards for each target.
    *   **Green Dot:** Target is Online.
    *   **Red Dot & Glow:** Target is Offline (Timeout).
*   **Email Alerts (SMTP):** Automatically sends an email notification when a target goes down.
    *   Supports Gmail, Outlook, and custom SMTP servers.
    *   **Secure Storage:** SMTP passwords are encrypted using the OS Keychain (Windows Credential Manager) via Electron's `safeStorage`.
*   **Sound Alerts:** Plays a subtle notification sound on status change.
*   **Persistence:** Targets and SMTP settings are automatically saved and restored on restart (`C:\ProgramData\ElectronPingApp`).
*   **Activity Log:** (Optional) View recent ping history.

## 🛠️ Installation

1.  **Clone the repository** (or download source):
    ```bash
    git clone <repository-url>
    cd electron-ping-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the application**:
    ```bash
    npm start
    ```

## ⚙️ Configuration

### Adding Targets
1.  Enter a **Name** (e.g., "Main Router") and **IP/Host** (e.g., `192.168.1.1`).
2.  Click **ADD TARGET**.

### Setting up Email Alerts (Gmail Example)
1.  Click the **⚙️ SMTP Settings** button in the sidebar.
2.  **Host**: `smtp.gmail.com`
3.  **Port**: `465`
4.  **Secure**: Check the box ✅.
5.  **User**: Your Gmail address.
6.  **Password**: **IMPORTANT:** Use an **App Password**, not your login password.
    *   Go to [Google Account > Security > 2-Step Verification > App Passwords](https://myaccount.google.com/apppasswords).
    *   Generate a password specifically for this app.
7.  **From/To**: Set the sender and recipient email addresses.
8.  Click **Test Connection** to verify, then **Save Configuration**.

> **Note:** Your password is encrypted securely using Windows Credential Manager. It is NOT stored in plain text.

## 💻 Tech Stack

*   **Electron:** Desktop runtime.
*   **Node.js:** Backend logic.
*   **Nodemailer:** Email sending.
*   **Ping:** Network connectivity testing.
*   **Tailored CSS:** Custom dark theme (no heavy frameworks).

## 📄 License

MIT License

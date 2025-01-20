// background.js

// Helper function to fetch certificate expiration date via a separate HTTPS request
async function getCertificateExpiry(hostname) {
  return new Promise((resolve, reject) => {
    const net = require('tls');
    const socket = net.connect(443, hostname, () => {
      const peerCertificate = socket.getPeerCertificate();
      if (peerCertificate && peerCertificate.valid_to) {
        resolve(new Date(peerCertificate.valid_to));
      } else {
        reject(new Error("Failed to retrieve certificate"));
      }
      socket.end();
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

// Function to calculate days remaining
function calculateDaysRemaining(expiryDate) {
  const now = new Date();
  const diff = expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Update the extension icon
function updateIcon(daysRemaining) {
  let iconPath;
  let badgeText = "";
  let badgeColor = "#000000";

  if (daysRemaining < 1) {
    iconPath = "icons/alert_128.png";
    badgeText = "!";
    badgeColor = "#FF0000";
  } else if (daysRemaining <= 30) {
    iconPath = "icons/warning_128.png";
    badgeText = `${daysRemaining}`;
    badgeColor = "#FF0000";
  } else {
    iconPath = "icons/ok_128.png";
  }

  chrome.action.setIcon({ path: iconPath });
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

// Periodically check certificate expiration
chrome.alarms.create("checkCertificate", { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "checkCertificate") {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        const hostname = url.hostname;
        const expiryDate = await getCertificateExpiry(hostname);
        const daysRemaining = calculateDaysRemaining(expiryDate);

        updateIcon(daysRemaining);
      }
    } catch (error) {
      console.error("Error checking certificate: ", error);
    }
  }
});

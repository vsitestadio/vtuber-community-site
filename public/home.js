const notifyDialog = document.querySelector("#notifyDialog");
const notificationToggle = document.querySelector("#notificationToggle");
const notifyStatus = document.querySelector("#notifyStatus");
const toast = document.querySelector("#homeToast");
const preferenceKey = "luna_notification_enabled";
let upcomingStreams = [];

const dateLabel = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function scheduleMarkup(streams) {
  const [featured, ...others] = streams;
  if (!featured) return '<p class="schedule-empty">配信予定を準備中です。</p>';
  const featuredDate = dateLabel.format(new Date(featured.startAt));
  return `<article class="featured-live" data-stream="${featured.startAt}">
    <div class="live-top"><span class="live-badge">NEXT LIVE</span><time>${featuredDate}</time></div>
    <div><p>${featured.subtitle}</p><h3>${featured.title}</h3><span class="platform">● ${featured.platform}</span></div>
    <a href="${featured.url}" target="_blank" rel="noopener">待機所を開く →</a>
  </article>
  <div class="schedule-list">${others
    .map((stream) => {
      const date = new Date(stream.startAt);
      const parts = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "short",
        day: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(date);
      const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
      return `<article data-stream="${stream.startAt}">
        <time><b>${value("day")}</b><span>${value("month")}<br>${value("weekday")}</span></time>
        <div><span>${value("hour")}:${value("minute")} START</span><h3>${stream.title}</h3><p>${stream.subtitle} / ${stream.platform}</p></div>
        <a href="${stream.url}" target="_blank" rel="noopener">→</a>
      </article>`;
    })
    .join("")}</div>`;
}

async function loadSchedule() {
  try {
    const response = await fetch("/api/schedule");
    if (!response.ok) throw new Error("schedule request failed");
    upcomingStreams = (await response.json()).streams ?? [];
    const scheduleList = document.querySelector("#homeScheduleList");
    if (scheduleList) scheduleList.innerHTML = scheduleMarkup(upcomingStreams);
    checkNotifications();
  } catch {
    // 通信できないときはHTMLに書かれた予定をそのまま表示します。
  }
}

function checkNotifications() {
  if (
    localStorage.getItem(preferenceKey) !== "true" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) return;

  const now = Date.now();
  upcomingStreams.forEach((stream) => {
    const remaining = Date.parse(stream.startAt) - now;
    const noticeKey = `luna_notified_${stream.id}_${stream.startAt}`;
    if (remaining > 0 && remaining <= 10 * 60 * 1000 && !localStorage.getItem(noticeKey)) {
      new Notification(`${stream.title}が10分後に始まります`, {
        body: `${stream.platform}の配信ページを開いて待機しましょう。`,
        tag: noticeKey,
      });
      localStorage.setItem(noticeKey, "true");
    }
  });
}

function updateNotificationUI(enabled) {
  notificationToggle.setAttribute("aria-checked", String(enabled));
  notifyStatus.textContent = enabled
    ? "配信10分前の通知がオンになっています。"
    : "現在、通知はオフです。";
}

updateNotificationUI(localStorage.getItem(preferenceKey) === "true");

document.querySelectorAll(".notify-open").forEach((button) => {
  button.addEventListener("click", () => notifyDialog.showModal());
});

notificationToggle.addEventListener("click", async () => {
  const enabled = notificationToggle.getAttribute("aria-checked") !== "true";
  if (enabled && "Notification" in window) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      updateNotificationUI(false);
      notifyStatus.textContent = "ブラウザの通知許可が必要です。";
      return;
    }
  }
  updateNotificationUI(enabled && "Notification" in window);
});

loadSchedule();
setInterval(checkNotifications, 30 * 1000);

notifyDialog.querySelector("form").addEventListener("submit", () => {
  const enabled = notificationToggle.getAttribute("aria-checked") === "true";
  localStorage.setItem(preferenceKey, String(enabled));
  toast.textContent = enabled
    ? "配信通知をオンにしました"
    : "配信通知をオフにしました";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2300);
});

document.querySelector(".menu").addEventListener("click", () => {
  const nav = document.querySelector(".site-header nav");
  const open = nav.style.display === "flex";
  nav.style.display = open ? "" : "flex";
  if (!open) {
    Object.assign(nav.style, {
      position: "absolute",
      top: "68px",
      left: "0",
      right: "0",
      padding: "24px",
      background: "#fff",
      flexDirection: "column",
      gap: "20px",
    });
  }
});

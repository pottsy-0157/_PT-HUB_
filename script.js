// Dynamic navbar background on scroll
window.addEventListener("scroll", function () {
  const navbar = document.getElementById("navbar");
  if (navbar) {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  }
});

// Weekly planner / reminders
(function () {
  const grid = document.getElementById("weekGrid");
  const label = document.getElementById("weekLabel");
  const prev = document.getElementById("prevWeek");
  const next = document.getElementById("nextWeek");
  const toast = document.getElementById("reminderToast");
  if (!grid || !label || !prev || !next) return;

  const MS_DAY = 86400000;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let anchor = new Date();

  function startOfWeek(d) {
    const date = new Date(d);
    const diff = date.getDate() - date.getDay(); // Sunday start
    return new Date(date.setDate(diff));
  }

  function formatShort(date) {
    return `${weekdays[date.getDay()]} ${date.getDate()}`;
  }

  function render() {
    const start = startOfWeek(anchor);
    const end = new Date(start.getTime() + MS_DAY * 6);
    label.textContent = `${start.toLocaleDateString(
      "en-GB"
    )} - ${end.toLocaleDateString("en-GB")}`;
    grid.innerHTML = "";

    for (let i = 0; i < 7; i++) {
      const day = new Date(start.getTime() + MS_DAY * i);
      const dayEl = document.createElement("div");
      dayEl.className = "day-card";

      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `<span>${formatShort(day)}</span>`;

      const sessions = document.createElement("div");
      sessions.className = "day-sessions";

      // Example: add stuff to the calendar -----------------------------------------------------
      const isMon = day.getDay() === 1;
      const isTue = day.getDay() === 2;
      const isWed = day.getDay() === 3;
      const isThu = day.getDay() === 4;
      const isFri = day.getDay() === 5;
      const isSat = day.getDay() === 6;
      const isSun = day.getDay() === 0;
      if (isMon) {
        addSession(sessions, "LOWER STRENGTH + EASY RUN", "06:00", day);
      }
      if (isTue) {
        addSession(sessions, "MOBILITY + RECOVERY", "06:00", day);
      }
      if (isWed) {
        addSession(sessions, "CONDITIONING / ROW FOCUS", "06:00", day);
      }
      if (isWed) {
        addSession(sessions, "ELEV8 RUN CLUB", "18:00", day);
      }

      if (isThu) {
        addSession(sessions, "MOBILITY + RECOVERY", "06:00", day);
      }
      if (isFri) {
        addSession(sessions, "PUSH / CORE", "06:00", day);
      }
      if (isSat) {
        addSession(sessions, "HYROX SATURDAY", "07:30", day);
      }
      if (isSun) {
        addSession(sessions, "LONG RUN + CORE", "06:00", day);
      }

      dayEl.appendChild(header);
      dayEl.appendChild(sessions);
      grid.appendChild(dayEl);
    }
  }

  function addSession(container, name, time, dayDate) {
    const pill = document.createElement("div");
    pill.className = "session-pill";
    pill.innerHTML = `<span>${time} • ${name}</span>`;
    const btn = document.createElement("button");
    btn.className = "remind-btn";
    btn.textContent = "Remind";
    btn.addEventListener("click", function () {
      const dt = combineDateAndTime(dayDate, time);
      ensureNotificationPermission().then((allowed) => {
        if (!allowed) {
          if (toast)
            toast.textContent = "Enable notifications to receive reminders.";
          setTimeout(() => {
            if (toast) toast.textContent = "";
          }, 2000);
          return;
        }
        const rem = { name, time, when: dt.getTime() };
        storeReminder(rem);
        scheduleReminder(rem);
        if (toast)
          toast.textContent = `Reminder set for ${name} at ${formatTime(dt)}.`;
        setTimeout(() => {
          if (toast && toast.textContent.includes(name)) toast.textContent = "";
        }, 2000);
      });
    });

    const addCal = document.createElement("button");
    addCal.className = "addcal-btn";
    addCal.textContent = "+ Calendar";
    addCal.addEventListener("click", function () {
      const dt = combineDateAndTime(dayDate, time);
      downloadICS({
        title: name,
        description: `${name} class`,
        start: dt,
        durationMinutes: 60,
      });
    });

    pill.appendChild(btn);
    pill.appendChild(addCal);
    container.appendChild(pill);
  }

  function combineDateAndTime(dayDate, hhmm) {
    const [hh, mm] = hhmm.split(":").map((v) => parseInt(v, 10));
    const d = new Date(dayDate);
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  function formatTime(d) {
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function ensureNotificationPermission() {
    return new Promise((resolve) => {
      if (!("Notification" in window)) return resolve(false);
      if (Notification.permission === "granted") return resolve(true);
      if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) =>
          resolve(perm === "granted")
        );
      } else {
        resolve(false);
      }
    });
  }

  function scheduleReminder(rem) {
    const delay = rem.when - Date.now();
    if (delay <= 0) return;
    setTimeout(() => {
      try {
        new Notification(rem.name, { body: `Starting at ${rem.time}` });
      } catch {}
    }, Math.min(delay, 2147483647));
  }

  function storeReminder(rem) {
    try {
      const list = JSON.parse(localStorage.getItem("reminders") || "[]");
      list.push(rem);
      localStorage.setItem("reminders", JSON.stringify(list));
    } catch {}
  }

  // Restore scheduled reminders on load
  (function restore() {
    try {
      const list = JSON.parse(localStorage.getItem("reminders") || "[]");
      list.forEach((r) => scheduleReminder(r));
    } catch {}
  })();

  function pad(n) {
    return n.toString().padStart(2, "0");
  }
  function toICSDate(dt) {
    const y = dt.getUTCFullYear();
    const m = pad(dt.getUTCMonth() + 1);
    const d = pad(dt.getUTCDate());
    const hh = pad(dt.getUTCHours());
    const mm = pad(dt.getUTCMinutes());
    const ss = "00";
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
  }
  function escapeICS(s) {
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }
  function downloadICS({ title, description, start, durationMinutes }) {
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const uid = `${start.getTime()}-${Math.random()
      .toString(36)
      .slice(2)}@elev8`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ELEV8//Schedule//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  prev.addEventListener("click", function () {
    anchor = new Date(anchor.getTime() - MS_DAY * 7);
    render();
  });
  next.addEventListener("click", function () {
    anchor = new Date(anchor.getTime() + MS_DAY * 7);
    render();
  });

  render();
})();

// Hamburger menu toggle for mobile
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("mobileNavLinks");
if (hamburger && navLinks) {
  hamburger.addEventListener("click", function () {
    navLinks.classList.toggle("open");
  });
}

// Utility: Get next weekday date with ordinal suffix
function getWeekdayDate(targetDay) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  let diff = targetDay - dayOfWeek;
  if (diff < 0) diff += 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);

  const options = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  let dateStr = targetDate.toLocaleDateString("en-GB", options);

  // Ordinal suffix
  const dayNum = targetDate.getDate();
  let suffix = "th";
  if (dayNum % 10 === 1 && dayNum !== 11) suffix = "st";
  else if (dayNum % 10 === 2 && dayNum !== 12) suffix = "nd";
  else if (dayNum % 10 === 3 && dayNum !== 13) suffix = "rd";
  dateStr = dateStr.replace(dayNum, `${dayNum}${suffix}`);

  return dateStr;
}

// Set dates for session cards
const dateMap = {
  "monday-date": 1, // Monday
  "tuesday-date": 2, // Tuesday
  "wednesday-date": 3, // Wednesday
  "thursday-date": 4, // Thursday
  "friday-date": 5, // Friday
  "saturday-date": 6, // Saturday
  "sunday-date": 0, // Sunday
};
Object.entries(dateMap).forEach(([id, dayNum]) => {
  const el = document.getElementById(id);
  if (el) el.textContent = getWeekdayDate(dayNum);
});

// Example class start time (replace with dynamic values if needed)

const classStart = new Date("2025-09-05T06:00:00+01:00"); // 6:00 am BST, 5 Sept 2025

function formatClassTime(date) {
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  };
  return `Started: ${date
    .toLocaleDateString("en-GB", options)
    .replace(",", "")} at ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  })} BST`;
}

window.addEventListener("DOMContentLoaded", function () {
  const now = new Date();
  if (now >= classStart) {
    document.getElementById("bookingStatus").style.display = "block";
    document.getElementById("classStartedTime").textContent =
      formatClassTime(classStart);
  }
});

// Show more / less sessions toggle
const toggleText = document.getElementById("toggleSessionsText");
const hiddenCards = document.querySelectorAll(".session-card.hidden");
let showingMore = false;
if (toggleText) {
  toggleText.addEventListener("click", function () {
    showingMore = !showingMore;
    hiddenCards.forEach((card) => {
      card.style.display = showingMore ? "block" : "none";
    });
    toggleText.textContent = showingMore ? "Show Less" : "Show More";
  });
}

document.querySelectorAll(".session-card").forEach((card) => {
  const dateStr = card.getAttribute("data-date");
  if (dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: "long" };
    const day = date.toLocaleDateString("en-GB", options);
    const daySpan = card.querySelector(".session-day");
    if (daySpan) daySpan.textContent = day;
  }
});

document.querySelectorAll(".session-group").forEach((group) => {
  const dayNum = parseInt(group.getAttribute("data-day"), 10);
  const dateHeading = group.querySelector(".session-date");
  if (dateHeading) dateHeading.textContent = getWeekdayDate(dayNum);
});

// Workout page: copy and toggle logic (delegated; safe if elements absent)
window.addEventListener("DOMContentLoaded", function () {
  const copyBtn = document.getElementById("copyWorkoutBtn");
  const workoutText = document.getElementById("workoutText");
  if (copyBtn && workoutText) {
    copyBtn.addEventListener("click", function () {
      const text = workoutText.innerText.trim();
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(function () {
          const original = copyBtn.textContent;
          copyBtn.textContent = "Copied!";
          setTimeout(function () {
            copyBtn.textContent = original;
          }, 1200);
        })
        .catch(function () {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand("copy");
          } catch (e) {}
          document.body.removeChild(textarea);
        });
    });
  }

  const toggleBtn = document.getElementById("toggleWorkoutBtn");
  const wrapper = document.getElementById("workoutTextWrapper");
  const card = document.getElementById("workoutDetail");
  if (toggleBtn && wrapper) {
    // Initialize collapsed
    wrapper.style.maxHeight = "0px";
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.textContent = "Show workout";

    toggleBtn.addEventListener("click", function () {
      const isOpen = wrapper.classList.toggle("open");
      toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggleBtn.textContent = isOpen ? "Hide workout" : "Show workout";
      if (isOpen) {
        wrapper.style.maxHeight = wrapper.scrollHeight + "px";
        if (card) card.classList.add("expanded");
      } else {
        wrapper.style.maxHeight = "0px";
        if (card) card.classList.remove("expanded");
      }
    });
  }

  // Subscribe form
  const subscribeForm = document.getElementById("subscribeForm");
  const subscribeEmail = document.getElementById("subscribeEmail");
  const subscribeMessage = document.getElementById("subscribeMessage");
  if (subscribeForm && subscribeEmail && subscribeMessage) {
    subscribeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = subscribeEmail.value.trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!valid) {
        subscribeMessage.textContent = "Please enter a valid email.";
        subscribeMessage.style.color = "#ff6b6b";
        return;
      }
      // Simulate success
      subscribeMessage.textContent = "Thanks! You're subscribed.";
      subscribeMessage.style.color = "#9eff9e";
      subscribeEmail.value = "";
    });
  }
});

// Simple auth and tracker
(function () {
  const loginForm = document.getElementById("loginForm");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authMessage = document.getElementById("authMessage");
  const logoutBtn = document.getElementById("logoutBtn");
  const logForm = document.getElementById("logForm");
  const logDate = document.getElementById("logDate");
  const logTitle = document.getElementById("logTitle");
  const logMetric = document.getElementById("logMetric");
  const logsTbody = document.getElementById("logsTbody");
  const logsEmpty = document.getElementById("logsEmpty");
  const statMonthCount = document.getElementById("statMonthCount");

  function getUserKey() {
    try {
      return localStorage.getItem("userEmail") || null;
    } catch {
      return null;
    }
  }

  if (loginForm && authEmail && authPassword) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = authEmail.value.trim();
      const pwd = authPassword.value.trim();
      if (!email || !pwd) {
        if (authMessage) authMessage.textContent = "Enter email and password.";
        return;
      }
      try {
        localStorage.setItem("userEmail", email);
        localStorage.setItem(`user:${email}:password`, pwd);
        window.location.href = "account.html";
      } catch {
        if (authMessage)
          authMessage.textContent = "Unable to store credentials.";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      try {
        localStorage.removeItem("userEmail");
      } catch {}
      window.location.href = "login.html";
    });
  }

  function renderLogs(email) {
    if (!logsTbody || !logsEmpty) return;
    logsTbody.innerHTML = "";
    try {
      const raw = localStorage.getItem(`user:${email}:logs`) || "[]";
      const logs = JSON.parse(raw);
      logs.sort((a, b) => b.date.localeCompare(a.date));

      // monthly count
      if (statMonthCount) {
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
        const count = logs.filter((l) => (l.date || "").startsWith(ym)).length;
        statMonthCount.textContent = String(count);
      }

      if (logs.length === 0) {
        logsEmpty.style.display = "block";
        return;
      }
      logsEmpty.style.display = "none";

      logs.forEach((log, idx) => {
        const tr = document.createElement("tr");
        const tdDate = document.createElement("td");
        const tdTitle = document.createElement("td");
        const tdMetric = document.createElement("td");
        const tdAct = document.createElement("td");
        tdDate.textContent = log.date;
        tdTitle.textContent = log.title;
        tdMetric.textContent = log.metric || "";
        const del = document.createElement("button");
        del.className = "log-del";
        del.textContent = "Delete";
        del.addEventListener("click", function () {
          deleteLog(email, idx);
        });
        tdAct.appendChild(del);
        tr.appendChild(tdDate);
        tr.appendChild(tdTitle);
        tr.appendChild(tdMetric);
        tr.appendChild(tdAct);
        logsTbody.appendChild(tr);
      });
    } catch {}
  }

  function deleteLog(email, index) {
    try {
      const key = `user:${email}:logs`;
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.splice(index, 1);
      localStorage.setItem(key, JSON.stringify(list));
      renderLogs(email);
    } catch {}
  }

  if (logForm && logDate && logTitle) {
    const email = getUserKey();
    if (!email) {
      window.location.href = "login.html";
      return;
    }
    renderLogs(email);
    logForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const date = logDate.value;
      const title = logTitle.value.trim();
      const metric = logMetric ? logMetric.value.trim() : "";
      if (!date || !title) return;
      try {
        const key = `user:${email}:logs`;
        const list = JSON.parse(localStorage.getItem(key) || "[]");
        list.push({ date, title, metric });
        localStorage.setItem(key, JSON.stringify(list));
        renderLogs(email);
        logTitle.value = "";
        if (logMetric) logMetric.value = "";
      } catch {}
    });
  }
})();

// Scroll animation
document.addEventListener("DOMContentLoaded", () => {
  const animatedElements = document.querySelectorAll("[data-animate]");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  animatedElements.forEach((el) => observer.observe(el));
});

// Chart.js example for progress tracking
const ctx = document.getElementById("progress-chart").getContext("2d"); // updated ID

const datasets = {
  run: { label: "Run (5K min)", data: [19, 18.5, 18.2, 18.1, 18.0] },
  ski: { label: "SkiErg (1k min)", data: [4.0, 3.9, 3.8, 3.7, 3.6] },
  row: { label: "Row (1k min)", data: [3.7, 3.65, 3.6, 3.55, 3.5] },
  weights: { label: "Bench (kg)", data: [60, 65, 70, 75, 80] },
};

const labels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

let chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: labels,
    datasets: [
      {
        label: datasets.run.label,
        data: datasets.run.data,
        borderColor: "#FFD700",
        backgroundColor: "rgba(255, 215, 0, 0.15)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: "#FFD700",
        pointRadius: 3,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 }, // smooth animation
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: "#333" },
        ticks: { color: "#aaa", font: { size: 10 } },
      },
      y: {
        grid: { color: "#333" },
        ticks: { color: "#aaa", font: { size: 10 } },
      },
    },
  },
});

document.querySelectorAll(".tracker-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tracker-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const type = btn.getAttribute("data-type");
    chart.data.datasets[0].label = datasets[type].label;
    chart.data.datasets[0].data = datasets[type].data;
    chart.update();
  });
});

(() => {
  "use strict";

  const STORAGE_KEY = "dailyOfficeAttendance_v1";
  const NORMAL_AVERAGE_HOURS = 9;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const elements = {
    currentDateLabel: document.getElementById("currentDateLabel"),
    liveClock: document.getElementById("liveClock"),
    welcomeHeading: document.getElementById("welcomeHeading"),
    attendanceStatus: document.getElementById("attendanceStatus"),
    checkInButton: document.getElementById("checkInButton"),
    checkOutButton: document.getElementById("checkOutButton"),
    todayCheckIn: document.getElementById("todayCheckIn"),
    todayCheckInDetail: document.getElementById("todayCheckInDetail"),
    leaveCount: document.getElementById("leaveCount"),
    averageCard: document.getElementById("averageCard"),
    averageWorkingTime: document.getElementById("averageWorkingTime"),
    averageDetail: document.getElementById("averageDetail"),
    workSummary: document.getElementById("workSummary"),
    saveSummaryButton: document.getElementById("saveSummaryButton"),
    summaryCharacterCount: document.getElementById("summaryCharacterCount"),
    summarySaveState: document.getElementById("summarySaveState"),
    hoursChart: document.getElementById("hoursChart"),
    hoursChartEmpty: document.getElementById("hoursChartEmpty"),
    monthStatusTitle: document.getElementById("monthStatusTitle"),
    monthCompletionChip: document.getElementById("monthCompletionChip"),
    statusDonut: document.getElementById("statusDonut"),
    presentDays: document.getElementById("presentDays"),
    presentLegend: document.getElementById("presentLegend"),
    leaveLegend: document.getElementById("leaveLegend"),
    holidayLegend: document.getElementById("holidayLegend"),
    attendanceMonthHeading: document.getElementById("attendanceMonthHeading"),
    attendanceTableBody: document.getElementById("attendanceTableBody"),
    exportButton: document.getElementById("exportButton"),
    toast: document.getElementById("toast"),
    resetDataButton: document.getElementById("resetDataButton"),
    resetDialog: document.getElementById("resetDialog")
  };

  let state = loadState();
  let toastTimer = null;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && typeof parsed === "object" && parsed.records) {
        return {
          ...parsed,
          createdAt: parsed.createdAt || localDateKey()
        };
      }
    } catch (error) {
      console.error("Could not read attendance data", error);
    }

    return {
      version: 1,
      createdAt: localDateKey(),
      records: {}
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatTime(timestamp) {
    if (!timestamp) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date(timestamp));
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function formatMonth(date) {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function isHoliday(date) {
    return date.getDay() === 5 || date.getDay() === 6;
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function getMonthDates(date = new Date()) {
    const days = getDaysInMonth(date);
    return Array.from({ length: days }, (_, index) => (
      new Date(date.getFullYear(), date.getMonth(), index + 1)
    ));
  }

  function getCurrentMonthRecordEntries() {
    const now = new Date();
    return Object.entries(state.records)
      .filter(([key]) => {
        const date = parseDateKey(key);
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      })
      .sort(([a], [b]) => a.localeCompare(b));
  }

  function getWorkingDurationHours(record) {
    if (!record?.checkIn || !record?.checkOut) return null;
    const duration = (new Date(record.checkOut) - new Date(record.checkIn)) / (60 * 60 * 1000);
    return duration > 0 ? duration : null;
  }

  function formatDuration(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "0h 00m";
    let wholeHours = Math.floor(hours);
    let minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 60) {
      wholeHours += 1;
      minutes = 0;
    }
    return `${wholeHours}h ${String(minutes).padStart(2, "0")}m`;
  }

  function getMonthlyStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const trackingStart = parseDateKey(state.createdAt || localDateKey(now));
    trackingStart.setHours(0, 0, 0, 0);
    const dates = getMonthDates(now);
    let present = 0;
    let leave = 0;
    let holidays = 0;

    dates.forEach((date) => {
      const key = localDateKey(date);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const isPast = dateStart < todayStart;
      const isElapsed = dateStart <= todayStart;
      const isTracked = dateStart >= trackingStart;

      if (isHoliday(date)) {
        if (isElapsed && isTracked) holidays += 1;
        return;
      }

      if (state.records[key]?.checkIn) {
        present += 1;
      } else if (isPast && isTracked) {
        leave += 1;
      }
    });

    return { present, leave, holidays };
  }

  function updateClock() {
    const now = new Date();
    elements.currentDateLabel.textContent = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(now);

    elements.liveClock.textContent = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now);

    const hour = now.getHours();
    elements.welcomeHeading.textContent = hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";
  }

  function renderDashboard() {
    const now = new Date();
    const todayKey = localDateKey(now);
    const todayRecord = state.records[todayKey] || {};
    const holidayToday = isHoliday(now);

    elements.attendanceStatus.classList.remove("checked-in", "checked-out");

    if (todayRecord.checkOut) {
      elements.attendanceStatus.classList.add("checked-out");
      elements.attendanceStatus.querySelector("span:last-child").textContent = `Checked out at ${formatTime(todayRecord.checkOut)}`;
    } else if (todayRecord.checkIn) {
      elements.attendanceStatus.classList.add("checked-in");
      elements.attendanceStatus.querySelector("span:last-child").textContent = `Working since ${formatTime(todayRecord.checkIn)}`;
    } else if (holidayToday) {
      elements.attendanceStatus.querySelector("span:last-child").textContent = "Weekly holiday";
    } else {
      elements.attendanceStatus.querySelector("span:last-child").textContent = "Not checked in";
    }

    elements.checkInButton.disabled = Boolean(todayRecord.checkIn) || holidayToday;
    elements.checkOutButton.disabled = !todayRecord.checkIn || Boolean(todayRecord.checkOut) || holidayToday;

    if (todayRecord.checkIn) {
      elements.todayCheckIn.textContent = formatTime(todayRecord.checkIn);
      elements.todayCheckInDetail.textContent = todayRecord.checkOut
        ? `Checked out at ${formatTime(todayRecord.checkOut)}.`
        : "Attendance is active for today.";
    } else if (holidayToday) {
      elements.todayCheckIn.textContent = "Weekly holiday";
      elements.todayCheckInDetail.textContent = "Friday and Saturday are marked as holidays.";
    } else {
      elements.todayCheckIn.textContent = "Not recorded";
      elements.todayCheckInDetail.textContent = "Use the check in button to start your day.";
    }

    const stats = getMonthlyStats();
    elements.leaveCount.textContent = `${stats.leave} ${stats.leave === 1 ? "day" : "days"}`;

    const completedHours = getCurrentMonthRecordEntries()
      .map(([, record]) => getWorkingDurationHours(record))
      .filter((hours) => Number.isFinite(hours));

    const average = completedHours.length
      ? completedHours.reduce((sum, value) => sum + value, 0) / completedHours.length
      : 0;

    elements.averageWorkingTime.textContent = formatDuration(average);
    elements.averageCard.classList.remove("average-good", "average-near", "average-low");

    if (!completedHours.length) {
      elements.averageDetail.textContent = "Complete a check out to calculate the monthly average.";
    } else if (average >= NORMAL_AVERAGE_HOURS) {
      elements.averageCard.classList.add("average-good");
      elements.averageDetail.textContent = `On or above the ${NORMAL_AVERAGE_HOURS} hour target.`;
    } else if (average >= NORMAL_AVERAGE_HOURS - 1) {
      elements.averageCard.classList.add("average-near");
      elements.averageDetail.textContent = `Close to the ${NORMAL_AVERAGE_HOURS} hour target.`;
    } else {
      elements.averageCard.classList.add("average-low");
      elements.averageDetail.textContent = `Below the ${NORMAL_AVERAGE_HOURS} hour target.`;
    }

    elements.workSummary.value = todayRecord.summary || "";
    updateSummaryCount();
    elements.summarySaveState.textContent = todayRecord.summary ? "Saved" : "Not saved";
    elements.summarySaveState.classList.toggle("saved", Boolean(todayRecord.summary));
  }

  function renderAttendanceTable() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dates = getMonthDates(now);
    const fragment = document.createDocumentFragment();

    elements.attendanceMonthHeading.textContent = formatMonth(now);

    dates.forEach((date, index) => {
      const key = localDateKey(date);
      const record = state.records[key] || {};
      const row = document.createElement("tr");
      const holiday = isHoliday(date);
      const future = date > todayStart;

      if (holiday) row.classList.add("holiday-row");
      if (isSameDate(date, now)) row.classList.add("today-row");
      if (future) row.classList.add("future-row");

      const values = [
        String(index + 1).padStart(2, "0"),
        formatDate(date),
        `<span class="day-tag">${new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date)}</span>`,
        holiday ? "Holiday" : formatTime(record.checkIn),
        holiday ? "Holiday" : formatTime(record.checkOut)
      ];

      values.forEach((value, cellIndex) => {
        const cell = document.createElement("td");
        if (cellIndex === 2) {
          cell.innerHTML = value;
        } else {
          cell.textContent = value;
        }
        row.appendChild(cell);
      });

      fragment.appendChild(row);
    });

    elements.attendanceTableBody.replaceChildren(fragment);
  }

  function renderMonthlyStatus() {
    const now = new Date();
    const stats = getMonthlyStats();
    const relevantTotal = stats.present + stats.leave + stats.holidays;
    const attendanceTotal = stats.present + stats.leave;
    const completion = attendanceTotal > 0 ? Math.round((stats.present / attendanceTotal) * 100) : 0;

    const presentAngle = relevantTotal > 0 ? (stats.present / relevantTotal) * 360 : 0;
    const leaveAngle = relevantTotal > 0 ? presentAngle + (stats.leave / relevantTotal) * 360 : 0;

    elements.monthStatusTitle.textContent = formatMonth(now);
    elements.monthCompletionChip.textContent = `${completion}%`;
    elements.statusDonut.style.background = relevantTotal
      ? ""
      : "rgba(255, 255, 255, 0.06)";
    elements.statusDonut.style.setProperty("--present-angle", `${presentAngle}deg`);
    elements.statusDonut.style.setProperty("--leave-angle", `${leaveAngle}deg`);
    elements.presentDays.textContent = stats.present;
    elements.presentLegend.textContent = stats.present;
    elements.leaveLegend.textContent = stats.leave;
    elements.holidayLegend.textContent = stats.holidays;
  }

  function renderHoursChart() {
    const completed = getCurrentMonthRecordEntries()
      .map(([key, record]) => ({
        date: parseDateKey(key),
        hours: getWorkingDurationHours(record)
      }))
      .filter((item) => Number.isFinite(item.hours))
      .slice(-7);

    elements.hoursChartEmpty.style.display = completed.length ? "none" : "grid";
    elements.hoursChart.style.opacity = completed.length ? "1" : "0";

    if (!completed.length) return;

    const canvas = elements.hoursChart;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue("--muted-2").trim();
    const purple = styles.getPropertyValue("--purple").trim();
    const gridColor = "rgba(255,255,255,0.075)";

    const padding = { top: 18, right: 12, bottom: 38, left: 38 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    const maxValue = Math.max(NORMAL_AVERAGE_HOURS, ...completed.map((item) => item.hours));
    const scaleMax = Math.ceil(maxValue + 1);

    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = textColor;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const horizontalLines = 4;
    for (let i = 0; i <= horizontalLines; i += 1) {
      const value = (scaleMax / horizontalLines) * i;
      const y = padding.top + chartHeight - (value / scaleMax) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      ctx.fillText(`${Math.round(value)}h`, padding.left - 8, y);
    }

    const targetY = padding.top + chartHeight - (NORMAL_AVERAGE_HOURS / scaleMax) * chartHeight;
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(74,222,128,0.4)";
    ctx.beginPath();
    ctx.moveTo(padding.left, targetY);
    ctx.lineTo(padding.left + chartWidth, targetY);
    ctx.stroke();
    ctx.restore();

    const slotWidth = chartWidth / completed.length;
    const barWidth = Math.min(42, slotWidth * 0.56);

    completed.forEach((item, index) => {
      const x = padding.left + index * slotWidth + (slotWidth - barWidth) / 2;
      const barHeight = (item.hours / scaleMax) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      const radius = Math.min(8, barWidth / 2, barHeight / 2);

      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, "rgba(196,181,253,1)");
      gradient.addColorStop(1, purple);
      ctx.fillStyle = gradient;

      roundRect(ctx, x, y, barWidth, barHeight, radius);
      ctx.fill();

      ctx.fillStyle = "#f7f7fb";
      ctx.font = "600 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.hours.toFixed(1), x + barWidth / 2, Math.max(padding.top + 8, y - 9));

      ctx.fillStyle = textColor;
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(
        new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(item.date),
        x + barWidth / 2,
        rect.height - 15
      );
    });
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function renderAll() {
    renderDashboard();
    renderAttendanceTable();
    renderMonthlyStatus();
    requestAnimationFrame(renderHoursChart);
  }

  function handleCheckIn() {
    const now = new Date();
    if (isHoliday(now)) {
      showToast("Friday and Saturday are weekly holidays.", "error");
      return;
    }

    const key = localDateKey(now);
    const record = state.records[key] || {};

    if (record.checkIn) {
      showToast("Today's check in is already recorded.", "error");
      return;
    }

    state.records[key] = {
      ...record,
      checkIn: now.toISOString(),
      checkOut: null,
      summary: record.summary || ""
    };

    saveState();
    renderAll();
    showToast(`Checked in at ${formatTime(now.toISOString())}.`, "success");
  }

  function handleCheckOut() {
    const now = new Date();
    const key = localDateKey(now);
    const record = state.records[key];

    if (!record?.checkIn) {
      showToast("Check in before recording a check out.", "error");
      return;
    }

    if (record.checkOut) {
      showToast("Today's check out is already recorded.", "error");
      return;
    }

    state.records[key] = {
      ...record,
      checkOut: now.toISOString()
    };

    saveState();
    renderAll();
    showToast(`Checked out at ${formatTime(now.toISOString())}.`, "success");
  }

  function handleSaveSummary() {
    const key = localDateKey();
    const summary = elements.workSummary.value.trim();
    const record = state.records[key] || {};

    state.records[key] = {
      ...record,
      summary
    };

    saveState();
    renderDashboard();
    showToast(summary ? "Today's work summary was saved." : "Today's work summary was cleared.", "success");
  }

  function updateSummaryCount() {
    elements.summaryCharacterCount.textContent = `${elements.workSummary.value.length} / 500`;
    elements.summarySaveState.textContent = "Unsaved changes";
    elements.summarySaveState.classList.remove("saved");
  }

  function exportCsv() {
    const now = new Date();
    const rows = [["SL", "Date", "Day", "Check in time", "Check out time"]];

    getMonthDates(now).forEach((date, index) => {
      const key = localDateKey(date);
      const record = state.records[key] || {};
      const holiday = isHoliday(date);
      rows.push([
        index + 1,
        formatDate(date),
        new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date),
        holiday ? "Holiday" : formatTime(record.checkIn),
        holiday ? "Holiday" : formatTime(record.checkOut)
      ]);
    });

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `daily-office-attendance-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Attendance sheet exported as CSV.", "success");
  }

  function showToast(message, type = "success") {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 3200);
  }

  function setupResetDialog() {
    elements.resetDataButton.addEventListener("click", () => {
      if (typeof elements.resetDialog.showModal === "function") {
        elements.resetDialog.showModal();
      } else if (window.confirm("Reset all local attendance data?")) {
        resetData();
      }
    });

    elements.resetDialog.addEventListener("close", () => {
      if (elements.resetDialog.returnValue === "confirm") {
        resetData();
      }
    });
  }

  function resetData() {
    state = { version: 1, createdAt: localDateKey(), records: {} };
    saveState();
    renderAll();
    showToast("All local attendance data was reset.", "success");
  }

  function setupNavigation() {
    const links = document.querySelectorAll(".nav-item");
    links.forEach((link) => {
      link.addEventListener("click", () => {
        links.forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
      });
    });
  }

  elements.checkInButton.addEventListener("click", handleCheckIn);
  elements.checkOutButton.addEventListener("click", handleCheckOut);
  elements.saveSummaryButton.addEventListener("click", handleSaveSummary);
  elements.workSummary.addEventListener("input", updateSummaryCount);
  elements.exportButton.addEventListener("click", exportCsv);
  window.addEventListener("resize", () => requestAnimationFrame(renderHoursChart));

  setupResetDialog();
  setupNavigation();
  updateClock();
  renderAll();
  window.setInterval(updateClock, 1000);
})();

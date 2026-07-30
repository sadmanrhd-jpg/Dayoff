(() => {
  "use strict";

  const STORAGE_KEY = "dailyOfficeAttendance_v1";
  const NORMAL_AVERAGE_HOURS = 9;
  const UPCOMING_ITEM_LIMIT = 6;

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
    completedWorkingDays: document.getElementById("completedWorkingDays"),
    averageCard: document.getElementById("averageCard"),
    averageWorkingTime: document.getElementById("averageWorkingTime"),
    averageDetail: document.getElementById("averageDetail"),
    workSummary: document.getElementById("workSummary"),
    saveSummaryButton: document.getElementById("saveSummaryButton"),
    summaryCharacterCount: document.getElementById("summaryCharacterCount"),
    summarySaveState: document.getElementById("summarySaveState"),
    upcomingHolidayList: document.getElementById("upcomingHolidayList"),
    upcomingLeaveList: document.getElementById("upcomingLeaveList"),
    addLeaveButton: document.getElementById("addLeaveButton"),
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
    resetDialog: document.getElementById("resetDialog"),
    attendanceEditDialog: document.getElementById("attendanceEditDialog"),
    attendanceEditForm: document.getElementById("attendanceEditForm"),
    editAttendanceDateKey: document.getElementById("editAttendanceDateKey"),
    editAttendanceDateLabel: document.getElementById("editAttendanceDateLabel"),
    editCheckInTime: document.getElementById("editCheckInTime"),
    editCheckOutTime: document.getElementById("editCheckOutTime"),
    clearAttendanceButton: document.getElementById("clearAttendanceButton"),
    leaveDialog: document.getElementById("leaveDialog"),
    leaveForm: document.getElementById("leaveForm"),
    leaveDate: document.getElementById("leaveDate"),
    leaveReason: document.getElementById("leaveReason")
  };

  let state = loadState();
  let toastTimer = null;

  function defaultState() {
    return {
      version: 2,
      createdAt: localDateKey(),
      records: {},
      plannedLeaves: {}
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && typeof parsed === "object" && parsed.records) {
        return {
          version: 2,
          createdAt: parsed.createdAt || localDateKey(),
          records: parsed.records || {},
          plannedLeaves: parsed.plannedLeaves || {}
        };
      }
    } catch (error) {
      console.error("Could not read attendance data", error);
    }

    return defaultState();
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

  function startOfDay(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function timeInputValue(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function timestampFromDateAndTime(dateKey, timeValue) {
    if (!timeValue) return null;
    const date = parseDateKey(dateKey);
    const [hours, minutes] = timeValue.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
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

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short"
    }).format(date);
  }

  function formatMonth(date) {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatWeekday(date) {
    return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
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
    const todayStart = startOfDay(now);
    const trackingStart = startOfDay(parseDateKey(state.createdAt || localDateKey(now)));
    const dates = getMonthDates(now);
    let present = 0;
    let leave = 0;
    let holidays = 0;
    let completed = 0;

    dates.forEach((date) => {
      const key = localDateKey(date);
      const dateStart = startOfDay(date);
      const isPast = dateStart < todayStart;
      const isElapsed = dateStart <= todayStart;
      const isTracked = dateStart >= trackingStart;
      const record = state.records[key];

      if (isHoliday(date)) {
        if (isElapsed && isTracked) holidays += 1;
        return;
      }

      if (record?.checkIn) {
        present += 1;
        if (record.checkOut && getWorkingDurationHours(record)) completed += 1;
      } else if (isPast && isTracked) {
        leave += 1;
      }
    });

    return { present, leave, holidays, completed };
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
    const plannedLeaveToday = state.plannedLeaves[todayKey];

    elements.attendanceStatus.classList.remove("checked-in", "checked-out", "on-leave");

    if (todayRecord.checkOut) {
      elements.attendanceStatus.classList.add("checked-out");
      elements.attendanceStatus.querySelector("span:last-child").textContent = `Checked out at ${formatTime(todayRecord.checkOut)}`;
    } else if (todayRecord.checkIn) {
      elements.attendanceStatus.classList.add("checked-in");
      elements.attendanceStatus.querySelector("span:last-child").textContent = `Working since ${formatTime(todayRecord.checkIn)}`;
    } else if (holidayToday) {
      elements.attendanceStatus.querySelector("span:last-child").textContent = "Weekly holiday";
    } else if (plannedLeaveToday) {
      elements.attendanceStatus.classList.add("on-leave");
      elements.attendanceStatus.querySelector("span:last-child").textContent = "Planned leave";
    } else {
      elements.attendanceStatus.querySelector("span:last-child").textContent = "Not checked in";
    }

    elements.checkInButton.disabled = Boolean(todayRecord.checkIn) || holidayToday || Boolean(plannedLeaveToday);
    elements.checkOutButton.disabled = !todayRecord.checkIn || Boolean(todayRecord.checkOut) || holidayToday;

    if (todayRecord.checkIn) {
      elements.todayCheckIn.textContent = formatTime(todayRecord.checkIn);
      elements.todayCheckInDetail.textContent = todayRecord.checkOut
        ? `Checked out at ${formatTime(todayRecord.checkOut)}.`
        : "Attendance is active for today.";
    } else if (holidayToday) {
      elements.todayCheckIn.textContent = "Weekly holiday";
      elements.todayCheckInDetail.textContent = "Friday and Saturday are marked as holidays.";
    } else if (plannedLeaveToday) {
      elements.todayCheckIn.textContent = "Planned leave";
      elements.todayCheckInDetail.textContent = plannedLeaveToday.reason || "This day is marked as personal leave.";
    } else {
      elements.todayCheckIn.textContent = "Not recorded";
      elements.todayCheckInDetail.textContent = "Use the check in button to start your day.";
    }

    const stats = getMonthlyStats();
    elements.leaveCount.textContent = `${stats.leave} ${stats.leave === 1 ? "day" : "days"}`;
    elements.completedWorkingDays.textContent = `${stats.completed} ${stats.completed === 1 ? "day" : "days"}`;

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
    setSummaryCount();
    elements.summarySaveState.textContent = todayRecord.summary ? "Saved" : "Not saved";
    elements.summarySaveState.classList.toggle("saved", Boolean(todayRecord.summary));
  }

  function renderAttendanceTable() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const dates = getMonthDates(now);
    const fragment = document.createDocumentFragment();

    elements.attendanceMonthHeading.textContent = formatMonth(now);

    dates.forEach((date, index) => {
      const key = localDateKey(date);
      const record = state.records[key] || {};
      const plannedLeave = state.plannedLeaves[key];
      const row = document.createElement("tr");
      const holiday = isHoliday(date);
      const future = startOfDay(date) > todayStart;

      if (holiday) row.classList.add("holiday-row");
      if (plannedLeave && !holiday) row.classList.add("planned-leave-row");
      if (isSameDate(date, now)) row.classList.add("today-row");
      if (future) row.classList.add("future-row");

      const values = [
        String(index + 1).padStart(2, "0"),
        formatDate(date),
        formatWeekday(date),
        holiday ? "Holiday" : plannedLeave && !record.checkIn ? "Planned leave" : formatTime(record.checkIn),
        holiday ? "Holiday" : plannedLeave && !record.checkIn ? "Planned leave" : formatTime(record.checkOut)
      ];

      values.forEach((value, cellIndex) => {
        const cell = document.createElement("td");
        if (cellIndex === 2) {
          const tag = document.createElement("span");
          tag.className = "day-tag";
          tag.textContent = value;
          cell.appendChild(tag);
        } else {
          cell.textContent = value;
        }
        row.appendChild(cell);
      });

      const actionCell = document.createElement("td");
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "table-action-button";
      editButton.dataset.editDate = key;
      editButton.textContent = record.checkIn || record.checkOut ? "Edit" : "Add";
      editButton.disabled = holiday || future;
      editButton.title = holiday
        ? "Weekly holidays cannot be edited"
        : future
          ? "Future attendance cannot be entered"
          : "Add or edit attendance times";
      actionCell.appendChild(editButton);
      row.appendChild(actionCell);

      fragment.appendChild(row);
    });

    elements.attendanceTableBody.replaceChildren(fragment);
  }

  function getUpcomingHolidays() {
    const dates = [];
    const cursor = startOfDay(new Date());
    cursor.setDate(cursor.getDate() + 1);

    while (dates.length < UPCOMING_ITEM_LIMIT) {
      if (isHoliday(cursor)) dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }

  function getUpcomingLeaves() {
    const today = startOfDay(new Date());
    return Object.entries(state.plannedLeaves)
      .filter(([key]) => startOfDay(parseDateKey(key)) >= today)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, UPCOMING_ITEM_LIMIT);
  }

  function createScheduleItem({ date, title, detail, type, removableDate }) {
    const item = document.createElement("div");
    item.className = `schedule-item ${type}`;

    const dateBadge = document.createElement("div");
    dateBadge.className = "schedule-date-badge";
    const dateNumber = document.createElement("strong");
    dateNumber.textContent = String(date.getDate()).padStart(2, "0");
    const monthName = document.createElement("span");
    monthName.textContent = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
    dateBadge.append(dateNumber, monthName);

    const copy = document.createElement("div");
    copy.className = "schedule-copy";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const description = document.createElement("span");
    description.textContent = detail;
    copy.append(heading, description);

    item.append(dateBadge, copy);

    if (removableDate) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "schedule-remove-button";
      removeButton.dataset.removeLeave = removableDate;
      removeButton.setAttribute("aria-label", `Remove leave on ${formatDate(date)}`);
      removeButton.title = "Remove planned leave";
      removeButton.textContent = "×";
      item.appendChild(removeButton);
    }

    return item;
  }

  function renderUpcoming() {
    const holidayFragment = document.createDocumentFragment();
    getUpcomingHolidays().forEach((date) => {
      holidayFragment.appendChild(createScheduleItem({
        date,
        title: "Weekly holiday",
        detail: `${formatWeekday(date)}, ${formatDate(date)}`,
        type: "holiday"
      }));
    });
    elements.upcomingHolidayList.replaceChildren(holidayFragment);

    const upcomingLeaves = getUpcomingLeaves();
    if (!upcomingLeaves.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "schedule-empty-state";
      emptyState.innerHTML = "<strong>No upcoming leave</strong><span>Add a planned leave to show it here.</span>";
      elements.upcomingLeaveList.replaceChildren(emptyState);
      return;
    }

    const leaveFragment = document.createDocumentFragment();
    upcomingLeaves.forEach(([key, leave]) => {
      const date = parseDateKey(key);
      leaveFragment.appendChild(createScheduleItem({
        date,
        title: "Personal leave",
        detail: leave.reason || formatShortDate(date),
        type: "leave",
        removableDate: key
      }));
    });
    elements.upcomingLeaveList.replaceChildren(leaveFragment);
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
    if (rect.width <= 0 || rect.height <= 0) return;

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
    renderUpcoming();
    renderAttendanceTable();
    renderMonthlyStatus();
    requestAnimationFrame(renderHoursChart);
  }

  function handleCheckIn() {
    const now = new Date();
    const key = localDateKey(now);

    if (isHoliday(now)) {
      showToast("Friday and Saturday are weekly holidays.", "error");
      return;
    }

    if (state.plannedLeaves[key]) {
      showToast("Remove today's planned leave before checking in.", "error");
      return;
    }

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

  function setSummaryCount() {
    elements.summaryCharacterCount.textContent = `${elements.workSummary.value.length} / 500`;
  }

  function markSummaryUnsaved() {
    setSummaryCount();
    elements.summarySaveState.textContent = "Unsaved changes";
    elements.summarySaveState.classList.remove("saved");
  }

  function openAttendanceEditor(dateKey) {
    const date = parseDateKey(dateKey);
    if (isHoliday(date) || startOfDay(date) > startOfDay(new Date())) return;

    const record = state.records[dateKey] || {};
    elements.editAttendanceDateKey.value = dateKey;
    elements.editAttendanceDateLabel.value = `${formatDate(date)} · ${formatWeekday(date)}`;
    elements.editCheckInTime.value = timeInputValue(record.checkIn);
    elements.editCheckOutTime.value = timeInputValue(record.checkOut);
    openDialog(elements.attendanceEditDialog);
  }

  function handleAttendanceEditSubmit(event) {
    event.preventDefault();
    const dateKey = elements.editAttendanceDateKey.value;
    const checkInTime = elements.editCheckInTime.value;
    const checkOutTime = elements.editCheckOutTime.value;

    if (checkOutTime && !checkInTime) {
      showToast("Enter a check in time before the check out time.", "error");
      return;
    }

    const checkIn = timestampFromDateAndTime(dateKey, checkInTime);
    const checkOut = timestampFromDateAndTime(dateKey, checkOutTime);

    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      showToast("Check out time must be later than check in time.", "error");
      return;
    }

    const existing = state.records[dateKey] || {};
    if (!checkIn && !checkOut) {
      if (existing.summary) {
        state.records[dateKey] = { summary: existing.summary };
      } else {
        delete state.records[dateKey];
      }
    } else {
      state.records[dateKey] = {
        ...existing,
        checkIn,
        checkOut,
        summary: existing.summary || "",
        manuallyEditedAt: new Date().toISOString()
      };
      delete state.plannedLeaves[dateKey];
    }

    saveState();
    closeDialog(elements.attendanceEditDialog);
    renderAll();
    showToast("Attendance data was updated.", "success");
  }

  function clearAttendanceTimes() {
    elements.editCheckInTime.value = "";
    elements.editCheckOutTime.value = "";
  }

  function openLeaveDialog() {
    elements.leaveForm.reset();
    elements.leaveDate.min = localDateKey();
    elements.leaveDate.value = "";
    openDialog(elements.leaveDialog);
  }

  function handleLeaveSubmit(event) {
    event.preventDefault();
    const dateKey = elements.leaveDate.value;
    const reason = elements.leaveReason.value.trim();

    if (!dateKey) {
      showToast("Select a leave date.", "error");
      return;
    }

    const leaveDate = parseDateKey(dateKey);
    if (startOfDay(leaveDate) < startOfDay(new Date())) {
      showToast("Upcoming leave cannot be added to a past date.", "error");
      return;
    }

    if (isHoliday(leaveDate)) {
      showToast("Friday and Saturday are already weekly holidays.", "error");
      return;
    }

    if (state.records[dateKey]?.checkIn) {
      showToast("Attendance already exists for this date.", "error");
      return;
    }

    state.plannedLeaves[dateKey] = {
      reason,
      createdAt: new Date().toISOString()
    };

    saveState();
    closeDialog(elements.leaveDialog);
    renderAll();
    showToast("Upcoming leave was added.", "success");
  }

  function removePlannedLeave(dateKey) {
    if (!state.plannedLeaves[dateKey]) return;
    delete state.plannedLeaves[dateKey];
    saveState();
    renderAll();
    showToast("Planned leave was removed.", "success");
  }

  function exportCsv() {
    const now = new Date();
    const rows = [["SL", "Date", "Day", "Check in time", "Check out time"]];

    getMonthDates(now).forEach((date, index) => {
      const key = localDateKey(date);
      const record = state.records[key] || {};
      const holiday = isHoliday(date);
      const plannedLeave = state.plannedLeaves[key] && !record.checkIn;
      rows.push([
        index + 1,
        formatDate(date),
        formatWeekday(date),
        holiday ? "Holiday" : plannedLeave ? "Planned leave" : formatTime(record.checkIn),
        holiday ? "Holiday" : plannedLeave ? "Planned leave" : formatTime(record.checkOut)
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

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function setupDialogs() {
    elements.resetDataButton.addEventListener("click", () => {
      if (typeof elements.resetDialog.showModal === "function") {
        elements.resetDialog.showModal();
      } else if (window.confirm("Reset all local attendance data?")) {
        resetData();
      }
    });

    elements.resetDialog.addEventListener("close", () => {
      if (elements.resetDialog.returnValue === "confirm") resetData();
    });

    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => {
        const dialog = document.getElementById(button.dataset.closeDialog);
        if (dialog) closeDialog(dialog);
      });
    });

    [elements.attendanceEditDialog, elements.leaveDialog].forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
    });
  }

  function resetData() {
    state = defaultState();
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
  elements.workSummary.addEventListener("input", markSummaryUnsaved);
  elements.exportButton.addEventListener("click", exportCsv);
  elements.addLeaveButton.addEventListener("click", openLeaveDialog);
  elements.attendanceEditForm.addEventListener("submit", handleAttendanceEditSubmit);
  elements.clearAttendanceButton.addEventListener("click", clearAttendanceTimes);
  elements.leaveForm.addEventListener("submit", handleLeaveSubmit);

  elements.attendanceTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-date]");
    if (button && !button.disabled) openAttendanceEditor(button.dataset.editDate);
  });

  elements.upcomingLeaveList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-leave]");
    if (button) removePlannedLeave(button.dataset.removeLeave);
  });

  window.addEventListener("resize", () => requestAnimationFrame(renderHoursChart));

  setupDialogs();
  setupNavigation();
  updateClock();
  renderAll();
  window.setInterval(updateClock, 1000);
})();

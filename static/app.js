const API_BASE = "http://127.0.0.1:8000";

let currentDate = new Date(); // 現在表示している年月

const monthYearDisplay = document.getElementById("month-year-display");
const calendarGrid = document.getElementById("calendar-grid");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

// 初期ロード
document.addEventListener("DOMContentLoaded", () => {
    loadCalendar();
});

// 前月・次月ボタンのイベント
prevBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadCalendar();
});

nextBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadCalendar();
});

// カレンダー全体の読み込みと描画
async function loadCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 0-indexed なので +1

    // ヘッダーの年月表示を更新
    monthYearDisplay.textContent = `${year}年 ${month}月`;

    // 1. バックエンドから当月の予定を取得
    let events = [];
    try {
        const response = await fetch(`${API_BASE}/events?year=${year}&month=${month}`);
        if (response.ok) {
            events = await response.json();
        }
    } catch (error) {
        console.error("予定の取得に失敗しました:", error);
    }

    // 2. カレンダーの42マス（6週間分）を計算して描画
    renderCalendarGrid(year, month, events);
}

// カレンダーグリッド（42マス）を計算・描画する関数
function renderCalendarGrid(year, month, events) {
    calendarGrid.innerHTML = "";

    // 当月1日の曜日 (0: 日曜, 1: 月曜, ... 6: 土曜)
    const firstDayIndex = new Date(year, month - 1, 1).getDay();
    // 当月の最終日
    const lastDay = new Date(year, month, 0).getDate();
    // 前月の最終日
    const prevLastDay = new Date(year, month - 1, 0).getDate();

    const totalCells = 42; // 6週間固定の42マス
    let dayCounter = 1;
    let nextMonthDayCounter = 1;

    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-cell");

        let cellDateStr = "";
        
        if (i < firstDayIndex) {
            // 前月のはみ出た日数
            const prevDayNum = prevLastDay - (firstDayIndex - 1 - i);
            cell.classList.add("other-month");
            cell.innerHTML = `<div class="day-number">${prevDayNum}</div>`;
        } else if (dayCounter <= lastDay) {
            // 当月の日付
            const currentDayStr = String(dayCounter).padStart(2, '0');
            const currentMonthStr = String(month).padStart(2, '0');
            cellDateStr = `${year}-${currentMonthStr}-${currentDayStr}`;

            cell.innerHTML = `<div class="day-number">${dayCounter}</div>`;

            // この日の予定をフィルタリングして表示
            const dayEvents = events.filter(event => event.start_at.startsWith(cellDateStr));
            dayEvents.forEach(event => {
                const eventDiv = document.createElement("div");
                eventDiv.classList.add("event-item");
                eventDiv.textContent = event.title;
                cell.appendChild(eventDiv);
            });

            // 日付セルをクリックしたときの処理（予定追加用）
            cell.addEventListener("click", () => {
                openEventModal(cellDateStr);
            });

            dayCounter++;
        } else {
            // 翌月のはみ出た日数
            cell.classList.add("other-month");
            cell.innerHTML = `<div class="day-number">${nextMonthDayCounter}</div>`;
            nextMonthDayCounter++;
        }

        calendarGrid.appendChild(cell);
    }
}

// モーダル関連の簡易処理
const modal = document.getElementById("event-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const eventForm = document.getElementById("event-form");

function openEventModal(dateStr) {
    document.getElementById("event-date").value = dateStr;
    document.getElementById("modal-date-title").textContent = `${dateStr} の予定追加`;
    modal.classList.remove("hidden");
}

closeModalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
});

eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dateStr = document.getElementById("event-date").value;
    const title = document.getElementById("event-title").value;
    const category = document.getElementById("event-category").value;

    const newEvent = {
        title: title,
        description: "",
        start_at: `${dateStr}T10:00:00`,
        end_at: `${dateStr}T11:00:00`,
        category: category
    };

    try {
        const response = await fetch(`${API_BASE}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newEvent)
        });

        if (response.ok) {
            modal.classList.add("hidden");
            eventForm.reset();
            loadCalendar(); // カレンダーを再読み込み
        }
    } catch (error) {
        console.error("予定の登録に失敗しました:", error);
    }
});
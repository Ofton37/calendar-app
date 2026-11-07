const API_BASE = "http://127.0.0.1:8000";

let currentDate = new Date(); // 現在表示している年月
let editingEventId = null; // 編集中の予定ID（nullなら新規作成）

const monthYearDisplay = document.getElementById("month-year-display");
const calendarGrid = document.getElementById("calendar-grid");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

// モーダル関連の要素
const modal = document.getElementById("event-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const eventForm = document.getElementById("event-form");
const deleteBtn = document.getElementById("delete-btn");

// 繰り返し用の要素
const isRecurringCheckbox = document.getElementById("is-recurring");
const recurringOptions = document.getElementById("recurring-options");

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

// 「毎週繰り返す」チェックボックスの切り替え表示
if (isRecurringCheckbox && recurringOptions) {
    isRecurringCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
            recurringOptions.classList.remove("hidden");
        } else {
            recurringOptions.classList.add("hidden");
        }
    });
}

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
                
                // 予定をクリックしたときは編集モーダルを開く（セルのクリック発火を防ぐ）
                eventDiv.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openEditModal(event);
                });

                cell.appendChild(eventDiv);
            });

            // 空白セルをクリックしたときの処理（新規予定追加用）
            cell.addEventListener("click", () => {
                openCreateModal(cellDateStr);
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

// 新規作成用モーダルを開く
function openCreateModal(dateStr) {
    editingEventId = null;
    document.getElementById("event-date").value = dateStr;
    document.getElementById("modal-date-title").textContent = `${dateStr} の予定追加`;
    document.getElementById("event-title").value = "";
    document.getElementById("event-category").value = "";
    
    // 繰り返し設定をリセット
    if (isRecurringCheckbox) {
        isRecurringCheckbox.checked = false;
    }
    if (recurringOptions) {
        recurringOptions.classList.add("hidden");
    }

    if (deleteBtn) deleteBtn.classList.add("hidden"); // 新規時は削除ボタン非表示
    modal.classList.remove("hidden");
}

// 編集用モーダルを開く
function openEditModal(event) {
    editingEventId = event.id;
    const dateStr = event.start_at.split("T")[0];
    
    document.getElementById("event-date").value = dateStr;
    document.getElementById("modal-date-title").textContent = `予定の編集`;
    document.getElementById("event-title").value = event.title;
    document.getElementById("event-category").value = event.category || "";
    
    // 編集時は繰り返し設定を隠す（単発ごとの編集のため）
    if (isRecurringCheckbox) {
        isRecurringCheckbox.checked = false;
    }
    if (recurringOptions) {
        recurringOptions.classList.add("hidden");
    }

    if (deleteBtn) deleteBtn.classList.remove("hidden"); // 編集時は削除ボタンを表示
    modal.classList.remove("hidden");
}

// モーダルを閉じる
closeModalBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
});

// フォーム送信時（新規作成 or 繰り返し作成 or 編集の保存）
eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("event-title").value;
    const category = document.getElementById("event-category").value;
    const isRecurring = isRecurringCheckbox ? isRecurringCheckbox.checked : false;

    try {
        let response;
        if (isRecurring && !editingEventId) {
            // 繰り返し予定の作成（POST /events/recurring）
            const weekday = parseInt(document.getElementById("recurring-weekday").value);
            const weeksCount = parseInt(document.getElementById("recurring-count").value);

            const recurringData = {
                title: title,
                description: "",
                start_time: "10:00:00",
                end_time: "11:00:00",
                category: category,
                target_weekday: weekday,
                weeks_count: weeksCount
            };

            response = await fetch(`${API_BASE}/events/recurring`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(recurringData)
            });
        } else if (editingEventId) {
            // 編集（PUT）
            const dateStr = document.getElementById("event-date").value;
            const eventData = {
                title: title,
                description: "",
                start_at: `${dateStr}T10:00:00`,
                end_at: `${dateStr}T11:00:00`,
                category: category
            };
            response = await fetch(`${API_BASE}/events/${editingEventId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eventData)
            });
        } else {
            // 通常の単発作成（POST）
            const dateStr = document.getElementById("event-date").value;
            const eventData = {
                title: title,
                description: "",
                start_at: `${dateStr}T10:00:00`,
                end_at: `${dateStr}T11:00:00`,
                category: category
            };
            response = await fetch(`${API_BASE}/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eventData)
            });
        }

        if (response.ok) {
            modal.classList.add("hidden");
            eventForm.reset();
            if (recurringOptions) recurringOptions.classList.add("hidden");
            loadCalendar(); // カレンダーを再読み込み
        }
    } catch (error) {
        console.error("保存に失敗しました:", error);
    }
});

// 削除ボタンの処理
if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
        if (!editingEventId) return;
        if (!confirm("この予定を削除してもよろしいですか？")) return;

        try {
            const response = await fetch(`${API_BASE}/events/${editingEventId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                modal.classList.add("hidden");
                eventForm.reset();
                loadCalendar(); // カレンダーを再読み込み
            }
        } catch (error) {
            console.error("削除に失敗しました:", error);
        }
    });
}
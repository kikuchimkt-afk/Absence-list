document.addEventListener('DOMContentLoaded', () => {
    // --- Constants & Config ---
    const GAS_ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbz1S9fm8e7bMPe8BfnS50a0ujZQhLgN-VwktuJ6z3Oy68rX7KAPQ6RXdHa-f3VhxlBc/exec';

    // Fallback data for local testing (when fetch fails due to CORS)
    const FALLBACK_STUDENTS_CSV = `ID,Name,Grade
S001,佐藤 健太,中3
S002,鈴木 花子,中2
S003,高橋 次郎,中1
S004,田中 美咲,高1
S005,渡辺 翔太,高2`;

    const FALLBACK_TEACHERS_CSV = `ID,Name,Subject
T001,山田 太郎,数学
T002,斉藤 由美,英語
T003,木村 拓也,理科`;

    // --- DOM Elements ---
    const studentSelect = document.getElementById('studentSelect');
    const teacherSelect = document.getElementById('teacherSelect');
    const studentCsvInput = document.getElementById('studentCsv');
    const teacherCsvInput = document.getElementById('teacherCsv');

    // Calendar Elements
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthLabel = document.getElementById('currentMonthLabel');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const selectedDateInput = document.getElementById('selectedDate');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');

    // Form Elements
    const timeRadios = document.getElementsByName('timeSlot');
    const customTimeContainer = document.getElementById('customTimeContainer');
    const customTimeInput = document.getElementById('customTime');
    const reasonRadios = document.getElementsByName('reason');
    const customReasonContainer = document.getElementById('customReasonContainer');
    const customReasonInput = document.getElementById('customReason');
    const absenceForm = document.getElementById('absenceForm');

    // Submit Button
    const submitBtn = document.getElementById('submitBtn');

    // Tab Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // List Elements
    const absenceListContainer = document.getElementById('absenceListContainer');
    const searchInput = document.getElementById('searchInput');
    const filterPendingCheckbox = document.getElementById('filterPending');
    const refreshListBtn = document.getElementById('refreshListBtn');
    const listStats = document.getElementById('listStats');

    // --- State ---
    let currentDate = new Date();
    let selectedDate = null;
    let absenceData = []; // Cached list data

    // --- Initialization ---
    initCalendar();
    loadDefaultCSVs();

    // --- Event Listeners ---

    // Tab Navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + targetTab).classList.add('active');

            // Load data when switching to list tab
            if (targetTab === 'list') {
                loadAbsenceList();
            }
        });
    });

    // CSV Download Links
    document.getElementById('downloadStudentCsv').addEventListener('click', (e) => {
        e.preventDefault();
        downloadCSV('students_sample.csv', FALLBACK_STUDENTS_CSV);
    });
    document.getElementById('downloadTeacherCsv').addEventListener('click', (e) => {
        e.preventDefault();
        downloadCSV('teachers_sample.csv', FALLBACK_TEACHERS_CSV);
    });

    // CSV Inputs
    studentCsvInput.addEventListener('change', (e) => loadCSV(e.target.files[0], studentSelect, 'student'));
    teacherCsvInput.addEventListener('change', (e) => loadCSV(e.target.files[0], teacherSelect, 'teacher'));

    // Calendar Navigation
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Time Selection Logic
    Array.from(timeRadios).forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customTimeContainer.classList.remove('hidden');
                customTimeInput.setAttribute('required', 'true');
            } else {
                customTimeContainer.classList.add('hidden');
                customTimeInput.removeAttribute('required');
                customTimeInput.value = '';
            }
        });
    });

    // Reason Selection Logic
    Array.from(reasonRadios).forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'other') {
                customReasonContainer.classList.remove('hidden');
                customReasonInput.setAttribute('required', 'true');
            } else {
                customReasonContainer.classList.add('hidden');
                customReasonInput.removeAttribute('required');
                customReasonInput.value = '';
            }
        });
    });

    // SUBMIT BUTTON CLICK LISTENER
    submitBtn.addEventListener('click', handleManualSubmit);

    // List filters
    searchInput.addEventListener('input', renderFilteredList);
    filterPendingCheckbox.addEventListener('change', renderFilteredList);
    refreshListBtn.addEventListener('click', () => loadAbsenceList());

    // --- Functions ---

    // 1. CSV Handling
    function downloadCSV(filename, csvContent) {
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function loadDefaultCSVs() {
        // Helper to fetch and decode as UTF-8
        const fetchCsv = (url, selectElement, type, fallbackData) => {
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.arrayBuffer(); // Get as buffer to decode manually
                })
                .then(buffer => {
                    const decoder = new TextDecoder('utf-8');
                    const text = decoder.decode(buffer);
                    parseAndPopulate(text, selectElement, type);
                })
                .catch(err => {
                    console.warn(`Could not load local ${url}. Using fallback data.`, err);
                    parseAndPopulate(fallbackData, selectElement, type);
                });
        };

        fetchCsv('./students.csv', studentSelect, 'student', FALLBACK_STUDENTS_CSV);
        fetchCsv('./teachers.csv', teacherSelect, 'teacher', FALLBACK_TEACHERS_CSV);
    }

    function loadCSV(file, selectElement, type) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => parseAndPopulate(e.target.result, selectElement, type);
        reader.readAsText(file, 'UTF-8'); // Force UTF-8
    }

    function parseAndPopulate(csvText, selectElement, type) {
        selectElement.innerHTML = '<option value="">選択してください</option>';
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');

        const startIndex = (lines[0].toLowerCase().includes('id') || lines[0].includes('名前') || lines[0].includes('Name')) ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const columns = lines[i].split(',');
            if (columns.length < 2) continue;

            const id = columns[0].trim();
            const name = columns[1].trim();
            const gradeOrSubject = columns[2] ? columns[2].trim() : '';

            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${name} (${gradeOrSubject})`;
            selectElement.appendChild(option);
        }
    }

    // 2. Calendar Logic
    function initCalendar() {
        renderCalendar();
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
        currentMonthLabel.textContent = `${year}年 ${monthNames[month]}`;

        const days = ['日', '月', '火', '水', '木', '金', '土'];
        days.forEach(day => {
            const div = document.createElement('div');
            div.className = 'calendar-day-header';
            div.textContent = day;
            calendarGrid.appendChild(div);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day empty';
            calendarGrid.appendChild(div);
        }

        const today = new Date();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = i;

            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayDiv.classList.add('today');
            }

            if (selectedDate &&
                selectedDate.getDate() === i &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year) {
                dayDiv.classList.add('selected');
            }

            dayDiv.addEventListener('click', () => selectDate(new Date(year, month, i)));
            calendarGrid.appendChild(dayDiv);
        }
    }

    function selectDate(date) {
        selectedDate = date;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        selectedDateInput.value = `${y}-${m}-${d}`;

        const days = ['日', '月', '火', '水', '木', '金', '土'];
        selectedDateDisplay.textContent = `${y}年${m}月${d}日 (${days[date.getDay()]})`;

        renderCalendar();
    }

    // 3. Manual Submission Logic
    function handleManualSubmit() {
        // Validate Inputs
        if (!selectedDateInput.value) {
            alert("日付を選択してください");
            return;
        }
        if (!studentSelect.value) {
            alert("生徒を選択してください");
            return;
        }
        if (!teacherSelect.value) {
            alert("講師を選択してください");
            return;
        }

        // Collect Data
        const data = new FormData(absenceForm);
        let finalTime = data.get('timeSlot');
        if (!finalTime) {
            alert("時間を選択してください");
            return;
        }
        if (finalTime === 'custom') {
            finalTime = data.get('customTime');
            if (!finalTime) {
                alert("カスタム時間を入力してください");
                return;
            }
        }

        // Validate reason
        let finalReason = data.get('reason');
        if (!finalReason) {
            alert("欠席理由を選択してください");
            return;
        }
        if (finalReason === 'other') {
            finalReason = data.get('customReason');
            if (!finalReason || !finalReason.trim()) {
                alert("欠席理由を入力してください");
                return;
            }
        }

        // Validate absence type
        const absenceType = data.get('absenceType');
        if (!absenceType) {
            alert("欠席種類を選択してください");
            return;
        }

        const studentOption = studentSelect.options[studentSelect.selectedIndex];
        const teacherOption = teacherSelect.options[teacherSelect.selectedIndex];

        // Construct Query Parameters
        const params = new URLSearchParams();
        params.append('action', 'submit');
        params.append('date', selectedDateInput.value);
        params.append('finalTime', finalTime);
        params.append('studentName', studentOption.text);
        params.append('studentSelect', studentSelect.value);
        params.append('teacherName', teacherOption.text);
        params.append('teacherSelect', teacherSelect.value);
        params.append('subject', data.get('subject') || '未定');
        params.append('reason', finalReason);
        params.append('absenceType', absenceType);

        const submitUrl = `${GAS_ENDPOINT_URL}?${params.toString()}`;

        // Confirm submission
        const confirmMsg = `以下の内容で登録しますか？\n\n` +
            `日付: ${selectedDateInput.value}\n` +
            `時間: ${finalTime}\n` +
            `生徒: ${studentOption.text}\n` +
            `講師: ${teacherOption.text}\n` +
            `教科: ${data.get('subject') || '未定'}\n` +
            `理由: ${finalReason}\n` +
            `種類: ${absenceType}`;

        if (confirm(confirmMsg)) {
            submitBtn.disabled = true;
            submitBtn.textContent = '送信中...';

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.name = 'submitFrame_' + Date.now();
            document.body.appendChild(iframe);

            iframe.onload = function () {
                showToast('✅ 登録が完了しました！');

                absenceForm.reset();
                selectedDate = null;
                selectedDateDisplay.textContent = "日付を選択してください";
                selectedDateInput.value = "";
                renderCalendar();
                customTimeContainer.classList.add('hidden');
                customReasonContainer.classList.add('hidden');

                submitBtn.disabled = false;
                submitBtn.textContent = '登録する';

                setTimeout(() => document.body.removeChild(iframe), 1000);
            };

            iframe.onerror = function () {
                showToast('❌ 送信に失敗しました。再度お試しください。');
                submitBtn.disabled = false;
                submitBtn.textContent = '登録する';
                setTimeout(() => document.body.removeChild(iframe), 1000);
            };

            iframe.src = submitUrl;
        }
    }

    // 4. Absence List Management
    function loadAbsenceList() {
        absenceListContainer.innerHTML = '<div class="loading-message">📡 データを読み込んでいます...</div>';
        listStats.classList.add('hidden');

        const listUrl = `${GAS_ENDPOINT_URL}?action=list&t=${Date.now()}`;

        // Use JSONP-like approach with script tag to avoid CORS
        const callbackName = 'gasCallback_' + Date.now();
        window[callbackName] = function (data) {
            absenceData = data;
            renderFilteredList();
            delete window[callbackName];
            const scriptEl = document.getElementById(callbackName);
            if (scriptEl) scriptEl.remove();
        };

        // Try fetch first (works on server), fallback to script tag
        fetch(listUrl)
            .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(data => {
                absenceData = data;
                renderFilteredList();
            })
            .catch(err => {
                console.warn('Fetch failed, trying script tag approach:', err);
                // Use iframe approach to read the response
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.id = 'listFrame_' + Date.now();
                document.body.appendChild(iframe);

                iframe.onload = function () {
                    try {
                        const text = iframe.contentDocument.body.innerText;
                        const data = JSON.parse(text);
                        absenceData = data;
                        renderFilteredList();
                    } catch (e) {
                        absenceListContainer.innerHTML =
                            '<div class="empty-message">⚠️ データの読み込みに失敗しました。<br>GAS側のコードが最新か確認してください。</div>';
                    }
                    setTimeout(() => document.body.removeChild(iframe), 500);
                };

                iframe.onerror = function () {
                    absenceListContainer.innerHTML =
                        '<div class="empty-message">⚠️ データの読み込みに失敗しました。</div>';
                    setTimeout(() => document.body.removeChild(iframe), 500);
                };

                iframe.src = listUrl;
            });
    }

    function renderFilteredList() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const pendingOnly = filterPendingCheckbox.checked;

        let filtered = absenceData;

        if (searchTerm) {
            filtered = filtered.filter(item =>
                (item.studentName || '').toLowerCase().includes(searchTerm) ||
                (item.teacherName || '').toLowerCase().includes(searchTerm)
            );
        }

        if (pendingOnly) {
            filtered = filtered.filter(item => !item.makeupDate);
        }

        renderAbsenceList(filtered);
    }

    function renderAbsenceList(data) {
        if (!data || data.length === 0) {
            absenceListContainer.innerHTML = '<div class="empty-message">📭 該当するデータがありません</div>';
            listStats.classList.add('hidden');
            return;
        }

        const pendingCount = data.filter(item => !item.makeupDate).length;
        const completedCount = data.filter(item => item.makeupDate).length;

        listStats.classList.remove('hidden');
        listStats.innerHTML = `
            <span class="stat-item">📊 全${data.length}件</span>
            <span class="stat-item stat-pending">⏳ 未振替: ${pendingCount}件</span>
            <span class="stat-item stat-completed">✅ 実施済: ${completedCount}件</span>
        `;

        // Sort by date descending (newest first)
        const sorted = [...data].sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });

        absenceListContainer.innerHTML = sorted.map(item => {
            const isPending = !item.makeupDate;
            const statusClass = isPending ? 'status-pending' : 'status-completed';
            const statusText = isPending ? '⏳ 振替未実施' : `✅ ${item.makeupDate}`;
            const absenceTypeClass = item.absenceType === '当日欠席' ? 'type-sameday' : 'type-advance';
            const absenceTypeText = item.absenceType || '未分類';

            return `
                <div class="absence-card ${statusClass}">
                    <div class="absence-card-header">
                        <span class="absence-date">${item.date || '不明'}</span>
                        <span class="absence-time">${item.time || ''}</span>
                        <span class="badge ${absenceTypeClass}">${absenceTypeText}</span>
                    </div>
                    <div class="absence-card-body">
                        <div class="absence-info-row">
                            <span class="info-label">👤 生徒</span>
                            <span class="info-value">${item.studentName || '不明'}</span>
                        </div>
                        <div class="absence-info-row">
                            <span class="info-label">👨‍🏫 講師</span>
                            <span class="info-value">${item.teacherName || '不明'}</span>
                        </div>
                        <div class="absence-info-row">
                            <span class="info-label">📚 教科</span>
                            <span class="info-value">${item.subject || ''}</span>
                        </div>
                        <div class="absence-info-row">
                            <span class="info-label">📝 理由</span>
                            <span class="info-value">${item.reason || ''}</span>
                        </div>
                    </div>
                    <div class="absence-card-footer">
                        <div class="makeup-section">
                            <label class="makeup-label">振替実施日:</label>
                            <input type="date" class="makeup-date-input" value="${item.makeupDate || ''}" data-row="${item.row}">
                            <button type="button" class="makeup-save-btn" data-row="${item.row}">保存</button>
                        </div>
                        <div class="makeup-status">${statusText}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach save button listeners
        absenceListContainer.querySelectorAll('.makeup-save-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const row = btn.dataset.row;
                const dateInput = absenceListContainer.querySelector(`.makeup-date-input[data-row="${row}"]`);
                const makeupDate = dateInput.value;
                saveMakeupDate(row, makeupDate, btn);
            });
        });
    }

    function saveMakeupDate(row, makeupDate, btn) {
        btn.disabled = true;
        btn.textContent = '保存中...';

        const params = new URLSearchParams();
        params.append('action', 'update');
        params.append('row', row);
        params.append('makeupDate', makeupDate);

        const updateUrl = `${GAS_ENDPOINT_URL}?${params.toString()}`;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        iframe.onload = function () {
            showToast('✅ 振替実施日を保存しました');
            btn.disabled = false;
            btn.textContent = '保存';

            // Update local data
            const item = absenceData.find(d => String(d.row) === String(row));
            if (item) {
                item.makeupDate = makeupDate;
                renderFilteredList();
            }

            setTimeout(() => document.body.removeChild(iframe), 500);
        };

        iframe.onerror = function () {
            showToast('❌ 保存に失敗しました');
            btn.disabled = false;
            btn.textContent = '保存';
            setTimeout(() => document.body.removeChild(iframe), 500);
        };

        iframe.src = updateUrl;
    }

    // 5. Toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
});

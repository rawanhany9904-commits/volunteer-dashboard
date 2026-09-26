// الرابط الخاص بكِ الفعال من الـ Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywtVEoMOyEzLlsTknoM8pkBbsN7aMm3_CqkkaZCh_9sg3l8vGh71VluP4hItAF2tO2fg/exec";

const AUTO_REFRESH_MS = 24 * 60 * 60 * 1000; // تحديث تلقائي كل 24 ساعة

let charts = {};
let globalData = null;

// ألوان الهوية مقتبسة من اللوجو: كحلي + برتقالي وتدرجاتهم
function getPalette(theme) {
    return theme === 'dark'
        ? { navy: '#5ab0e8', orange: '#ff9436', sky: '#2d7fbf', amber: '#ffc98b', slate: '#a9bccb', deep: '#e8f1f8', rose: '#ff8fa3' }
        : { navy: '#054b7a', orange: '#ef7109', sky: '#4fa3d9', amber: '#f7b267', slate: '#7c8fa3', deep: '#0b2a40', rose: '#e05770' };
}

// 1. نظام التنقل بين الصفحات الـ 3 (Tabs)
function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(pageId).classList.add('active');

    const index = pageId.replace('page', '');
    document.querySelectorAll('.tab-btn')[index - 1].classList.add('active');
}

// 2. نظام الـ Dark & Light Mode
const themeToggleBtn = document.getElementById("themeToggleBtn");
if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        let newTheme = "light";

        if (currentTheme === "light") {
            newTheme = "dark";
            themeToggleBtn.innerText = "وضع النهار ☀️";
        } else {
            newTheme = "light";
            themeToggleBtn.innerText = "وضع الليل 🌙";
        }

        document.documentElement.setAttribute("data-theme", newTheme);
        try { localStorage.setItem('theme', newTheme); } catch (e) {}

        if (globalData) {
            destroyAllCharts();
            renderAllCharts(globalData, newTheme);
        }
    });
}

function destroyAllCharts() {
    Object.keys(charts).forEach(key => {
        if (charts[key]) charts[key].destroy();
    });
}

// خيارات لتنسيق ألوان النصوص والمحاور وتفعيل ظهور الأرقام الصحيحة على الأعمدة
function getChartOptions(theme) {
    const textColor = theme === 'dark' ? '#9fb6c7' : '#5b7285';
    const gridColor = theme === 'dark' ? '#23415a' : '#d3e0ea';

    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: textColor, font: { family: 'Cairo', size: 11 } }
            },
            tooltip: {
                enabled: true, rtl: true, textDirection: 'rtl'
            }
        },
        scales: {
            x: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { family: 'Cairo', size: 10 } }
            },
            y: {
                grid: { color: gridColor },
                beginAtZero: true,
                ticks: {
                    color: textColor,
                    font: { family: 'Cairo', size: 10 },
                    // لضمان ظهور الأرقام كقيم صحيحة دائماً (10، 20، إلخ) وتجنب الكسور العشرية
                    callback: function (value) {
                        if (value % 1 === 0) return value;
                    }
                }
            }
        }
    };
}

/* ---------------- حالة التحميل والتحديث ---------------- */
function setStatus(state) {
    const el = document.getElementById("lastUpdated");
    const btn = document.getElementById("refreshBtn");
    if (!el || !btn) return;
    el.classList.remove("is-error");
    if (state === 'loading') {
        el.innerHTML = '<span class="spinner"></span>جاري تحميل البيانات...';
        btn.disabled = true;
    } else if (state === 'ok') {
        const t = new Date().toLocaleString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        el.textContent = 'آخر تحديث: ' + t;
        btn.disabled = false;
    } else {
        el.classList.add("is-error");
        el.textContent = 'تعذر تحميل البيانات. تأكد من الاتصال ثم اضغط تحديث';
        btn.disabled = false;
    }
}

async function fetchDashboardData() {
    setStatus('loading');
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();

        if (data.error) {
            console.error(data.error);
            document.getElementById("totalCount").innerText = "خطأ";
            setStatus('error');
            return;
        }

        globalData = data;

        // تحديث كروت الأرقام العلوية
        document.getElementById("totalCount").innerText = data.totalVolunteers;
        document.getElementById("disabilityCount").innerText = data.disability["نعم"] || 0;

        let workingVolunteers = 0;
        for (let key in data.work) {
            if (key.includes("نعم")) workingVolunteers += data.work[key];
        }
        document.getElementById("workingCount").innerText = workingVolunteers;

        const activeTheme = document.documentElement.getAttribute("data-theme") || "light";
        destroyAllCharts();
        renderAllCharts(data, activeTheme);
        setStatus('ok');

    } catch (error) {
        console.error("حدث خطأ في الاتصال بالبيانات:", error);
        document.getElementById("totalCount").innerText = "خطأ اتصال";
        setStatus('error');
    }
}

function refreshDashboard() { fetchDashboardData(); }

function renderAllCharts(data, theme) {
    const chartOptions = getChartOptions(theme);
    const P = getPalette(theme);
    const legendLabels = { labels: { color: theme === 'dark' ? '#9fb6c7' : '#5b7285', font: { family: 'Cairo' } } };

    // 1. السن (Doughnut)
    charts.age = new Chart(document.getElementById("ageChart"), {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.age),
            datasets: [{
                data: Object.values(data.age),
                backgroundColor: [P.navy, P.orange, P.sky, P.amber]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: legendLabels, tooltip: { rtl: true, textDirection: 'rtl' } } }
    });

    // 2. النوع (Pie)
    charts.gender = new Chart(document.getElementById("genderChart"), {
        type: 'pie',
        data: {
            labels: Object.keys(data.gender),
            datasets: [{
                data: Object.values(data.gender),
                backgroundColor: [P.navy, P.orange, P.sky]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: legendLabels, tooltip: { rtl: true, textDirection: 'rtl' } } }
    });

    // 3. المرحلة الدراسية (Bar)
    charts.eduStage = new Chart(document.getElementById("eduStageChart"), {
        type: 'bar',
        data: {
            labels: Object.keys(data.eduStage),
            datasets: [{
                label: 'عدد المتقدمين',
                data: Object.values(data.eduStage),
                backgroundColor: P.navy,
                borderRadius: 4
            }]
        },
        options: chartOptions
    });

    // 4. العام الدراسي (Bar)
    charts.academicYear = new Chart(document.getElementById("academicYearChart"), {
        type: 'bar',
        data: {
            labels: Object.keys(data.academicYear),
            datasets: [{
                label: 'عدد الطلاب',
                data: Object.values(data.academicYear),
                backgroundColor: P.orange,
                borderRadius: 4
            }]
        },
        options: chartOptions
    });

    // 5. أعلى 10 تخصصات ومجالات الدراسة (Horizontal Bar)
    const sortedEdu = Object.entries(data.currentEdu).sort((a, b) => b[1] - a[1]).slice(0, 10);
    charts.currentEdu = new Chart(document.getElementById("currentEduChart"), {
        type: 'bar',
        data: {
            labels: sortedEdu.map(x => x[0]),
            datasets: [{
                label: 'عدد الطلاب الفعلي',
                data: sortedEdu.map(x => x[1]),
                backgroundColor: P.sky,
                borderRadius: 4
            }]
        },
        options: {
            ...chartOptions,
            indexAxis: 'y',
            plugins: { legend: legendLabels, tooltip: { rtl: true, textDirection: 'rtl' } }
        }
    });

    // 6. الجامعة المرغوبة (الالتحاق بالأسرة)
    charts.desiredUni = new Chart(document.getElementById("desiredUniChart"), {
        type: 'bar',
        data: {
            labels: Object.keys(data.desiredUni),
            datasets: [{
                label: 'الرغبة في الالتحاق بالأسرة',
                data: Object.values(data.desiredUni),
                backgroundColor: P.amber,
                borderRadius: 4
            }]
        },
        options: chartOptions
    });

    // 7. المحافظات (Bar)
    charts.gov = new Chart(document.getElementById("govChart"), {
        type: 'bar',
        data: {
            labels: Object.keys(data.governorates),
            datasets: [{
                label: 'عدد المتطوعين',
                data: Object.values(data.governorates),
                backgroundColor: P.navy,
                borderRadius: 4
            }]
        },
        options: chartOptions
    });

    // 8. مصدر المعرفة (مطابقة الاختيارات الستة الفعالة)
    const knowLabels = ["سوشيال ميديا", "من خلال اعلان", "من خلال الأنشطة", "من حملات الشارع", "اصحابك", "آخر"];
    const knowValues = knowLabels.map(label => {
        if (data.howDidYouKnow && data.howDidYouKnow[label] !== undefined) {
            return data.howDidYouKnow[label];
        }
        return 0;
    });

    charts.howDidYouKnow = new Chart(document.getElementById("howDidYouKnowChart"), {
        type: 'bar',
        data: {
            labels: knowLabels,
            datasets: [{
                label: 'عدد المتقدمين عبر القناة المحددة',
                data: knowValues,
                backgroundColor: P.orange,
                borderRadius: 4
            }]
        },
        options: { ...chartOptions, indexAxis: 'y' }
    });
}

/* ---------------- التشغيل ---------------- */
window.onload = async () => {
    try {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) themeToggleBtn.innerText = "وضع النهار ☀️";
        }
    } catch (e) {}

    try { await document.fonts.load('700 16px Cairo'); } catch (e) {}
    await fetchDashboardData();

    // تحديث تلقائي كل 24 ساعة طول ما الصفحة مفتوحة
    setInterval(() => { if (!document.hidden) fetchDashboardData(); }, AUTO_REFRESH_MS);
};// الرابط الخاص بكِ الفعال من الـ Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywtVEoMOyEzLlsTknoM8pkBbsN7aMm3_CqkkaZCh_9sg3l8vGh71VluP4hItAF2tO2fg/exec";

let charts = {}; 
let globalData = null; 

// 1. نظام التنقل بين الصفحات الـ 3 (Tabs)
function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(pageId).classList.add('active');
    
    const index = pageId.replace('page', '');
    document.querySelectorAll('.tab-btn')[index - 1].classList.add('active');
}

// 2. نظام الـ Dark & Light Mode
const themeToggleBtn = document.getElementById("themeToggleBtn");
if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        let newTheme = "light";
        
        if (currentTheme === "light") {
            newTheme = "dark";
            themeToggleBtn.innerText = "وضع النهار ☀️";
        } else {
            newTheme = "light";
            themeToggleBtn.innerText = "وضع الليل 🌙";
        }
        
        document.documentElement.setAttribute("data-theme", newTheme);
        
        if (globalData) {
            destroyAllCharts();
            renderAllCharts(globalData, newTheme);
        }
    });
}

function destroyAllCharts() {
    Object.keys(charts).forEach(key => {
        if (charts[key]) charts[key].destroy();
    });
}

// خيارات لتنسيق ألوان النصوص والمحاور وتفعيل ظهور الأرقام الصحيحة على الأعمدة
function getChartOptions(theme) {
    const textColor = theme === 'dark' ? '#aaaaaa' : '#666666';
    const gridColor = theme === 'dark' ? '#333333' : '#eef2f5';
    
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: textColor, font: { family: 'Segoe UI', size: 11 } }
            },
            tooltip: {
                enabled: true // يظهر لكِ الرقم الدقيق بالكامل فور الوقوف بالماوس على أي عمود
            }
        },
        scales: {
            x: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { family: 'Segoe UI', size: 10 } }
            },
            y: {
                grid: { color: gridColor },
                beginAtZero: true,
                ticks: { 
                    color: textColor, 
                    font: { family: 'Segoe UI', size: 10 },
                    // لضمان ظهور الأرقام كقيم صحيحة دائماً (10، 20، إلخ) وتجنب الكسور العشرية
                    callback: function(value) {
                        if (value % 1 === 0) {
                            return value;
                        }
                    }
                }
            }
        }
    };
}

async function fetchDashboardData() {
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();

        if (data.error) {
            console.error(data.error);
            document.getElementById("totalCount").innerText = "خطأ";
            return;
        }

        globalData = data; 

        // تحديث كروت الأرقام العلوية
        document.getElementById("totalCount").innerText = data.totalVolunteers;
        document.getElementById("disabilityCount").innerText = data.disability["نعم"] || 0;
        
        let workingVolunteers = 0;
        for (let key in data.work) {
            if (key.includes("نعم")) workingVolunteers += data.work[key];
        }
        document.getElementById("workingCount").innerText = workingVolunteers;

        const activeTheme = document.documentElement.getAttribute("data-theme") || "light";
        renderAllCharts(data, activeTheme);

    } catch (error) {
        console.error("حدث خطأ في الاتصال بالبيانات:", error);
        document.getElementById("totalCount").innerText = "خطأ اتصال";
    }
}

function renderAllCharts(data, theme) {
    const chartOptions = getChartOptions(theme);

    // 1. السن (Doughnut)
    charts.age = new Chart(document.getElementById("ageChart"), {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.age),
            datasets: [{
                data: Object.values(data.age),
                backgroundColor: ['#4bc0c0', '#36a2eb', '#ffcd56', '#ff9f40']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: theme === 'dark' ? '#aaa' : '#666' } } } }
    });

    // 2. النوع (Pie)
    charts.gender = new Chart(document.getElementById("genderChart"), {
        type: 'pie',
        data: {
            labels: Object.keys(data.gender),
            datasets: [{
                data: Object.values(data.gender),
                backgroundColor: ['#36a2eb', '#ff6384']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: theme === 'dark' ? '#aaa' : '#666' } } } }
    });

    // 3. المرحلة الدراسية (Bar)
    charts.eduStage = new Chart(document.getElementById("eduStageChart"), {
        type: 'bar',
        data: {
            labels: Object.keys(data.eduStage),
            datasets: [{
                label: 'عدد المتقدمين',
                data: Object.values(data.eduStage),
                backgroundColor: '#9966ff'
            }]
        },
        options: chartOptions
    });

    // 4. العام الدراسي (Bar)
    charts.academicYear = new Chart(document.getElementById("academicYearChart"), {
        type: 'bar',
        data: {
            labels: Object.keys(data.academicYear),
            datasets: [{
                label: 'عدد الطلاب',
                data: Object.values(data.academicYear),
                backgroundColor: '#ff9f40'
            }]
        },
        options: chartOptions
    });

    // 5. أعلى 10 تخصصات ومجالات الدراسة (Horizontal Bar)
    const sortedEdu = Object.entries(data.currentEdu).sort((a, b) => b[1] - a[1]).slice(0, 10);
    charts.currentEdu = new Chart(document.getElementById("currentEduChart"), {
        type: 'bar',
        data: {
            labels: sortedEdu.map(x => x[0]),
            datasets: [{
                label: 'عدد الطلاب الفعلي',
                data: sortedEdu.map(x => x[1]),
                backgroundColor: '#2ecc71'
            }]
        },
        options: { 
            ...chartOptions, 
            indexAxis: 'y',
            plugins: {
                legend: { labels: { color: theme === 'dark' ? '#aaa' : '#666' } }
            }
        }
    });

    // 6. الجامعة المرغوبة (الالتجاق بالأسرة)
    charts.desiredUni = new Chart(document.getElementById("desiredUniChart"), {
        type: 'bar',
        data: {
            labels: Object.keys(data.desiredUni),
            datasets: [{
                label: 'الرغبة في الالتحاق بالأسرة',
                data: Object.values(data.desiredUni),
                backgroundColor: '#ff6384'
            }]
        },
        options: chartOptions
    });

    // 7. المحافظات (Bar)
    charts.gov = new Chart(document.getElementById("govChart"), {
        type: 'bar',
        data: {
            labels: Object.keys(data.governorates),
            datasets: [{
                label: 'عدد المتطوعين',
                data: Object.values(data.governorates),
                backgroundColor: '#1877f2'
            }]
        },
        options: chartOptions
    });

    // 8. مصدر المعرفة (مطابقة الاختيارات الستة الفعالة)
    const knowLabels = ["سوشيال ميديا", "من خلال اعلان", "من خلال الأنشطة", "من حملات الشارع", "اصحابك", "آخر"];
    const knowValues = knowLabels.map(label => {
        if (data.howDidYouKnow && data.howDidYouKnow[label] !== undefined) {
            return data.howDidYouKnow[label];
        }
        return 0;
    });

    charts.howDidYouKnow = new Chart(document.getElementById("howDidYouKnowChart"), {
        type: 'bar',
        data: {
            labels: knowLabels,
            datasets: [{
                label: 'عدد المتقدمين عبر القناة المحددة',
                data: knowValues,
                backgroundColor: '#4bc0c0'
            }]
        },
        options: { ...chartOptions, indexAxis: 'y' }
    });
}

// تحميل البيانات فور تشغيل الصفحة
window.onload = fetchDashboardData;

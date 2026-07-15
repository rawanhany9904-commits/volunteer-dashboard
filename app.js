// الرابط الخاص بكِ الفعال من الـ Google Apps Script
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

    // 5. أعلى 10 تخصصات ومجالات الدراسة (Horizontal Bar مع إظهار القيم بالأرقام الفعالة)
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

    // 6. الجامعة المرغوبة (تعديل التسمية للرغبة في الالتحاق بالأسرة)
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

    // 8. مصدر المعرفة (مطابقة دقيقة للاختيارات الستة المحددة من الشيت)
    const knowLabels = ["سوشيال ميديا", "من خلال اعلان", "من خلال الأنشطة", "من حملات الشارع", "اصحابك", "آخر"];
    const knowValues = knowLabels.map(label => data.howDidYouKnow[label] || 0);

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

window.onload = fetchDashboardData;
// الرابط الخاص بكِ من الـ Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywtVEoMOyEzLlsTknoM8pkBbsN7aMm3_CqkkaZCh_9sg3l8vGh71VluP4hItAF2tO2fg/exec";

async function fetchDashboardData() {
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();

        if (data.error) {
            console.error(data.error);
            document.getElementById("totalCount").innerText = "خطأ";
            return;
        }

        // 1. تحديث الأرقام والبطاقات السريعة
        document.getElementById("totalCount").innerText = data.totalVolunteers;
        document.getElementById("disabilityCount").innerText = data.disability["نعم"] || 0;
        
        // حساب نسبة العاملين
        let workingVolunteers = 0;
        for (let key in data.work) {
            if (key.includes("نعم")) {
                workingVolunteers += data.work[key];
            }
        }
        document.getElementById("workingCount").innerText = workingVolunteers;

        // 2. رسم بياني للسن (Doughnut Chart)
        new Chart(document.getElementById("ageChart"), {
            type: 'doughnut',
            data: {
                labels: Object.keys(data.age),
                datasets: [{
                    data: Object.values(data.age),
                    backgroundColor: ['#4bc0c0', '#36a2eb', '#ffcd56', '#ff9f40']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // 3. رسم بياني للنوع (Pie Chart)
        new Chart(document.getElementById("genderChart"), {
            type: 'pie',
            data: {
                labels: Object.keys(data.gender),
                datasets: [{
                    data: Object.values(data.gender),
                    backgroundColor: ['#36a2eb', '#ff6384']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // 4. رسم بياني للمرحلة الدراسية (Bar Chart)
        new Chart(document.getElementById("eduStageChart"), {
            type: 'bar',
            data: {
                labels: Object.keys(data.eduStage),
                datasets: [{
                    label: 'عدد المتقدمين',
                    data: Object.values(data.eduStage),
                    backgroundColor: '#9966ff'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // 5. رسم بياني للعام الدراسي (Bar Chart)
        new Chart(document.getElementById("academicYearChart"), {
            type: 'bar',
            data: {
                labels: Object.keys(data.academicYear),
                datasets: [{
                    label: 'عدد الطلاب',
                    data: Object.values(data.academicYear),
                    backgroundColor: '#ff9f40'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // 6. رسم بياني لمصدر المعرفة (Horizontal Bar Chart)
        new Chart(document.getElementById("howDidYouKnowChart"), {
            type: 'bar',
            data: {
                labels: Object.keys(data.howDidYouKnow),
                datasets: [{
                    label: 'عدد المتقدمين عبر القناة',
                    data: Object.values(data.howDidYouKnow),
                    backgroundColor: '#4bc0c0'
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        // 7. رسم بياني للجامعة المرغوب التطوع بها (Bar Chart)
        new Chart(document.getElementById("desiredUniChart"), {
            type: 'bar',
            data: {
                labels: Object.keys(data.desiredUni),
                datasets: [{
                    label: 'الرغبة في الالتحاق بالفرع',
                    data: Object.values(data.desiredUni),
                    backgroundColor: '#ff6384'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // 8. رسم بياني للمحافظات (Bar Chart)
        new Chart(document.getElementById("govChart"), {
            type: 'bar',
            data: {
                labels: Object.keys(data.governorates),
                datasets: [{
                    label: 'عدد المتطوعين',
                    data: Object.values(data.governorates),
                    backgroundColor: '#1877f2'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });

        // 9. رسم بياني لمجالات الدراسة الحالية (أعلى 10 تخصصات)
        const sortedEdu = Object.entries(data.currentEdu).sort((a, b) => b[1] - a[1]).slice(0, 10);
        new Chart(document.getElementById("currentEduChart"), {
            type: 'bar',
            data: {
                labels: sortedEdu.map(x => x[0]),
                datasets: [{
                    label: 'عدد الطلاب في هذا التخصص',
                    data: sortedEdu.map(x => x[1]),
                    backgroundColor: '#2ecc71'
                }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        // 10. عرض المواهب والمهارات كـ Tags
        const talentsContainer = document.getElementById("talentsContainer");
        talentsContainer.innerHTML = ""; // مسح رسالة التحميل
        if (data.talents.length === 0) {
            talentsContainer.innerHTML = "<span class='tag'>لا توجد مواهب مسجلة حالياً</span>";
        } else {
            data.talents.forEach(talent => {
                const span = document.createElement("span");
                span.className = "tag";
                span.innerText = talent;
                talentsContainer.appendChild(span);
            });
        }

    } catch (error) {
        console.error("حدث خطأ في جلب أو معالجة البيانات:", error);
        document.getElementById("totalCount").innerText = "خطأ في الاتصال";
    }
}

// تشغيل جلب البيانات فوراً عند فتح الصفحة
window.onload = fetchDashboardData;
document.addEventListener('DOMContentLoaded', () => {

    const API_URL_BASE = 'https://api.aladhan.com/v1/';
    const locationSelector = document.getElementById('location-selector');

    // --- RAMAZON VAQTLARI (2026-yil) ---
    const RAMADAN_YEAR = 2026;
    const RAMADAN_START_DATE = new Date(2026, 1, 18); // Fevral 18
    const RAMADAN_END_DATE = new Date(2026, 2, 19);   // Mart 19

    // --- VILOYATLAR ---
    const UZBEK_CITIES = [
        { name: "Toshkent", value: "Tashkent" },
        { name: "Samarqand", value: "Samarkand" },
        { name: "Buxoro", value: "Bukhara" },
        { name: "Andijon", value: "Andijan" },
        { name: "Namangan", value: "Namangan" },
        { name: "Farg'ona", value: "Fergana" },
        { name: "Xiva", value: "Khiva" },
        { name: "Termiz", value: "Termez" },
        { name: "Qarshi", value: "Karshi" },
        { name: "Nukus", value: "Nukus" },
        { name: "Jizzax", value: "Jizzakh" },
        { name: "Urganch", value: "Urgench" }
    ];

    // --- STATIK ZAXIRA VAQTLAR ---
    const STATIC_PRAYER_TIMES = {
        Fajr: "06:04", Sunrise: "07:27", Dhuhr: "12:12", Asr: "15:14",
        Maghrib: "16:58", Isha: "18:19", Imsak: "05:45"
    };

    let lastNotifiedPrayer = '';
    let notificationPermission = Notification.permission;
    const audioAlert = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');

    // MODAL
    const modal = document.getElementById('subscription-modal');
    const mainContent = document.getElementById('main-content');
    const verifyButton = document.getElementById('verify-subscription');
    const telegramLink = document.querySelector('.btn-telegram');

    function checkSubscriptionStatus() {
        const lastVerifiedTime = localStorage.getItem('lastVerifiedTime');
        const now = Date.now();
        const VALID_DURATION = 86400000;

        if (lastVerifiedTime && (now - lastVerifiedTime < VALID_DURATION)) {
            return true;
        }
        localStorage.removeItem('lastVerifiedTime');
        localStorage.removeItem('hasClickedTelegram');
        return false;
    }

    let hasClickedTelegram = localStorage.getItem('hasClickedTelegram') === 'true';
    let isSubscribed = checkSubscriptionStatus();

    if (!isSubscribed) {
        modal.classList.remove('hidden');
        mainContent.classList.add('hidden');
        if (!hasClickedTelegram) {
            verifyButton.disabled = true;
            verifyButton.textContent = "2. Telegramga o'ting";
        }
    } else {
        modal.classList.add('hidden');
        mainContent.classList.remove('hidden');
        initMainFunctions();
    }

    telegramLink.addEventListener('click', () => {
        if (!hasClickedTelegram) {
            localStorage.setItem('hasClickedTelegram', 'true');
            hasClickedTelegram = true;

            verifyButton.textContent = "Iltimos 5 soniya kuting...";
            verifyButton.disabled = true;

            setTimeout(() => {
                verifyButton.disabled = false;
                verifyButton.textContent = "Obunani tasdiqlash";
            }, 5000);
        }
    });

    verifyButton.addEventListener('click', () => {
        if (verifyButton.disabled) return;

        if (hasClickedTelegram) {
            localStorage.setItem('lastVerifiedTime', Date.now());
            modal.classList.add('hidden');
            mainContent.classList.remove('hidden');
            initMainFunctions();
            requestNotificationPermission();
            alert("Muvaffaqiyatli! Saytdan foydalanishingiz mumkin.");
        }
    });

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission().then(p => {
                notificationPermission = p;
            });
        }
    }

    // ASOSIY FUNKSIYALAR
    function initMainFunctions() {
        populateSelectors();
        setupEventListeners();

        generateRamadanCalendar(RAMADAN_YEAR);
        fetchPrayerTimes();
        setInterval(updateCountdown, 1000);
    }

    function populateSelectors() {
        UZBEK_CITIES.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city.value;
            opt.textContent = city.name;
            if (city.value === "Samarkand") opt.selected = true;
            locationSelector.appendChild(opt);
        });

        const yearSelector = document.getElementById('year-selector');
        for (let y = 2025; y <= 2050; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === RAMADAN_YEAR) opt.selected = true;
            yearSelector.appendChild(opt);
        }
    }

    function setupEventListeners() {
        document.getElementById('year-selector').addEventListener('change', e => {
            generateRamadanCalendar(e.target.value);
        });

        locationSelector.addEventListener('change', () => {
            fetchPrayerTimes();
            generateRamadanCalendar(document.getElementById('year-selector').value);
        });
    }

    // RAMAZON TAQVIMI
    async function generateRamadanCalendar(year) {
        const body = document.querySelector('#ramadan-calendar tbody');
        body.innerHTML = '';

        if (parseInt(year) !== RAMADAN_YEAR) {
            body.innerHTML = `<tr><td colspan="5">Bu yil uchun ma'lumot yo'q</td></tr>`;
            return;
        }

        const start = new Date(RAMADAN_START_DATE);
        const end = new Date(RAMADAN_END_DATE);
        const days = Math.round((end - start) / (1000 * 3600 * 24)) + 1;
        const loc = locationSelector.value;

        for (let i = 0; i < days; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);

            const iso = date.toLocaleDateString("en-CA");

            const api =`${API_URL_BASE}timingsByCity?city=${loc}&country=Uzbekistan&method=1`;
;

            let iftor = STATIC_PRAYER_TIMES.Maghrib;
            let imsak = STATIC_PRAYER_TIMES.Imsak;

            try {
                const res = await fetch(api);
                const data = await res.json();

                if (data.code === 200) {
                    iftor = data.data.timings.Maghrib.substring(0, 5);
                    imsak = data.data.timings.Imsak.substring(0, 5);
                }
            } catch { }

            const row = body.insertRow();
            row.innerHTML = `
                <td>${i + 1}-kun</td>
                <td>${date.toLocaleDateString("uz-UZ", { month: "long", day: "numeric" })}</td>
                <td>${imsak}</td>
                <td>${iftor}</td>
                <td></td>
            `;
        }
    }

    // BUGUNGI NAMOZ VAQTLARI
    async function fetchPrayerTimes() {
        const loc = locationSelector.value;
        const name = locationSelector.options[locationSelector.selectedIndex].textContent;
        document.getElementById('current-city-name').textContent = `(${name})`;

        const date = new Date().toLocaleDateString("en-CA");
        const api = `${API_URL_BASE}timingsByCity?city=${loc}&country=Uzbekistan&method=1`;


        try {
            const res = await fetch(api);
            const data = await res.json();

            if (data.code === 200) {
                const t = data.data.timings;
                window.prayerTimings = {
                    Fajr: t.Fajr.substring(0, 5),
                    Sunrise: t.Sunrise.substring(0, 5),
                    Dhuhr: t.Dhuhr.substring(0, 5),
                    Asr: t.Asr.substring(0, 5),
                    Maghrib: t.Maghrib.substring(0, 5),
                    Isha: t.Isha.substring(0, 5),
                    Imsak: t.Imsak.substring(0, 5)
                };
                updatePrayerTimesUI(window.prayerTimings);
            }
        } catch {
            window.prayerTimings = STATIC_PRAYER_TIMES;
            updatePrayerTimesUI(STATIC_PRAYER_TIMES);
        }
    }

    function updatePrayerTimesUI(t) {
        document.querySelector('[data-time="Imsak"]').textContent = t.Imsak;
        document.querySelector('[data-time="Fajr"]').textContent = t.Fajr;
        document.querySelector('[data-time="Sunrise"]').textContent = t.Sunrise;
        document.querySelector('[data-time="Dhuhr"]').textContent = t.Dhuhr;
        document.querySelector('[data-time="Asr"]').textContent = t.Asr;
        document.querySelector('[data-time="Maghrib"]').textContent = t.Maghrib;
        document.querySelector('[data-time="Isha"]').textContent = t.Isha;
    }

    // VAQT SAXI
    function formatTime(ms) {
        const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
        const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
        const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function updateCountdown() {
        if (!window.prayerTimings) return;

        const now = new Date();
        const times = window.prayerTimings;
        const keys = ["Imsak", "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

        let nextTime = null;
        let nextName = null;

        for (let k of keys) {
            const [h, m] = times[k].split(":");
            const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

            const diff = t - now;

            if (diff > 0) {
                nextTime = t;
                nextName = k;
                break;
            }
        }

        if (!nextTime) {
            const [h, m] = times["Imsak"].split(":");
            nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m);
            nextName = "Imsak";
        }

        const dx = nextTime - now;
        document.getElementById('next-prayer-countdown').textContent = formatTime(dx);
    }

});

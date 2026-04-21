
document.addEventListener('DOMContentLoaded', () => {

    let tripsData = [];
    let bookings = JSON.parse(localStorage.getItem('sirocco_bookings')) || [];

    // --- Elements Selection ---
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.tab-content');
    const tripsTableBody = document.getElementById('tripsBody');
    const registrationForm = document.getElementById('registrationForm');
    const voyageSelect = document.getElementById('voyageSelect');
    const optionsContainer = document.getElementById('optionsContainer');
    const searchInput = document.getElementById('searchDest');
    const priceFilter = document.getElementById('filterPrice');
    const sortSelect = document.getElementById('sortBy');
    const receiptsBody = document.getElementById('receiptsBody');
    const themeBtn = document.getElementById('themeToggle');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    const checkDetails = document.getElementById('checkDetails');
    const summaryBox = document.getElementById('priceSummary');
    const summaryContent = document.getElementById('summaryContent');

    // --- Initialization ---
    init();

    async function init() {
        await loadTrips();
        renderTrips();
        renderReceipts();
        setupEventListeners();
        checkPreferredTheme();
    }

    // --- Data Loading ---
    async function loadTrips() {
        // Fallback data for local file protocol (CORS bypass)
        const fallbackData = [
            { "id": 1, "destination": "Paris, France", "date_depart": "2026-06-15", "prix": 1200, "places_disponibles": 15, "options": [{ "name": "Assurance voyage", "price": 50 }, { "name": "Visite guidée Louvre", "price": 80 }] },
            { "id": 2, "destination": "Tokyo, Japon", "date_depart": "2026-09-10", "prix": 2500, "places_disponibles": 10, "options": [{ "name": "Assurance voyage", "price": 70 }, { "name": "Pass Transport 7j", "price": 150 }] },
            { "id": 3, "destination": "Marrakech, Maroc", "date_depart": "2026-05-20", "prix": 800, "places_disponibles": 20, "options": [{ "name": "Assurance voyage", "price": 30 }, { "name": "Excursion Désert", "price": 90 }] },
            { "id": 4, "destination": "New York, USA", "date_depart": "2026-07-04", "prix": 1800, "places_disponibles": 12, "options": [{ "name": "Assurance voyage", "price": 60 }, { "name": "Pass City Explorer", "price": 110 }] },
            { "id": 5, "destination": "Rome, Italie", "date_depart": "2026-10-12", "prix": 950, "places_disponibles": 25, "options": [{ "name": "Assurance voyage", "price": 40 }, { "name": "Cours de cuisine", "price": 75 }] }
        ];

        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('CORS or file access error');
            tripsData = await response.json();
            console.log('Data loaded from JSON file.');
        } catch (error) {
            console.warn('Could not fetch data.json (likely local file CORS). using fallback data.', error);
            tripsData = fallbackData;
            showNotification('Mode hors-ligne : Données locales chargées.', 'success');
        } finally {
            populateVoyageSelect();
            renderTrips(); // Ensure table is rendered after data is set
        }
    }

    function populateVoyageSelect() {
        voyageSelect.innerHTML = '<option value="">-- Sélectionnez un voyage --</option>';
        tripsData.forEach(trip => {
            const option = document.createElement('option');
            option.value = trip.id;
            option.textContent = `${trip.destination} - ${trip.prix}€`;
            voyageSelect.appendChild(option);
        });
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.target;

                tabs.forEach(t => t.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(target).classList.add('active');
            });
        });

        // Search/Filter/Sort
        searchInput.addEventListener('input', renderTrips);
        priceFilter.addEventListener('input', renderTrips);
        sortSelect.addEventListener('change', renderTrips);

        // Form: Trip selection changes options
        voyageSelect.addEventListener('change', (e) => {
            const tripId = parseInt(e.target.value);
            renderOptions(tripId);
            calculateTotal(); // Refresh calculation if trip changes
        });


        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'check') {
                    checkDetails.style.display = 'block';
                    document.getElementById('checkNumber').required = true;
                } else {
                    checkDetails.style.display = 'none';
                    document.getElementById('checkNumber').required = false;
                }
            });
        });


        const checkNumInput = document.getElementById('checkNumber');
        checkNumInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });


        document.getElementById('btnCalculate').addEventListener('click', () => {
            if (validateRegistrationForm(false)) {
                calculateTotal();
                summaryBox.style.display = 'block';
                summaryBox.scrollIntoView({ behavior: 'smooth' });
            }
        });


        registrationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateRegistrationForm(true)) {
                submitRegistration();
            }
        });


        themeBtn.addEventListener('click', toggleTheme);


        document.getElementById('clearStorage').addEventListener('click', () => {
            if (confirm('Voulez-vous vraiment effacer tous les reçus ?')) {
                bookings = [];
                localStorage.removeItem('sirocco_bookings');
                renderReceipts();
                showNotification('Données effacées.', 'success');
            }
        });
    }


    function renderTrips() {
        const query = searchInput.value.toLowerCase();
        const maxPrice = parseFloat(priceFilter.value) || Infinity;
        const sortBy = sortSelect.value;

        let filtered = tripsData.filter(trip =>
            trip.destination.toLowerCase().includes(query) &&
            trip.prix <= maxPrice
        );


        filtered.sort((a, b) => {
            if (sortBy === 'price-asc') return a.prix - b.prix;
            if (sortBy === 'price-desc') return b.prix - a.prix;
            if (sortBy === 'date-asc') return new Date(a.date_depart) - new Date(b.date_depart);
            if (sortBy === 'date-desc') return new Date(b.date_depart) - new Date(a.date_depart);
            return 0;
        });

        tripsTableBody.innerHTML = filtered.map(trip => `
            <tr>
                <td><strong>${trip.destination}</strong></td>
                <td>${formatDate(trip.date_depart)}</td>
                <td>${trip.prix} €</td>
                <td>
                    <span class="badge ${trip.places_disponibles > 5 ? 'badge-success' : 'badge-danger'}">
                        ${trip.places_disponibles} places
                    </span>
                </td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="selectTripForRegistration(${trip.id})">
                        Réserver
                    </button>
                </td>
            </tr>
        `).join('');
    }


    function renderOptions(tripId) {
        const trip = tripsData.find(t => t.id === tripId);
        if (!trip) {
            optionsContainer.innerHTML = '<p class="text-muted" style="font-size: 0.85rem">Choisissez d\'abord un voyage</p>';
            return;
        }

        optionsContainer.innerHTML = trip.options.map((opt, idx) => `
            <label class="option-item">
                <input type="checkbox" name="tripOption" value="${opt.price}" data-name="${opt.name}">
                ${opt.name} (+${opt.price}€)
            </label>
        `).join('');


        document.querySelectorAll('input[name="tripOption"]').forEach(cb => {
            cb.addEventListener('change', calculateTotal);
        });
    }


    function calculateTotal() {
        const tripId = parseInt(voyageSelect.value);
        if (!tripId) return null;

        const trip = tripsData.find(t => t.id === tripId);
        const companions = parseInt(document.getElementById('companions').value) || 0;

        let optionsPrice = 0;
        let selectedOptionsNames = [];
        document.querySelectorAll('input[name="tripOption"]:checked').forEach(cb => {
            optionsPrice += parseFloat(cb.value);
            selectedOptionsNames.push(cb.dataset.name);
        });

        const total = (trip.prix * (1 + companions)) + optionsPrice;


        summaryContent.innerHTML = `
            <div class="summary-row"><span>Destination:</span> <strong>${trip.destination}</strong></div>
            <div class="summary-row"><span>Prix de base:</span> <span>${trip.prix}€</span></div>
            <div class="summary-row"><span>Voyageurs:</span> <span>1 + ${companions}</span></div>
            <div class="summary-row"><span>Options:</span> <span>${selectedOptionsNames.join(', ') || 'Aucune'} (+${optionsPrice}€)</span></div>
            <div class="summary-total">Total à payer: ${total} €</div>
        `;

        return { total, trip, companions, optionsPrice, selectedOptionsNames };
    }


    function validateRegistrationForm(isSubmit) {
        let isValid = true;
        const passport = document.getElementById('passport');
        const checkNum = document.getElementById('checkNumber');
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;


        document.querySelectorAll('.form-group').forEach(el => el.classList.remove('invalid'));


        ['nom', 'prenom', 'passport', 'voyageSelect'].forEach(id => {
            const input = document.getElementById(id);
            if (!input.value.trim()) {
                input.parentElement.classList.add('invalid');
                isValid = false;
            }
        });


        const passportRegex = /^[A-Z]{2}[0-9]{6}$/i;
        if (passport.value && !passportRegex.test(passport.value)) {
            passport.parentElement.classList.add('invalid');
            isValid = false;
        }


        if (paymentMethod === 'check') {
            if (!checkNum.value.trim() || checkNum.value.length < 5) {
                checkNum.parentElement.classList.add('invalid');
                isValid = false;
            }
        }

        return isValid;
    }


    function submitRegistration() {
        const calc = calculateTotal();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        const checkNumber = paymentMethod === 'check' ? document.getElementById('checkNumber').value : null;

        const booking = {
            id: Date.now(),
            client: {
                nom: document.getElementById('nom').value,
                prenom: document.getElementById('prenom').value,
                passport: document.getElementById('passport').value
            },
            trip: calc.trip.destination,
            total: calc.total,
            paymentMethod: paymentMethod === 'check' ? `Chèque (${checkNumber})` : 'Espèces',
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        };

        bookings.unshift(booking);
        localStorage.setItem('sirocco_bookings', JSON.stringify(bookings));


        registrationForm.reset();
        optionsContainer.innerHTML = '<p class="text-muted" style="font-size: 0.85rem">Choisissez d\'abord un voyage</p>';
        summaryBox.style.display = 'none';

        showNotification('Félicitations ! Votre voyage est réservé.', 'success');
        renderReceipts();


        setTimeout(() => {
            document.querySelector('[data-target="receipts-section"]').click();
        }, 1000);
    }


    function renderReceipts() {
        if (bookings.length === 0) {
            receiptsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">Aucune inscription pour le moment.</td></tr>';
            return;
        }

        receiptsBody.innerHTML = bookings.map(b => `
            <tr>
                <td><strong>${b.client.nom} ${b.client.prenom}</strong></td>
                <td>${b.trip}</td>
                <td><span class="badge ${b.paymentMethod.includes('Chèque') ? 'badge-primary' : ''}">${b.paymentMethod}</span></td>
                <td><strong>${b.total} €</strong></td>
                <td><span style="font-size: 0.8rem">${b.date}</span></td>
            </tr>
        `).join('');
    }



    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function showNotification(msg, type) {
        const notif = document.getElementById('notification');
        notif.textContent = msg;
        notif.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
        notif.style.display = 'block';

        setTimeout(() => {
            notif.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            notif.style.transform = 'translateY(100px)';
            setTimeout(() => { notif.style.display = 'none'; }, 300);
        }, 3000);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sirocco_theme', newTheme);
        updateThemeIcons(newTheme);
    }

    function checkPreferredTheme() {
        const savedTheme = localStorage.getItem('sirocco_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcons(savedTheme);
    }

    function updateThemeIcons(theme) {
        if (theme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }


    window.selectTripForRegistration = (id) => {
        voyageSelect.value = id;
        renderOptions(id);
        document.querySelector('[data-target="registration-section"]').click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
});

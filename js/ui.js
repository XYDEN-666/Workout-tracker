// js/ui.js

// --- CALENDAR ---
let currentDisplayDate = new Date(); // Local to ui.js for calendar state
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYearEl = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const workoutsForDateList = document.getElementById('workouts-for-date-list');
const displaySelectedDateEl = document.getElementById('display-selected-date');

function initializeCalendar() {
    console.log("ui.js: initializeCalendar called");
    if (!prevMonthBtn || !nextMonthBtn || !currentMonthYearEl || !calendarGrid) {
        console.error("Calendar DOM elements not found in initializeCalendar!");
        return;
    }
    prevMonthBtn.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        renderCalendar(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth(), window.allWorkoutsCache || []);
    });
    nextMonthBtn.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        renderCalendar(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth(), window.allWorkoutsCache || []);
    });
    renderCalendar(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth(), window.allWorkoutsCache || []);
}

function renderCalendar(year, month, workoutsToDisplay) { // workoutsToDisplay is window.allWorkoutsCache
    console.log("ui.js: renderCalendar called for", year, month, "with workouts:", workoutsToDisplay);
    if (!calendarGrid || !currentMonthYearEl) {
        console.error("calendarGrid or currentMonthYearEl not found in renderCalendar");
        return;
    }
    calendarGrid.innerHTML = '';
    currentMonthYearEl.textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;
    currentMonthYearEl.dataset.year = year;
    currentMonthYearEl.dataset.month = month;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('calendar-day', 'empty');
        calendarGrid.appendChild(emptyCell);
    }

    // Filter parent workouts for the current month
    const workoutDatesInMonth = (workoutsToDisplay || [])
        .filter(workout => {
            if (!workout.workout_date) return false;
            const d = new Date(workout.workout_date + "T00:00:00");
            return d.getFullYear() === year && d.getMonth() === month;
        })
        .map(workout => new Date(workout.workout_date + "T00:00:00").getDate());

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');
        dayCell.textContent = day;
        const cellDate = new Date(year, month, day);
        dayCell.dataset.date = cellDate.toISOString().split('T')[0];

        if (workoutDatesInMonth.includes(day)) {
            dayCell.classList.add('has-workout');
        }

        dayCell.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
            dayCell.classList.add('selected');
            displayWorkoutsForDate(dayCell.dataset.date); // Uses global cache
        });
        calendarGrid.appendChild(dayCell);
    }
}

function displayWorkoutsForDate(dateString) {
    console.log("ui.js: displayWorkoutsForDate for", dateString);
    if (!displaySelectedDateEl || !workoutsForDateList) {
        console.error("displaySelectedDateEl or workoutsForDateList not found.");
        return;
    }

    displaySelectedDateEl.textContent = new Date(dateString + 'T00:00:00').toLocaleDateString();
    workoutsForDateList.innerHTML = '';
    const workoutsOnDate = (window.allWorkoutsCache || []).filter(w => w.workout_date === dateString);

    if (workoutsOnDate.length === 0) {
        workoutsForDateList.innerHTML = '<li>No workouts logged for this date.</li>';
        return;
    }

    workoutsOnDate.forEach(workout => {
        const li = document.createElement('li');
        let setsSummary = "(No sets data)";
        if (workout.workout_sets && workout.workout_sets.length > 0) {
            setsSummary = workout.workout_sets
                .sort((a, b) => a.set_number - b.set_number) // Ensure sets are ordered
                .map(set => `${set.reps} reps @ ${set.weight}kg`)
                .join('; '); // Use semicolon for better readability of multiple sets
            li.textContent = `${workout.exercise_name}: ${workout.workout_sets.length} sets (${setsSummary})`;
        } else {
            li.textContent = `${workout.exercise_name}: ${setsSummary}`;
        }
        workoutsForDateList.appendChild(li);
    });
}

// --- DASHBOARD UPDATES ---
function updateDashboard() {
    const workouts = window.allWorkoutsCache || [];
    console.log("ui.js: updateDashboard called with parent workouts:", workouts);

    const summaryTotalWorkoutsEl = document.getElementById('summary-total-workouts');
    const summaryTotalSetsEl = document.getElementById('summary-total-sets');
    const prListEl = document.getElementById('pr-list');
    const comparisonDataEl = document.getElementById('comparison-data');

    if (!workouts || workouts.length === 0) {
        if (summaryTotalWorkoutsEl) summaryTotalWorkoutsEl.textContent = '0';
        if (summaryTotalSetsEl) summaryTotalSetsEl.textContent = '0';
        if (prListEl) prListEl.innerHTML = '<li>No PRs yet.</li>';
        if (comparisonDataEl) comparisonDataEl.textContent = 'N/A';
        if (typeof clearCharts === 'function') clearCharts();
        else console.error("clearCharts is not defined (expected in charts.js)");
        return;
    }

    updateWeeklySummary();
    updatePersonalRecords();
    if (typeof updateProgressionCharts === 'function') updateProgressionCharts();
    else console.error("updateProgressionCharts is not defined (expected in charts.js)");
    updateWeeklyComparison();
}

function updateWeeklySummary() {
    const workouts = window.allWorkoutsCache || [];
    console.log("ui.js: updateWeeklySummary with parent workouts:", workouts.length);
    const summaryTotalWorkoutsEl = document.getElementById('summary-total-workouts');
    const summaryTotalSetsEl = document.getElementById('summary-total-sets');

    if (!summaryTotalWorkoutsEl || !summaryTotalSetsEl) {
        console.error("Summary DOM elements not found in updateWeeklySummary.");
        return;
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const workoutsThisWeek = workouts.filter(w => {
        if (!w.workout_date) return false;
        const workoutDate = new Date(w.workout_date + 'T00:00:00');
        return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
    });

    summaryTotalWorkoutsEl.textContent = workoutsThisWeek.length;
    let totalSetsThisWeek = 0;
    workoutsThisWeek.forEach(w => {
        if (w.workout_sets && Array.isArray(w.workout_sets)) {
            totalSetsThisWeek += w.workout_sets.length;
        }
    });
    summaryTotalSetsEl.textContent = totalSetsThisWeek;
}

function updatePersonalRecords() {
    const workouts = window.allWorkoutsCache || [];
    console.log("ui.js: updatePersonalRecords with parent workouts:", workouts.length);
    const prList = document.getElementById('pr-list');
    if (!prList) {
        console.error("pr-list element not found.");
        return;
    }
    prList.innerHTML = '';

    if (workouts.length === 0) {
        prList.innerHTML = '<li>No workouts logged yet.</li>';
        return;
    }

    const prs = {}; // { exerciseName: {maxWeightSingleSet: 0, repsAtMax:0, date: ''} }

    workouts.forEach(workout => {
        if (workout.workout_sets && Array.isArray(workout.workout_sets) && workout.workout_sets.length > 0) {
            workout.workout_sets.forEach(set => {
                if (!workout.exercise_name) return; // Skip if exercise name is missing

                if (!prs[workout.exercise_name] || set.weight > prs[workout.exercise_name].maxWeightSingleSet) {
                    prs[workout.exercise_name] = {
                        maxWeightSingleSet: set.weight,
                        repsAtMax: set.reps,
                        date: workout.workout_date
                    };
                } else if (set.weight === prs[workout.exercise_name].maxWeightSingleSet && set.reps > prs[workout.exercise_name].repsAtMax) {
                    // If weight is the same, update if reps are higher
                    prs[workout.exercise_name].repsAtMax = set.reps;
                    prs[workout.exercise_name].date = workout.workout_date; // Update date to the newer PR
                }
            });
        }
    });

    if (Object.keys(prs).length === 0) {
        prList.innerHTML = '<li>No PRs yet.</li>';
        return;
    }
    for (const exercise in prs) {
        const li = document.createElement('li');
        li.textContent = `${exercise}: ${prs[exercise].maxWeightSingleSet} kg/lbs for ${prs[exercise].repsAtMax} reps (Set PR on ${new Date(prs[exercise].date + 'T00:00:00').toLocaleDateString()})`;
        prList.appendChild(li);
    }
}

function populateExerciseSelect() {
    const workouts = window.allWorkoutsCache || [];
    console.log("ui.js: populateExerciseSelect with parent workouts:", workouts.length);
    const exerciseSelect = document.getElementById('exercise-select-for-chart');
    if (!exerciseSelect) {
        console.error("exercise-select-for-chart not found.");
        return;
    }

    const currentExerciseValue = exerciseSelect.value;
    while (exerciseSelect.options.length > 1) {
        exerciseSelect.remove(1);
    }

    const uniqueExercises = [...new Set(workouts.map(w => w.exercise_name).filter(name => name))]; // Filter out undefined/null names
    uniqueExercises.sort(); // Sort alphabetically
    uniqueExercises.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex;
        option.textContent = ex;
        exerciseSelect.appendChild(option);
    });
    // Try to restore selection if it's still a valid option
    if (uniqueExercises.includes(currentExerciseValue)) {
        exerciseSelect.value = currentExerciseValue;
    } else if (uniqueExercises.length > 0) {
        // exerciseSelect.value = ""; // Or select the first exercise if preferred
    } else {
        exerciseSelect.value = ""; // No exercises, back to placeholder
    }
}

function updateWeeklyComparison() {
    const workouts = window.allWorkoutsCache || []; // Each item is a parent workout with a workout_sets array
    console.log("ui.js: updateWeeklyComparison with parent workouts:", workouts.length);
    const comparisonDataEl = document.getElementById('comparison-data');
    if(!comparisonDataEl) {
        console.error("comparison-data element not found.");
        return;
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
    endOfLastWeek.setHours(23,59,59,999);

    const calculateTotalVolume = (filteredWorkouts) => {
        let totalVolume = 0;
        filteredWorkouts.forEach(workout => {
            if (workout.workout_sets && Array.isArray(workout.workout_sets)) {
                workout.workout_sets.forEach(set => {
                    totalVolume += (set.reps || 0) * (set.weight || 0);
                });
            }
        });
        return totalVolume;
    };

    const workoutsThisWeekFiltered = workouts.filter(w => {
        if (!w.workout_date) return false;
        const d = new Date(w.workout_date + 'T00:00:00');
        return d >= startOfWeek && d <= endOfWeek;
    });
    const volumeThisWeek = calculateTotalVolume(workoutsThisWeekFiltered);

    const workoutsLastWeekFiltered = workouts.filter(w => {
        if (!w.workout_date) return false;
        const d = new Date(w.workout_date + 'T00:00:00');
        return d >= startOfLastWeek && d <= endOfLastWeek;
    });
    const volumeLastWeek = calculateTotalVolume(workoutsLastWeekFiltered);

    if (volumeLastWeek > 0) {
        const change = ((volumeThisWeek - volumeLastWeek) / volumeLastWeek) * 100;
        comparisonDataEl.textContent = `Volume: ${volumeThisWeek.toFixed(0)} vs ${volumeLastWeek.toFixed(0)} last week (${change >= 0 ? '+' : ''}${change.toFixed(1)}%)`;
        comparisonDataEl.style.color = change >= 0 ? 'lightgreen' : 'lightcoral';
    } else if (volumeThisWeek > 0) {
        comparisonDataEl.textContent = `Volume: ${volumeThisWeek.toFixed(0)} (no data for last week)`;
        comparisonDataEl.style.color = 'inherit';
    } else {
        comparisonDataEl.textContent = 'N/A (no volume data for current or last week)';
        comparisonDataEl.style.color = 'inherit';
    }
}
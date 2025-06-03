// js/charts.js
let weightChartInstance = null;
let repsChartInstance = null;

const chartColors = {
    red: 'rgb(204, 0, 0)',
    yellow: 'rgb(255, 215, 0)',
    darkGrey: 'rgb(44, 44, 44)',
    lightGrey: 'rgb(176, 176, 176)'
};

function initializeChartListeners() {
    console.log("charts.js: initializeChartListeners called");
    const exerciseSelect = document.getElementById('exercise-select-for-chart');
    if (exerciseSelect) {
        exerciseSelect.addEventListener('change', () => {
            console.log("charts.js: Exercise selection changed, calling updateProgressionCharts.");
            updateProgressionCharts(); // Will use global cache
        });
    } else {
        console.error("charts.js: FATAL - exercise-select-for-chart not found in initializeChartListeners!");
    }
}
// This function is called from app.js's DOMContentLoaded

function updateProgressionCharts() {
    const allParentWorkouts = window.allWorkoutsCache || [];
    console.log("charts.js: updateProgressionCharts called. All parent workouts:", JSON.parse(JSON.stringify(allParentWorkouts)));

    const selectedExercise = document.getElementById('exercise-select-for-chart').value;
    console.log("charts.js: Selected exercise for chart:", selectedExercise);

    const weightCanvas = document.getElementById('weight-progression-chart');
    const repsCanvas = document.getElementById('reps-progression-chart');

    if (!weightCanvas) {
        console.error("charts.js: FATAL - weight-progression-chart canvas element NOT FOUND!");
        if (typeof clearCharts === 'function') clearCharts();
        return;
    }
    if (!repsCanvas) {
        console.error("charts.js: FATAL - reps-progression-chart canvas element NOT FOUND!");
        if (typeof clearCharts === 'function') clearCharts();
        return;
    }
    console.log("charts.js: Weight canvas element found:", weightCanvas, "OffsetWidth:", weightCanvas.offsetWidth, "OffsetHeight:", weightCanvas.offsetHeight);
    console.log("charts.js: Reps canvas element found:", repsCanvas, "OffsetWidth:", repsCanvas.offsetWidth, "OffsetHeight:", repsCanvas.offsetHeight);


    if (!selectedExercise) {
        console.log("charts.js: No exercise selected, clearing charts.");
        if (typeof clearCharts === 'function') clearCharts();
        return;
    }

    const relevantParentWorkouts = allParentWorkouts
        .filter(workout => workout.exercise_name === selectedExercise && workout.workout_date)
        .sort((a, b) => new Date(a.workout_date + "T00:00:00") - new Date(b.workout_date + "T00:00:00"));

    console.log("charts.js: Relevant parent workouts for chart:", JSON.parse(JSON.stringify(relevantParentWorkouts)));

    if (relevantParentWorkouts.length === 0) {
        console.log("charts.js: No data for selected exercise after filtering, clearing charts.");
        if (typeof clearCharts === 'function') clearCharts();
        return;
    }

    const chartDataPoints = relevantParentWorkouts.map(workout => {
        let maxWeightThisDay = 0;
        let repsAtMaxWeight = 0;

        if (workout.workout_sets && Array.isArray(workout.workout_sets) && workout.workout_sets.length > 0) {
            workout.workout_sets.forEach(set => {
                const currentWeight = Number(set.weight) || 0;
                const currentReps = Number(set.reps) || 0;

                if (currentWeight > maxWeightThisDay) {
                    maxWeightThisDay = currentWeight;
                    repsAtMaxWeight = currentReps;
                } else if (currentWeight === maxWeightThisDay && currentReps > repsAtMaxWeight) {
                    repsAtMaxWeight = currentReps;
                }
            });
        }
        return {
            date: new Date(workout.workout_date + "T00:00:00").toLocaleDateString(),
            maxWeight: maxWeightThisDay,
            repsAtMaxWeight: repsAtMaxWeight,
        };
    }).filter(dp => dp.date);

    console.log("charts.js: Processed chartDataPoints for charts:", JSON.parse(JSON.stringify(chartDataPoints)));

    if (chartDataPoints.length === 0) {
        console.log("charts.js: No valid chart data points after processing, clearing charts.");
        if (typeof clearCharts === 'function') clearCharts();
        return;
    }

    const labels = chartDataPoints.map(dp => dp.date);
    const weightData = chartDataPoints.map(dp => dp.maxWeight);
    const repsDataForChart = chartDataPoints.map(dp => dp.repsAtMaxWeight);

    console.log("charts.js: Final labels for chart:", JSON.stringify(labels));
    console.log("charts.js: Final weightData for chart:", JSON.stringify(weightData));
    console.log("charts.js: Final repsDataForChart for chart:", JSON.stringify(repsDataForChart));


    const weightCtx = weightCanvas.getContext('2d');
    const repsCtx = repsCanvas.getContext('2d');

    console.log("charts.js: weightCtx object:", weightCtx);
    console.log("charts.js: repsCtx object:", repsCtx);

    if (!weightCtx) console.error("charts.js: FATAL - Failed to get 2D context for weight-progression-chart!");
    if (!repsCtx) console.error("charts.js: FATAL - Failed to get 2D context for reps-progression-chart!");

    if (weightChartInstance) {
        console.log("charts.js: Destroying existing weightChartInstance.");
        weightChartInstance.destroy();
        weightChartInstance = null;
    }
    if (repsChartInstance) {
        console.log("charts.js: Destroying existing repsChartInstance.");
        repsChartInstance.destroy();
        repsChartInstance = null;
    }

    if (weightCtx) {
        console.log("charts.js: Attempting to create Weight Progression Chart.");
        console.log("charts.js: DATA FOR WEIGHT CHART - Labels:", JSON.stringify(labels), "Data:", JSON.stringify(weightData));
        try {
            weightChartInstance = new Chart(weightCtx, {
                type: 'line',
                data: {
                    labels: labels,
                   datasets: [{
                        label: `Max Weight Progression for ${selectedExercise} (kg/lbs)`,
                        data: weightData,
                        borderColor: 'lime', // TEMPORARY: Extremely visible color
                        borderWidth: 5,      // TEMPORARY: Very thick line
                        backgroundColor: 'rgba(0, 255, 0, 0.3)', // TEMPORARY
                        tension: 0.1,
                        fill: true,
                        pointBackgroundColor: 'magenta', // TEMPORARY: Obvious point color
                        pointBorderColor: 'magenta',   // TEMPORARY
                        pointRadius: 10             // TEMPORARY: Large points
}]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: false, ticks: { color: chartColors.lightGrey }, grid: { color: chartColors.darkGrey } },
                        x: { ticks: { color: chartColors.lightGrey }, grid: { color: chartColors.darkGrey } }
                    },
                    plugins: { legend: { labels: { color: chartColors.lightGrey } } }
                }
            });
            console.log("charts.js: Weight Progression Chart CREATED.", weightChartInstance);
        } catch (e) {
            console.error("charts.js: ERROR creating weight chart:", e, e.stack);
        }
    } else {
        console.warn("charts.js: Skipping weight chart creation due to invalid context.");
    }

    if (repsCtx) {
        console.log("charts.js: Attempting to create Reps Progression Chart.");
        console.log("charts.js: DATA FOR REPS CHART - Labels:", JSON.stringify(labels), "Data:", JSON.stringify(repsDataForChart));
        try {
            repsChartInstance = new Chart(repsCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Reps (at Max Weight) for ${selectedExercise}`,
                        data: repsDataForChart,
                        backgroundColor: chartColors.yellow, borderColor: chartColors.red, borderWidth: 1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { color: chartColors.lightGrey }, grid: { color: chartColors.darkGrey } },
                        x: { ticks: { color: chartColors.lightGrey }, grid: { color: chartColors.darkGrey } }
                    },
                    plugins: { legend: { labels: { color: chartColors.lightGrey } } }
                }
            });
            console.log("charts.js: Reps Progression Chart CREATED.", repsChartInstance);
        } catch (e) {
            console.error("charts.js: ERROR creating reps chart:", e, e.stack);
        }
    } else {
        console.warn("charts.js: Skipping reps chart creation due to invalid context.");
    }
}

function clearCharts() {
    console.log("charts.js: clearCharts called");
    if (weightChartInstance) {
        console.log("charts.js: Destroying weightChartInstance in clearCharts.");
        weightChartInstance.destroy();
        weightChartInstance = null;
    }
    if (repsChartInstance) {
        console.log("charts.js: Destroying repsChartInstance in clearCharts.");
        repsChartInstance.destroy();
        repsChartInstance = null;
    }

    const weightCanvas = document.getElementById('weight-progression-chart');
    const repsCanvas = document.getElementById('reps-progression-chart');

    if (weightCanvas) {
        const weightCtx = weightCanvas.getContext('2d');
        if (weightCtx && weightCtx.canvas) {
            console.log("charts.js: Clearing weight canvas content.");
            weightCtx.clearRect(0, 0, weightCtx.canvas.width, weightCtx.canvas.height);
        }
    } else {
        console.warn("charts.js: weight-progression-chart canvas not found in clearCharts.");
    }

    if (repsCanvas) {
        const repsCtx = repsCanvas.getContext('2d');
        if (repsCtx && repsCtx.canvas) {
            console.log("charts.js: Clearing reps canvas content.");
            repsCtx.clearRect(0, 0, repsCtx.canvas.width, repsCtx.canvas.height);
        }
    } else {
        console.warn("charts.js: reps-progression-chart canvas not found in clearCharts.");
    }
}
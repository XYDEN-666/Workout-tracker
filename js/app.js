// js/app.js

// Global variables for app.js scope
let logWorkoutForm;
let workoutDateInput;

// Global cache for workout data (will need to be structured differently now)
window.allWorkoutsCache = []; // This will store an array of workout objects,
                            // where each workout object will have a 'sets_data' array property.

function setupDynamicSetInputs() {
    const numOfSetsInput = document.getElementById('num-of-sets');
    const setsContainer = document.getElementById('sets-container');

    if (numOfSetsInput && setsContainer) {
        numOfSetsInput.addEventListener('input', () => {
            setsContainer.innerHTML = ''; // Clear previous set inputs
            const numSets = parseInt(numOfSetsInput.value);

            if (isNaN(numSets) || numSets < 1 || numSets > 20) { // Limit max sets
                return;
            }

            for (let i = 1; i <= numSets; i++) {
                const setGroupDiv = document.createElement('div');
                setGroupDiv.classList.add('set-input-group');
                setGroupDiv.dataset.setNumber = i; // Store set number

                const setTitle = document.createElement('h4');
                setTitle.textContent = `Set ${i}`;
                setGroupDiv.appendChild(setTitle);

                // Reps input for this set
                const repsFieldDiv = document.createElement('div');
                repsFieldDiv.classList.add('set-field');
                const repsLabel = document.createElement('label');
                repsLabel.setAttribute('for', `reps-set-${i}`);
                repsLabel.textContent = `Reps:`;
                const repsInput = document.createElement('input');
                repsInput.setAttribute('type', 'number');
                repsInput.setAttribute('id', `reps-set-${i}`);
                repsInput.setAttribute('min', '0');
                repsInput.setAttribute('required', 'true');
                repsInput.classList.add('set-reps-input'); // For easier selection
                repsFieldDiv.appendChild(repsLabel);
                repsFieldDiv.appendChild(repsInput);
                setGroupDiv.appendChild(repsFieldDiv);

                // Weight input for this set
                const weightFieldDiv = document.createElement('div');
                weightFieldDiv.classList.add('set-field');
                const weightLabel = document.createElement('label');
                weightLabel.setAttribute('for', `weight-set-${i}`);
                weightLabel.textContent = `Weight:`;
                const weightInput = document.createElement('input');
                weightInput.setAttribute('type', 'number');
                weightInput.setAttribute('id', `weight-set-${i}`);
                weightInput.setAttribute('min', '0');
                weightInput.setAttribute('step', '0.1');
                weightInput.setAttribute('required', 'true');
                weightInput.classList.add('set-weight-input'); // For easier selection
                weightFieldDiv.appendChild(weightLabel);
                weightFieldDiv.appendChild(weightInput);
                setGroupDiv.appendChild(weightFieldDiv);

                setsContainer.appendChild(setGroupDiv);
            }
        });
    } else {
        console.error("Could not find 'num-of-sets' input or 'sets-container'.");
    }
}


async function handleLogWorkout(event) {
    event.preventDefault();

    const workoutMasterData = {
        workout_date: document.getElementById('workout-date').value,
        exercise_name: document.getElementById('exercise-name').value.trim(),
    };

    if (!workoutMasterData.exercise_name || !workoutMasterData.workout_date) {
        alert('Please fill in exercise name and date.');
        return;
    }

    const numSets = parseInt(document.getElementById('num-of-sets').value);
    if (isNaN(numSets) || numSets < 1) {
        alert('Please enter a valid number of sets.');
        return;
    }

    const setsDataToInsert = [];
    let allSetsValid = true;

    for (let i = 1; i <= numSets; i++) {
        const repsInput = document.getElementById(`reps-set-${i}`);
        const weightInput = document.getElementById(`weight-set-${i}`);

        if (repsInput && weightInput) {
            const reps = parseInt(repsInput.value);
            const weight = parseFloat(weightInput.value);

            if (isNaN(reps) || reps < 0 || isNaN(weight) || weight < 0) {
                allSetsValid = false;
                break;
            }
            setsDataToInsert.push({ set_number: i, reps: reps, weight: weight });
        } else {
            allSetsValid = false; // Should not happen
            break;
        }
    }

    if (!allSetsValid || setsDataToInsert.length !== numSets) {
        alert('Please enter valid reps and weight for all sets.');
        return;
    }

    try {
        // 1. Insert into `workouts` table
        const { data: workoutEntry, error: workoutError } = await sbClient
            .from('workouts')
            .insert([workoutMasterData])
            .select() // Important to get the ID of the inserted workout
            .single(); // Expecting a single row back

        if (workoutError) {
            console.error("Supabase workout insert error:", workoutError);
            throw workoutError;
        }

        if (!workoutEntry || !workoutEntry.id) {
            throw new Error("Failed to create workout entry or get its ID.");
        }

        console.log('Workout entry created:', workoutEntry);
        const newWorkoutId = workoutEntry.id;

        // 2. Prepare set data with the new workout_id
        const setsWithWorkoutId = setsDataToInsert.map(set => ({
            ...set,
            workout_id: newWorkoutId
        }));

        // 3. Insert into `workout_sets` table
        const { data: insertedSets, error: setsError } = await sbClient
            .from('workout_sets')
            .insert(setsWithWorkoutId)
            .select();

        if (setsError) {
            console.error("Supabase workout_sets insert error:", setsError);
            // Potentially try to delete the parent workout if sets fail (rollback logic)
            // For now, just throw
            await sbClient.from('workouts').delete().match({ id: newWorkoutId }); // Attempt to cleanup
            throw setsError;
        }

        console.log('Workout sets logged:', insertedSets);
        alert('Workout and all sets logged successfully!');

        if (logWorkoutForm) {
            logWorkoutForm.reset();
            const setsContainer = document.getElementById('sets-container');
            if (setsContainer) setsContainer.innerHTML = ''; // Clear dynamic fields
        }
        if (workoutDateInput) {
            workoutDateInput.valueAsDate = new Date();
        }

        await fetchAllWorkoutsAndUpdate();

    } catch (error) {
        console.error('Error logging workout:', error.message);
        alert(`Error: ${error.message}`);
    }
}

// IMPORTANT: `fetchAllWorkouts` needs to be completely rewritten
async function fetchAllWorkouts() {
    console.log("app.js: fetchAllWorkouts (new relational version) called");
    if (!sbClient) {
        console.error("sbClient is not defined in fetchAllWorkouts!");
        return [];
    }
    try {
        // 1. Fetch all main workout entries
        const { data: mainWorkouts, error: mainError } = await sbClient
            .from('workouts')
            .select(`
                id,
                workout_date,
                exercise_name,
                workout_sets (
                    set_number,
                    reps,
                    weight
                )
            `) // This uses Supabase's ability to fetch related data
            .order('workout_date', { ascending: false });

        if (mainError) {
            console.error('Error fetching main workouts:', mainError);
            throw mainError;
        }

        if (!mainWorkouts) return [];

        // The data will come back with workout_sets nested.
        // Supabase might return `workout_sets` as `null` if no sets exist, ensure it's an array.
        const processedWorkouts = mainWorkouts.map(workout => ({
            ...workout,
            workout_sets: workout.workout_sets || [] // Ensure workout_sets is always an array
        }));


        console.log("app.js: Combined workouts with sets fetched:", processedWorkouts);
        return processedWorkouts;

    } catch (err) {
        console.error("Exception in fetchAllWorkouts (new):", err);
        return [];
    }
}


// fetchAllWorkoutsAndUpdate and loadInitialData can remain largely the same
// as they rely on the structure returned by fetchAllWorkouts.
 async function fetchAllWorkoutsAndUpdate() {
     console.log("app.js: fetchAllWorkoutsAndUpdate called");
     try {
         window.allWorkoutsCache = await fetchAllWorkouts(); // Calls the NEW fetchAllWorkouts
         console.log("app.js: Fetched workouts for cache in fetchAllWorkoutsAndUpdate:", window.allWorkoutsCache);

         if (typeof populateExerciseSelect === 'function') {
             populateExerciseSelect(); // ui.js will use window.allWorkoutsCache
         } else {
             console.error("populateExerciseSelect is not defined (expected in ui.js)");
         }

         if (typeof updateDashboard === 'function') {
             updateDashboard(); // ui.js will use window.allWorkoutsCache
         } else {
             console.error("updateDashboard is not defined (expected in ui.js)");
         }
         
         const currentMonthYearData = document.getElementById('current-month-year');
         if (currentMonthYearData && currentMonthYearData.dataset.year && currentMonthYearData.dataset.month) {
             const year = parseInt(currentMonthYearData.dataset.year);
             const month = parseInt(currentMonthYearData.dataset.month);
             if (typeof renderCalendar === 'function') {
                 renderCalendar(year, month, window.allWorkoutsCache);
             } else {
                 console.error("renderCalendar is not defined (expected in ui.js)");
             }
         } else {
             const today = new Date();
             if (typeof renderCalendar === 'function') {
                 renderCalendar(today.getFullYear(), today.getMonth(), window.allWorkoutsCache);
             } else {
                 console.error("renderCalendar is not defined for fallback (expected in ui.js)");
             }
         }
     } catch (error) {
         console.error("Error in fetchAllWorkoutsAndUpdate:", error);
     }
 }

 async function loadInitialData() {
     console.log("app.js: loadInitialData called");
     await fetchAllWorkoutsAndUpdate();
 }

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("app.js: DOMContentLoaded event fired.");

    logWorkoutForm = document.getElementById('log-workout-form');
    workoutDateInput = document.getElementById('workout-date');

    if (workoutDateInput) {
        workoutDateInput.valueAsDate = new Date();
    }
    if (logWorkoutForm) {
        logWorkoutForm.addEventListener('submit', handleLogWorkout);
    }

    setupDynamicSetInputs(); // Initialize dynamic inputs for sets

    if (typeof initializeCalendar === 'function') initializeCalendar();
    if (typeof initializeChartListeners === 'function') initializeChartListeners();
    
    loadInitialData();
});
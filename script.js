'use strict';

const sidebarEl = document.querySelector('.sidebar');
const resetEl = document.querySelector('.reset');
const resetOverlayEl = document.querySelector('.reset__overlay');
const proceedReset = document.querySelector('.proceed__reset');
const declineReset = document.querySelector('.decline__reset');
const resetPrompt = document.querySelector('.reset--prompt');
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const editInputDistance = document.querySelector('.edit-form__input--distance');
const editInputDuration = document.querySelector('.edit-form__input--duration');
const editInputCadence = document.querySelector('.edit-form__input--cadence');
const editInputElevation = document.querySelector(
  '.edit-form__input--elevation'
);
// Choice OverLay /////////
const choiceModalEl = document.querySelector('.choice-modal-overlay');
const cancelChoiceBtnEl = document.querySelector('.cancel--btn');
const deleteBtnEl = document.querySelector('.delete--btn');
const editBtnEl = document.querySelector('.edit--btn');

const editFormEl = document.querySelector('.edit__form');
const closeModalBtn = document.querySelector('.close-modal');
const overlayEl = document.querySelector('.overlay');
const moreOptionsEl = document.querySelector('.more__options');
let deletePromptContainerEl;

// CLASSES
class Workout {
  _date = new Date();
  _id = (Date.now() + '').slice(-10);
  marker;
  constructor(coords, distance, duration) {
    this.coords = coords; // [latitude, longitude]
    this.distance = distance; // km
    this.duration = duration; // minutes
  }

  // INSTANCE METHOD
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const activity = this.type[0].toUpperCase() + this.type.slice(1);
    const month = this._date.getMonth();
    const day = this._date.getDate();

    this.description = `${activity} on ${months[month]} ${day}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // Method
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([12, 20], 5.2, 24, 178);
// const cyc1 = new Cycling([10, -20], 27, 95, 523);
// console.log(run1, cyc1);

//////////////////////////////////////////////
//APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #coords = [];
  #mapZoomLevel = 13;
  #workouts = [];
  #workoutEl;
  #workoutElm;
  #curWorkoutEdit;

  constructor() {
    // Triggering the geolocation API (Getting user's location)
    this._getPosition();

    // Getting data from local storage
    this._getLocalStorage();

    // Event handler for switching inputfield based on input type
    inputType.addEventListener('change', this._toggleInputFields);

    // Handling form submit event
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Handling click events for each workout on the workout list
    containerWorkouts.addEventListener(
      'click',
      this._consolidateClickListener.bind(this)
    );

    // Handling edit form submit event
    editFormEl.addEventListener('submit', this._submitEditForm.bind(this));

    // Closing edit form at the press down of escape key
    containerWorkouts.addEventListener(
      'keydown',
      this._closeModalOnEsc.bind(this)
    );

    sidebarEl.addEventListener(
      'click',
      this._consolidateResetClicks.bind(this)
    );
  }

  // ////////App instances//////////

  // Instance method for getting Position via geolocation API
  _getPosition() {
    // Checking browser compatibility with geolocation API
    if (navigator.geolocation)
      // Getting current location via geolocation API
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
  }

  // Instance method for Loading Map
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    console.log(`https://www.google.com/maps/@8.${latitude},${longitude}`);

    // initializing coords
    this.#coords.push(latitude, longitude);
    this.#map = L.map('map').setView(this.#coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // listening & handling click event on map via leaflet event handler
    this.#map.on('click', this._displayForm.bind(this));

    // Rendering workout on the map
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  // instance method for displaying & rendering workout form
  _displayForm(mapE) {
    this.#mapEvent = mapE;

    form.classList.remove('hidden');

    // setting focus for a better user experience
    inputDistance.focus();
  }

  // Instance method for toggling input fields based on input
  _toggleInputFields() {
    // Toggling the input field classes
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); // toggling hidden class off (vice-versa)

    inputCadence.closest('.form__row').classList.toggle('form__row--hidden'); // toggling hidden class on (vice-versa)
  }

  // Helper function for validating user inputs
  _isValidInputs = (...inputs) => inputs.every(input => Number.isFinite(input));

  _isPositiveNumb = (...numbs) => numbs.every(numb => numb > 0);

  // Instance method for submitting form
  _newWorkout(e) {
    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    // Preventing default page reload
    e.preventDefault();

    // converting input fields value to number
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // If workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //  checking if data (user input) is valid
      if (
        !this._isValidInputs(distance, duration, cadence) ||
        !this._isPositiveNumb(distance, duration, cadence)
      )
        return alert('Input have to be positive numbers!');

      // Creating object based on workout type
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;

      if (
        !this._isValidInputs(distance, duration, elevationGain) ||
        !this._isPositiveNumb(distance, duration)
      )
        return alert(`Inputs have to be positive numbers`);

      // Creating object based on workout type
      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as a marker based on geolocation of the point clicked on the map
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkoutList(workout);

    // Hide form & clear input fields
    this._hideForm();

    // Set Local Storage to All Workouts
    this._setLocalStorage();
  }

  _hideForm = function () {
    // Clearing input fields after submit event
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    // Adding the hidden class to form
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  };

  _renderWorkoutMarker(workout) {
    // rendering workout data from storage
    workout.marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    // Helper function for ternary selection
    const ternarySelector = (run, cyc) =>
      workout.type === 'running' ? run : cyc;

    const html = `<li class="workout workout--${workout.type}" data-type="${
      workout.type
    }" data-id="${workout._id}">
  <h2 class="workout__title">${workout.description}</h2>
  <div class="workout__details">
    <span class="workout__icon">${ternarySelector('🏃‍♂️', '🚴‍♀️')}</span>
    <span class="workout__value">${workout.distance}</span>
    <span class="workout__unit">km</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⏱</span>
    <span class="workout__value">${workout.duration}</span>
    <span class="workout__unit">min</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${
      workout.type === 'running'
        ? workout.pace.toFixed(1)
        : workout.speed.toFixed(1)
    }</span>
    <span class="workout__unit">${ternarySelector('min/km', 'km/h')}</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">${ternarySelector('🦶🏼', '⛰')}</span>
    <span class="workout__value">
      ${ternarySelector(workout.cadence, workout.elevationGain)}
    </span>
    <span class="workout__unit">${ternarySelector('spm', 'm')}</span>
  </div>
    <div class="more__options">&hellip;</div>
  <div class="delete-prompt-container hide">
    <p class="delete__prompt">
        Are you sure you want to delete workout?
    </p>
      <button class="yes__delete" type="button">Yes</button>
      <button class="no__cancel" type="button">No</button>
    </div>     
</li>
`;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMapMarker(event) {
    // Initializing event originator
    this.#workoutEl = event.target.closest('.workout');

    // Guard clause
    if (!this.#workoutEl) return;

    // Finding click workout in the workouts array via it id
    const workout = this.#workouts.find(
      workout => workout._id === this.#workoutEl.dataset.id
    );

    // Moving map to the map popup via leaflet setView method
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  // Method for storing workouts in localStorage API
  _setLocalStorage() {
    // Exclude marker from #workouts before saving to localStorage
    const workoutsData = this.#workouts.map(workout => {
      const { marker, ...data } = workout;
      return data;
    });

    // Storing #workouts on localStorage
    localStorage.setItem('workouts', JSON.stringify(workoutsData));
  }

  // Method for accessing the workout data saved in localStorage
  _getLocalStorage() {
    const normalizeWorkout = workout => {
      return {
        ...workout,
        distance: +workout.distance || 0,
        duration: +workout.duration || 0,
        cadence: +workout.cadence || 0,
        elevationGain: +workout.elevationGain | 0,
        pace: +workout.pace || 0,
        speed: +workout.speed || 0,
      };
    };
    const data = JSON.parse(localStorage.getItem('workouts'));

    // Guard clause
    if (!data) return;

    const workoutData = data.map(d => normalizeWorkout(d));

    // Restoring all data after every reload
    this.#workouts = workoutData;

    // Rendering workout on the list
    this.#workouts.forEach(workout => {
      this._renderWorkoutList(workout);
    });
  }

  reset() {
    // Erasing data from local storage via it key
    localStorage.removeItem('workouts');

    // Programatically reloading page
    location.reload();
  }

  // Method for handling reset click
  _resetSwitch(e) {
    // Initializing event originator
    const reset = e.target.closest('.reset');

    // Guard clause
    if (!reset) return;

    // removing the reset button
    this._addClass(resetEl, 'hide');

    // Display reset overlay
    this._removeClass(resetOverlayEl, 'hide');

    // Display the reset prompt (warning), proceed and return button
    this._removeClass(resetPrompt, 'hide');
    this._removeClass(proceedReset, 'hide');
    this._removeClass(declineReset, 'hide');
  }

  // Method for handling the click of the return button
  _abortReset(e) {
    // Initializing the event originator
    const returnBtn = e.target.closest('.decline__reset');

    // Guard clause
    if (!returnBtn) return;

    // Display reset button
    this._removeClass(resetEl, 'hide');

    // Remove reset overlay
    this._addClass(resetOverlayEl, 'hide');

    // Remove the reset prompt, proceed and return button
    this._addClass(resetPrompt, 'hide');
    this._addClass(proceedReset, 'hide');
    this._addClass(declineReset, 'hide');
  }

  // Method for handling the click of proceed button
  _initiateReset(e) {
    // Initializing the event source
    const proceedBtn = e.target.closest('.proceed__reset');

    // Guard clause
    if (!proceedBtn) return;

    // clear the entire #workouts array and reload app
    this.reset();
  }

  _consolidateResetClicks(e) {
    if (e.target.closest('.reset')) {
      this._resetSwitch(e);
      return;
    }

    // if e.target === .decline__reset ->call __abortReset
    if (e.target.closest('.decline__reset')) {
      this._abortReset(e);
    }

    // if e.target === .proceed__reset ->call _initiateReset
    this._initiateReset(e);
  }
  // display deleteOrEdit overlay at the click of option btn on the list
  _displayChoiceModalOverlay(e) {
    // Initializing event originator
    const optionBtn = e.target.closest('.more__options');

    // Guard clause
    if (!optionBtn) return;

    // Getting workout item DOM element
    const workoutItem = optionBtn.closest('.workout');

    // Initializing the workout id of the current workout
    const workoutId = workoutItem.dataset.id;

    // Selecting query DOM elements
    deletePromptContainerEl = workoutItem.querySelector(
      '.delete-prompt-container'
    );

    // Attaching workout Id to choice modal overlay
    choiceModalEl.dataset.id = workoutId;

    // Display deleteOrEditOverlay
    this._removeClass(choiceModalEl, 'hide');

    // Removing hide class from the delete and edit buttons
    this._removeClass(deleteBtnEl, 'hide');
    this._removeClass(editBtnEl, 'hide');

    // Adding the hide class to the delete prompt container element
    this._addClass(deletePromptContainerEl, 'hide');
  }

  _undoDisplayChoice() {
    // Methods for undoing the display of choice modal
    choiceModalEl.classList.add('hide');

    // Hiding delete prompt container
    this._addClass(deletePromptContainerEl, 'hide');
  }

  _addClass(el, klass) {
    // Method for adding class to an element
    el.classList.add(`${klass}`);
  }

  _removeClass(el, klass) {
    // Method for removing class from an element
    el.classList.remove(`${klass}`);
  }

  // Method for canceling the delete modal display
  _removeChoiceModalOverlay(e) {
    // Initializing the event originator
    const cancelBtn = e.target.closest('.cancel--btn');

    // Guard clause
    if (!cancelBtn) return;

    // Removing choiceModal
    this._undoDisplayChoice();
  }

  // Method for handling when no__cancel button is clicked
  _cancelWorkoutDelete(e) {
    const noBtn = e.target.closest('.no__cancel');

    // Guard clause
    if (!noBtn) return;

    // Remove choiceModal
    this._undoDisplayChoice();
  }

  // Method for handling when the delete button is clicked
  _deleteBtnClicked(e) {
    // Initializing the event originator (click on delete button)
    const deleteBtn = e.target.closest('.delete--btn');

    // Guard clause
    if (!deleteBtn) return;

    // hide the choice buttons and display the delete prompt
    this._addClass(deleteBtnEl, 'hide');
    this._addClass(editBtnEl, 'hide');

    this._removeClass(deletePromptContainerEl, 'hide');
  }

  // Method for handling when yes__delete button is clicked
  _deleteWorkout(e) {
    // Initializing event originator
    const yesBtn = e.target.closest('.yes__delete');

    // Guard clause
    if (!yesBtn) return;

    // Initializing current workout DOM element
    const workoutItemEl = yesBtn.closest('.workout');
    console.log(workoutItemEl);

    // Locating workoutItemEl in the #workouts Array via workoutItemEl id
    const curWorkout = this.#workouts.find(
      workout => workout._id === workoutItemEl.dataset.id
    );

    // Getting the index of the workout in the array + Deleting current workout from the #workouts array
    this.#workouts = this.#workouts.filter(work => work._id !== curWorkout._id);

    // --> Getting curWorkout index and Splicing it from #workouts array <--
    // const curWorkoutIndex = this.#workouts.indexOf(curWorkout); //
    // this.#workouts.splice(curWorkoutIndex, 1);

    workoutItemEl.remove(); // delete from workout list

    if (curWorkout.marker) this.#map.removeLayer(curWorkout.marker); // delete from markup if it exists
    // delete this._markers[curWorkout._id];

    this._setLocalStorage(); //Update localStorage

    // removing the entire overlay
    this._undoDisplayChoice();
  }

  // display overlay and edit form at the click of workout option btn on the list
  _displayEditAndOverlay(e) {
    e.preventDefault();

    // INITIALIZING EVENT ORIGINATOR
    const editBtn = e.target.closest('.edit--btn');

    // GUARD CLAUSE
    if (!editBtn) return; // Only run if edit button is clicked

    // Remove choice modal overlay
    this._undoDisplayChoice();

    // Locate the current workout
    this.#workoutElm = this.#workouts.find(
      workout => workout._id === choiceModalEl.dataset.id
    );

    if (!this.#workoutElm) return;

    const workout = this.#workouts.find(
      work => work._id === this.#workoutElm._id
    );

    // Bridge the current workout state into the editForm
    editInputDistance.value = workout.distance;
    editInputDuration.value = workout.duration;

    // Initializing current workout type
    this.#curWorkoutEdit = this.#workoutElm.type;

    // DISPLAYING THE OVERLAY AND EDIT FORM BY REMOVING THE HIDE CLASS
    overlayEl.classList.remove('hide');
    editFormEl.classList.remove('hide');

    // Set default focus to the editDistance input-field
    editInputDistance.focus();

    // reset input-fields visibity
    editInputCadence
      .closest('.edit-form__row')
      .classList.add('edit-form__row__hidden');
    editInputElevation
      .closest('.edit-form__row')
      .classList.add('edit-form__row__hidden');

    // If workout type is running, edit form should include cadence and exclude elevation gain
    if (this.#curWorkoutEdit === 'running')
      // Then based on the type you add && remove the classes of the inputfields accordingly
      editInputCadence
        .closest('.edit-form__row')
        .classList.remove('edit-form__row__hidden');

    editInputCadence.value = workout.cadence; // Bridge the current cadence state into the editForm

    // if workout type is cycling, edit form should include elavation gain and exclude cadence
    if (this.#curWorkoutEdit === 'cycling')
      editInputElevation
        .closest('.edit-form__row')
        .classList.remove('edit-form__row__hidden');

    editInputElevation.value = workout.elevationGain; // Bridge the current elevationGain state into the editForm
  }

  // Method for submitting edit form
  _submitEditForm(e) {
    e.preventDefault();

    console.log(e.target);
    if (!e.target) return;

    // Accessing current workout in array of workouts
    const currentWorkout = this.#workouts.find(
      workout => workout._id === this.#workoutElm._id
    );

    // Access editForm input data and update workout accordingly
    const newDistance = +editInputDistance.value;
    const newDuration = +editInputDuration.value;

    if (this.#curWorkoutEdit === 'running') {
      const newCadence = +editInputCadence.value;
      if (
        !this._isValidInputs(newDistance, newDuration, newCadence) ||
        !this._isPositiveNumb(newDistance, newDuration, newCadence)
      )
        return alert('Inputs have to be positive Numbers!');

      // Updating the workout component with the latest edit
      currentWorkout.distance = newDistance;
      currentWorkout.duration = newDuration;
      currentWorkout.cadence = newCadence;
      const newPace = currentWorkout.distance / currentWorkout.duration;
      currentWorkout.pace = +newPace.toFixed(1);
    }

    if (this.#curWorkoutEdit === 'cycling') {
      const newElevation = +editInputElevation.value;
      if (
        !this._isValidInputs(newDistance, newDuration, newElevation) ||
        !this._isPositiveNumb(newDistance, newDuration)
      )
        return alert(
          'Input have to be positive numbers with exception to the elevation-gain input-field'
        );

      // Updating the workout component with the latest edit
      currentWorkout.distance = newDistance;
      currentWorkout.duration = newDuration;
      currentWorkout.elevationGain = newElevation;
      const newSpeed = currentWorkout.duration / currentWorkout.distance;
      currentWorkout.speed = +newSpeed.toFixed(1);
    }

    // Updating workout list item
    this._updateWorkoutListItem(currentWorkout);

    // Erasing the workouts stored in local storage
    localStorage.removeItem('workouts');

    // Saving updated workouts to local storage
    this._setLocalStorage();

    this._hideEditForm();
  }

  // Method for removing the edit form
  _hideEditForm() {
    // Empty the edit form input fields
    editInputDistance.value =
      editInputDuration.value =
      editInputCadence.value =
      editInputElevation.value =
        '';

    // Remove the edit form + overlay
    editFormEl.classList.add('hide');
    overlayEl.classList.add('hide');
  }

  // Method for updating workout list after edit
  _updateWorkoutListItem(workout) {
    const workoutElement = document.querySelector(
      `.workout[data-id="${workout._id}"]`
    );

    if (!workoutElement) return;

    const values = workoutElement.querySelectorAll(
      '.workout__details .workout__value'
    );

    // Updating distance
    values[0].textContent = workout.distance;

    // Updating duration
    values[1].textContent = workout.duration;

    // Updating cadence + pace or elevationGain + speed
    if (workout.type === 'running') {
      // pace
      values[2].textContent = workout.pace;

      // Cadence
      values[3].textContent = workout.cadence;
    } else {
      //Speed
      values[2].textContent = workout.speed;

      // ElevationGain
      values[3].textContent = workout.elevationGain;
    }
  }

  // method for closing modal via click of closeModalBtn
  _closeModalViaBtnCLick(e) {
    // Preventing page reload
    e.preventDefault();

    // Initializing event.target
    const close = e.target;

    // Guard clause
    if (!close) return;

    // Hide edit form
    this._hideEditForm();
  }

  // Method for closing edit form via click of any part of overlay
  _closeModalViaOverlayClick(e) {
    // Initializing overlay element as event originator
    const target = e.target.closest('.overlay');

    // Guard clause
    if (!target) return;

    // Hide edit form
    this._hideEditForm();
  }

  // Method for closing editForm when escape key is pressed
  _closeModalOnEsc(e) {
    // Checking that e.key === "esc" +call _hideEditForm
    if (e.key === 'Escape') this._hideEditForm();
  }

  // Method for delegating click event methods on workout element
  _consolidateClickListener(e) {
    // If click is on more__options -> display deleteOrEditOverlay
    if (e.target.closest('.more__options')) {
      this._displayChoiceModalOverlay(e);
      return;
    }

    // If click is on cancel button -> remove the choice modal
    if (e.target.closest('.cancel--btn')) {
      this._removeChoiceModalOverlay(e);
      return;
    }

    // If delete button is clicked ->call deleteBtnclicked
    if (e.target.closest('.delete--btn')) {
      this._deleteBtnClicked(e);
      return;
    }

    // If the yes__delete button is clicked ->call _deleteWorkout
    if (e.target.closest('.yes__delete')) {
      this._deleteWorkout(e);
      return;
    }

    // If the no__cancel button is clicked ->call cancelWorkoutDelete
    if (e.target.closest('.no__cancel')) {
      this._cancelWorkoutDelete(e);
    }

    // // If click originates fron any part of overlay background -> _closeModalViaOverlayClick
    if (e.target.closest('.overlay')) {
      this._closeModalViaOverlayClick(e);
      return;
    }

    // // If click originates from close-modal button -> _closeModalViaBtnClick
    if (e.target.closest('.close-modal')) {
      this._closeModalViaBtnCLick(e);
      return;
    }

    // If click is on more options -> display edit form and overlay
    if (e.target.closest('.edit--btn')) {
      this._displayEditAndOverlay(e);
      return;
    }

    // If click is on anywhere else on the workout -> move to marker
    const workoutEl = e.target.closest('.workout');
    if (workoutEl) {
      this._moveToMapMarker(e);
    }
  }

  // // A submit event regulator method
  // _consolidateSubmitListener(e) {
  // }
}

const app = new App();
console.log(app);

// Update workout stored in local storage

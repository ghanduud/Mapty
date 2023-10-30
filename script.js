'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
	static idGenerator = 0;
	id;
	coords;
	distance;
	duration;
	date = new Date();
	constructor(coords, distance, duration) {
		this.id = Workout.idGenerator++;
		this.coords = coords;
		this.distance = distance;
		this.duration = duration;
	}

	setDescrition() {
		//prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
			months[this.date.getMonth()]
		} ${this.date.getDate()}`;
	}
}

class Running extends Workout {
	cadence;
	type = 'running';
	pace = this.duration / this.distance;
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.setDescrition();
	}
}

class Cycling extends Workout {
	elevationGain;
	type = 'cycling';
	speed = this.distance / (this.duration / 60);
	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.setDescrition();
	}
}

class App {
	#map;
	#mapEvent;
	#workouts = [];

	constructor() {
		this.#initApp();
	}

	#initApp() {
		this.#getPosition();
		this.#getLocalStorage();
		form.addEventListener('submit', this.#newWorkout.bind(this));
		inputType.addEventListener('change', this.#toggleElevationField);
		containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
	}

	#getPosition() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this), () => alert('error in location'));
		}
	}

	#loadMap(position) {
		const { latitude, longitude } = position.coords;
		const coords = [latitude, longitude];

		this.#map = L.map('map').setView(coords, 13);

		L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);
		this.#map.on('click', this.#showForm.bind(this));

		this.#workouts.forEach((work) => {
			this.#renderWorkoutMarker(work);
		});
	}

	#showForm(mapE) {
		this.#mapEvent = mapE;
		form.classList.remove('hidden');
		inputDistance.focus();
	}

	#toggleElevationField() {
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
	}

	#newWorkout(e) {
		e.preventDefault();

		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const { lat, lng } = this.#mapEvent.latlng;
		const coords = [lat, lng];
		let workout;

		if (type === 'running') {
			const cadence = +inputCadence.value;
			if (!this.#validInputs(distance, duration, cadence) || !this.#allPositive(distance, duration, cadence))
				return alert('inputs have to be a number');
			workout = new Running(coords, distance, duration, cadence);
		}

		if (type === 'cycling') {
			const elevation = +inputElevation.value;
			if (!this.#validInputs(distance, duration, elevation) || !this.#allPositive(distance, duration))
				return alert('inputs have to be a positive number');
			workout = new Cycling(coords, distance, duration, elevation);
		}

		this.#workouts.push(workout);

		this.#renderWorkoutMarker(workout);

		this.#renderWorkout(workout);

		this.#hideForm();

		this.#setLocalStorage();
	}

	#validInputs(...inputs) {
		return inputs.every((inp) => Number.isFinite(inp));
	}

	#allPositive(...inputs) {
		return inputs.every((inp) => inp > 0);
	}

	#renderWorkoutMarker(workout) {
		L.marker(workout.coords)
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
			.setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
			.openPopup();
	}

	#renderWorkout(workout) {
		let html = `
		<li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
		`;

		if (workout.type === 'running')
			html += `
				<div class="workout__details">
				<span class="workout__icon">⚡️</span>
				<span class="workout__value">${workout.pace.toFixed(1)}</span>
				<span class="workout__unit">min/km</span>
			</div>
			<div class="workout__details">
				<span class="workout__icon">🦶🏼</span>
				<span class="workout__value">${workout.cadence}</span>
				<span class="workout__unit">spm</span>
			</div>
			</li>
		`;

		if (workout.type === 'cycling')
			html += `
				<div class="workout__details">
				<span class="workout__icon">⚡️</span>
				<span class="workout__value">${workout.speed.toFixed(1)}</span>
				<span class="workout__unit">km/h</span>
			</div>
			<div class="workout__details">
				<span class="workout__icon">⛰</span>
				<span class="workout__value">${workout.elevationGain}</span>
				<span class="workout__unit">m</span>
			</div>
			</li>
		`;

		form.insertAdjacentHTML('afterend', html);
	}

	#hideForm() {
		inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
		form.style.display = 'none';
		form.classList.add('hidden');
		setTimeout(() => (form.style.display = 'grid'), 1000);
	}

	#moveToPopup(e) {
		const workoutEl = e.target.closest('.workout');
		if (!workoutEl) return;

		const workout = this.#workouts.find((work) => work.id == workoutEl.dataset.id);
		this.#map.setView(workout.coords, 13, {
			animate: true,
			pan: {
				duration: 1,
			},
		});
	}

	#setLocalStorage() {
		localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	}

	#getLocalStorage() {
		const data = JSON.parse(localStorage.getItem('workouts'));
		if (!data) return;
		this.#workouts = [...data];
		this.#workouts.forEach((work) => {
			this.#renderWorkout(work);
		});
	}

	reset() {
		localStorage.removeItem('workouts');
		location.reload();
	}
}

const app = new App();

/////////////////////////////////////////

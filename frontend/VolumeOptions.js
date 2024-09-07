class VolumeOptions {
	constructor(inputs, callback, {links} = {}) {
		this.inputs = inputs;
		this.links = links;

		this.forEachInput(node => node.addEventListener("input", e => {
			e.target.value = VolumeOptions.parseVolume(e.target.value, e.target.min, e.target.max);

			this.forEachInput(n => n.value = e.target.value);

			callback(+e.target.value);
		}))
	}


	forEachInput(callback) {
		this.inputs.forEach(callback);
	}
	forEachNode(callback) {
		[...this.inputs, ...this.links].forEach(callback);
	}


	addClass(className) {
		this.forEachNode(node => node.classList.add(className));
	}
	removeClass(className) {
		this.forEachNode(node => node.classList.remove(className));
	}
	hasClass(className) {
		return this.inputs[0].classList.contains(className);
	}


	get enabled() {
		return !this.hasClass("disabled");
	}
	set enabled(enable) {
		if (enable) this.removeClass("disabled");
		else this.addClass("disabled");
	}


	static parseVolume(volume, min, max) {
		let parsed = parseInt(volume);

		if (isNaN(parsed) || parsed < min) return min;
		else if (parsed > max) return max;

		return parsed;
	}
}
export class MiniSliderSystem {
  constructor() {
    this.config = {
      motion: {
        progressSpeed: 0.006,
        smoothing: 0.2,
        staggerStrength: 0.75,
      },
      dimensions: {
        miniWidth: 80,
        bottomMargin: 50,
        rightMargin: 45,
        imageGap: 7,
      },
    };

    this.state = {
      mode: "inactive",
      progress: 0,
      zoomedImageIndex: null,
      lastProgress: null,
    };
  }

  calculateDimensions(scale) {
    this.config.dimensions = {
      ...this.config.dimensions,
      miniWidth: Math.round(80 * scale),
      bottomMargin: Math.round(50 * scale),
      rightMargin: Math.round(45 * scale),
      imageGap: Math.round(7 * scale),
    };
  }

  getMiniTarget(index, totalImages, aspectRatio) {
    const { miniWidth, bottomMargin, rightMargin, imageGap } = this.config.dimensions;
    const miniHeight = miniWidth / aspectRatio;
    const totalWidth = totalImages * (miniWidth + imageGap);

    const miniX = window.innerWidth - totalWidth + index * (miniWidth + imageGap) - rightMargin;
    const miniY = window.innerHeight - miniHeight - bottomMargin;

    return {
      x: miniX,
      y: miniY,
      width: miniWidth,
      height: miniHeight,
      miniHeight,
    };
  }

  toMini(zoomedIndex) {
    this.state = {
      ...this.state,
      mode: "toMini",
      progress: 0,
      zoomedImageIndex: zoomedIndex,
    };
  }

  toSlider() {
    if (this.state.mode === "inactive") return;

    this.state = {
      ...this.state,
      progress: 0,
      mode: "toSlider",
    };
  }

  calculateStaggerDelay(index, totalImages, mode) {
    if (mode === "toMini") {
      // Calculate delay based on distance from zoomed image
      const distance = Math.abs(index - this.state.zoomedImageIndex);
      return Math.max(
        0,
        (Math.pow(distance, 1.25) / (totalImages * totalImages)) *
          this.config.motion.staggerStrength
      );
    } else {
      // Calculate sequential delay for toSlider
      const normalizedIndex = (index + 1) / (totalImages - 1); // 0 to 1
      return normalizedIndex * 0.125; //Math.max(0, this.state.progress - normalizedIndex * 0.8);
    }
  }

  calculateImageProgress(index, totalImages) {
    const toSliderDelay = this.calculateStaggerDelay(index, totalImages, "toSlider");
    const toMiniModeDelay = this.calculateStaggerDelay(index, totalImages, "toMini");

    let adjustedProgress;
    if (this.state.mode === "toMini") {
      adjustedProgress = Math.max(0, this.state.progress - toMiniModeDelay / (1 - toMiniModeDelay));
      return Math.min(1, Math.max(0, adjustedProgress));
    } else if (this.state.progress - toSliderDelay < 0 && this.state.mode === "toSlider") {
      // continue with toMini mode progress
      return -Math.max(0, this.state.lastProgress - toMiniModeDelay / (1 - toMiniModeDelay));
    } else return (this.state.progress - toSliderDelay) / (1 - toSliderDelay);
  }

  getProgress(index, totalImages) {
    const progress = this.calculateImageProgress(index, totalImages);
    if (this.state.mode === "toMini") this.state.lastProgress = this.state.progress;
    return progress;
  }

  updateAnimation(dt) {
    if (this.state.mode === "inactive") return;

    //dt *= 0.08;

    const progressDelta = this.config.motion.progressSpeed * dt;

    this.state.progress = Math.max(0, Math.min(1, this.state.progress + progressDelta));
    if (this.state.mode === "toSlider")
      this.state.lastProgress = Math.max(0, Math.min(1, this.state.lastProgress + progressDelta));
  }

  expDecay(a, b, decay, dt) {
    return b + (a - b) * Math.exp(-decay * dt);
  }

  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  getCurrentState() {
    return {
      mode: this.state.mode,
      progress: this.state.progress,
      zoomedImageIndex: this.state.zoomedImageIndex,
    };
  }

  isInToMiniMode() {
    return this.state.mode === "toMini";
  }

  isInToSliderMode() {
    return this.state.mode === "toSlider";
  }

  isActive() {
    return this.state.mode !== "inactive";
  }

  setInactive() {
    this.state.mode = "inactive";
    this.state.progress = 0;
  }
}

export class CrossAnimationSystem {
  constructor() {
    this.params = {
      smoothing: 0.15, // Animation speed for both show and hide
      maxLineLength: 11,
      strokeStyle: "#fdfdfddd",
      lineWidth: 1.75,
      showMinThreshold: 0.01,
      sideMargin: 275, // Distance from screen edges for side crosses
      centerShowDelay: 0.2, // Delay in seconds before center cross shows
      sidesShowDelay: 0.2, // Delay in seconds before side crosses show
      delaySlowFactor: 0.005, // Factor to multiply with dt

      rotationSpeed: 0.3,
      rotationSmoothing: 0.075,
      rotationStep: Math.PI / 2,
      rotationMinThreshold: 0.00001,
    };

    this.state = {
      center: {
        isVisible: true,
        isAnimatingIn: false,
        isAnimatingOut: false,
        currentLength: this.params.maxLineLength,
        showDelayRemaining: 0,
      },
      sides: {
        isVisible: false,
        isAnimatingIn: false,
        isAnimatingOut: false,
        currentLength: 0,
        showDelayRemaining: 0,

        currentRotation: 0,
        targetRotation: 0,
        isRotating: false,
      },
    };
  }

  rotateSideCrosses(direction) {
    if (!this.state.sides.isVisible) return;

    this.state.sides.targetRotation += direction * (Math.PI / 2); // Add/subtract 90 degrees
    this.state.sides.isRotating = true;
  }

  resetRotation() {
    this.state.sides.currentRotation = 0;
    this.state.sides.targetRotation = 0;
    this.state.sides.isRotating = false;
  }

  showCenter() {
    if (this.state.center.isAnimatingOut) {
      this.state.center.isAnimatingOut = false;
    }
    this.state.center.isVisible = true;
    this.state.center.isAnimatingIn = true;
    this.state.center.showDelayRemaining = this.params.centerShowDelay;

    // Hide side crosses when center shows
    this.state.sides.isAnimatingOut = true;
    this.state.sides.isAnimatingIn = false;
  }

  hideCenter() {
    this.state.center.isAnimatingOut = true;
    this.state.center.isAnimatingIn = false;

    // Show side crosses when center hides
    if (this.state.sides.isAnimatingOut) {
      this.state.sides.isAnimatingOut = false;
    }
    this.state.sides.isVisible = true;
    this.state.sides.isAnimatingIn = true;
    this.state.sides.showDelayRemaining = this.params.sidesShowDelay;
  }

  updateAnimation(dt) {
    // Update center cross
    if (this.state.center.isVisible) {
      const targetLength = this.state.center.isAnimatingOut ? 0 : this.params.maxLineLength;
      const centerDelta = targetLength - this.state.center.currentLength;

      if (this.state.center.isAnimatingIn && this.state.center.showDelayRemaining > 0) {
        this.state.center.showDelayRemaining -= this.params.delaySlowFactor * dt;
      } else {
        const change = centerDelta * this.params.smoothing * dt;
        this.state.center.currentLength += change;
      }

      if (
        this.state.center.isAnimatingOut &&
        Math.abs(centerDelta) < this.params.showMinThreshold
      ) {
        this.state.center.isAnimatingOut = false;
        this.state.center.isVisible = false;
        this.state.center.currentLength = 0;
      }
    }

    // Update side crosses
    if (this.state.sides.isVisible) {
      const targetLength = this.state.sides.isAnimatingOut ? 0 : this.params.maxLineLength;
      const sidesDelta = targetLength - this.state.sides.currentLength;

      if (this.state.sides.isAnimatingIn && this.state.sides.showDelayRemaining > 0) {
        this.state.sides.showDelayRemaining -= this.params.delaySlowFactor * dt;
      } else {
        const change = sidesDelta * this.params.smoothing * dt;
        this.state.sides.currentLength += change;
      }

      if (this.state.sides.isAnimatingOut && Math.abs(sidesDelta) < this.params.showMinThreshold) {
        this.state.sides.isAnimatingOut = false;
        this.state.sides.isVisible = false;
        this.state.sides.currentLength = 0;
      }
    }

    const rotationDelta = this.state.sides.targetRotation - this.state.sides.currentRotation;
    this.state.sides.currentRotation += rotationDelta * this.params.rotationSmoothing * dt;
  }

  renderCross(ctx, centerX, centerY, length, rotation = 0) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // Draw vertical line
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.lineTo(0, length);
    ctx.stroke();

    // Draw horizontal line
    ctx.beginPath();
    ctx.moveTo(-length, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();

    ctx.restore();
  }

  render(ctx, centerX, centerY) {
    // Set line style
    ctx.strokeStyle = this.params.strokeStyle;
    ctx.lineWidth = this.params.lineWidth;

    // Render center cross if visible
    if (this.state.center.isVisible) {
      this.renderCross(ctx, centerX, centerY, this.state.center.currentLength);
    }

    // Render side crosses if visible
    if (this.state.sides.isVisible) {
      // Left cross
      this.renderCross(
        ctx,
        this.params.sideMargin + this.params.maxLineLength,
        centerY,
        this.state.sides.currentLength,
        this.state.sides.currentRotation
      );

      // Right cross
      this.renderCross(
        ctx,
        window.innerWidth - this.params.sideMargin - this.params.maxLineLength,
        centerY,
        this.state.sides.currentLength,
        this.state.sides.currentRotation
      );
    }
  }

  isInToMiniMode() {
    return this.state.center.isAnimatingOut || this.state.sides.isAnimatingIn;
  }

  isInToSliderMode() {
    return this.state.center.isAnimatingIn || this.state.sides.isAnimatingOut;
  }

  isActive() {
    return true; // System is always active now
  }
}

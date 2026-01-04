export class TitleAnimationSystem {
  constructor() {
    this.params = {
      smoothing: {
        show: 0.085,
        hide: 0.18,
      },
      showDelay: 0.025,
    };

    this.state = {
      currentTitleIndex: null,
      isAnimatingIn: false,
      isAnimatingOut: false,
      currentPosition: 100, // Start from 100% (fully hidden below)
      targetPosition: 100, // Target position for the animation
      exitDirection: "bottom",
      titleElements: [],
      remainigDelay: 0,
      showNextIndex: null,
    };

    this.initialize();
  }

  initialize() {
    const titleList = document.getElementById("title-list");
    this.state.titleElements = Array.from(titleList.querySelectorAll(".title a"));

    this.state.titleElements.forEach((title) => {
      title.style.transition = "none";
      title.style.transform = "translate3d(0, 100%, 0)";
      title.style.pointerEvents = "none";
    });
  }

  setNextTitle(index) {
    this.state.showNextIndex = index;
  }

  resetNextTitle() {
    this.state.showNextIndex = null;
  }

  showTitle(index, delay = null) {
    // Store the current position before changing states
    if (this.state.currentTitleIndex !== null) {
      const currentTitle = this.state.titleElements[this.state.currentTitleIndex];
      const match = currentTitle.style.transform.match(/translate3d\(0px,\s*(\-?\d+\.?\d*)%/);
      this.state.currentPosition = match ? parseFloat(match[1]) : 100;
    } else {
      this.state.currentPosition = 100; // Start from hidden below
    }

    this.state.isAnimatingOut = false;
    this.state.isAnimatingIn = true;
    this.state.currentTitleIndex = index;
    this.state.targetPosition = 0; // Target is fully visible (0%)
    if (delay !== null) {
      this.state.remainigDelay = delay;
    } else {
      this.state.remainigDelay = this.params.showDelay;
    }

    // Enable pointer events for the current title
    if (this.state.titleElements[index]) {
      this.state.titleElements[index].style.pointerEvents = "auto";
    }
  }

  hideTitle() {
    if (this.state.currentTitleIndex !== null) {
      const titleElement = this.state.titleElements[this.state.currentTitleIndex];

      // Store current position
      const match = titleElement.style.transform.match(/translate3d\(0px,\s*(\-?\d+\.?\d*)%/);
      this.state.currentPosition = match ? parseFloat(match[1]) : 0;

      // Determine exit direction based on current position
      this.state.exitDirection = this.state.currentPosition < 33 ? "top" : "bottom";
      this.state.targetPosition = this.state.exitDirection === "top" ? -100 : 100;

      this.state.isAnimatingOut = true;
      this.state.isAnimatingIn = false;
      this.state.remainigDelay = 0;

      // Disable pointer events
      titleElement.style.pointerEvents = "none";
    }
  }

  updateAnimation(dt) {
    if (!this.state.titleElements.length || this.state.currentTitleIndex === null) return;

    const currentTitle = this.state.titleElements[this.state.currentTitleIndex];
    if (!currentTitle) return;

    if (this.state.isAnimatingIn && this.state.remainigDelay > 0) {
      this.state.remainigDelay -= dt / 1000;
      return;
    }

    // Calculate the appropriate smoothing factor
    const smoothing = this.state.isAnimatingIn
      ? this.params.smoothing.show
      : this.params.smoothing.hide;

    // Update position using exponential interpolation
    const delta = this.state.targetPosition - this.state.currentPosition;
    const change = delta * smoothing * dt;
    this.state.currentPosition += change;

    // Apply the transform
    currentTitle.style.transform = `translate3d(0, ${this.state.currentPosition}%, 0)`;

    // Check if animation is complete
    const isVeryNearTarget = Math.abs(delta) < 0.01;
    const isNearTarget = Math.abs(delta) < 0.1;
    if (isVeryNearTarget) {
      if (this.state.isAnimatingOut) {
        this.state.isAnimatingOut = false;
        this.state.currentTitleIndex = null;
        this.state.currentPosition = this.state.targetPosition;
      } else if (this.state.isAnimatingIn) {
        this.state.isAnimatingIn = false;
        this.state.currentPosition = this.state.targetPosition;
      }
    }
    if (this.state.isAnimatingOut && isNearTarget && this.state.showNextIndex !== null) {
      this.state.currentTitleIndex = null;
      this.showTitle(this.state.showNextIndex, 0);
      this.state.showNextIndex = null;
    }
  }

  easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  isActive() {
    return this.state.isAnimatingIn || this.state.isAnimatingOut;
  }
}

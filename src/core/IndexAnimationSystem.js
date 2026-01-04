export class IndexAnimationSystem {
  constructor(options = {}) {
    // Animation configuration
    this.config = {
      height: 24,
      font: "15px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      color: "#fdfdfddd",
      style: options.style || "smooth", // 'snap', 'smooth', or 'clipped'

      // Snap animation config (original style)
      snap: {
        animationSpeed: 0.25,
        gap: 0,
      },

      // Smooth animation config (fade style)
      smooth: {
        animationSpeed: 0.005, // Base animation speed
        numberSpacing: 24, // Vertical spacing between numbers
        fadeSpeed: 0.12, // Speed of opacity transitions
        maxAlpha: 0.99, // Maximum opacity for non-centered numbers
      },

      // Clipped animation config (scroll style)
      clipped: {
        animationSpeed: 0.008, // Match smooth animation speed
        numberSpacing: 24, // Match number spacing
        visibleHeight: 24, // Height of visible area for numbers
      },
    };

    // State management
    this.state = {
      // Shared state
      currentIndex: 0,
      targetIndex: 0,

      // Snap animation state
      snapOffset: 0,
      snapProgress: 1,

      // Smooth/Clipped animation states
      offset: 0, // Current vertical offset
      transitionProgress: 1, // Progress of current transition
      opacity: 1, // Current opacity for smooth transitions
      lastDirection: 0, // Last movement direction
      isTransitioning: false, // Active transition flag
    };
  }

  /**
   * Updates the animation state based on the current scroll position
   */
  updateIndex(scrollPosition, containerWidth, containerGap) {
    const transitionWidth = containerWidth + containerGap;
    const halfGap = containerGap / 2;
    const firstTransitionPoint = containerWidth / 2 + halfGap;

    let newTargetIndex = 0;
    if (scrollPosition >= firstTransitionPoint) {
      const distanceAfterFirst = scrollPosition - firstTransitionPoint;
      newTargetIndex = 1 + Math.floor(distanceAfterFirst / transitionWidth);
    }

    // Handle index changes based on style
    if (newTargetIndex !== this.state.targetIndex) {
      if (this.config.style === "snap") {
        this.updateSnapAnimation(newTargetIndex);
      } else {
        this.updateSmoothOrClippedAnimation(newTargetIndex);
      }
      this.state.targetIndex = newTargetIndex;
    }

    // Update ongoing animations
    if (this.config.style === "snap") {
      this.updateSnapProgress();
    } else {
      this.updateSmoothOrClippedProgress();
    }
  }

  /**
   * Initialize snap-style animation
   */
  updateSnapAnimation(newTargetIndex) {
    const direction = newTargetIndex > this.state.targetIndex ? 1 : -1;
    this.state.currentIndex = this.state.targetIndex;
    this.state.snapProgress = 0;
    this.state.snapOffset = this.config.height * direction;
  }

  /**
   * Update snap animation progress
   */
  updateSnapProgress() {
    if (this.state.snapProgress < 1) {
      this.state.snapProgress = Math.min(
        1,
        this.state.snapProgress + this.config.snap.animationSpeed
      );

      const easeOutQuad = 1 - Math.pow(1 - this.state.snapProgress, 2);
      this.state.snapOffset *= 1 - easeOutQuad;
    }
  }

  /**
   * Initialize smooth or clipped animation
   */
  updateSmoothOrClippedAnimation(newTargetIndex) {
    const direction = newTargetIndex > this.state.targetIndex ? 1 : -1;

    this.state.currentIndex = this.state.targetIndex;
    this.state.transitionProgress = 0;
    this.state.offset = this.config[this.config.style].numberSpacing * direction;
    this.state.lastDirection = direction;
    this.state.isTransitioning = true;

    if (this.config.style === "smooth") {
      this.state.opacity = 0; // Start with zero opacity for entering number
    }
  }

  /**
   * Update smooth or clipped animation progress
   */
  updateSmoothOrClippedProgress() {
    if (!this.state.isTransitioning) return;

    if (this.state.transitionProgress < 1) {
      // Update transition progress
      this.state.transitionProgress = Math.min(
        1,
        this.state.transitionProgress + this.config[this.config.style].animationSpeed
      );

      // Apply easing for smoother motion
      const progress = this.easeOutCubic(this.state.transitionProgress);
      this.state.offset *= 1 - progress;

      // Handle opacity for smooth style only
      if (this.config.style === "smooth") {
        // Quick fade crossover - uses fadeSpeed to control the transition
        const fadePoint = this.config.smooth.fadeSpeed; // Point where opacities cross
        if (this.state.transitionProgress < fadePoint) {
          // First half: entering number fades in quickly
          this.state.opacity = this.state.transitionProgress / fadePoint;
        } else {
          // Second half: fully opaque
          this.state.opacity = 1;
        }
      }
    } else {
      // Reset state when animation completes
      this.state.isTransitioning = false;
      this.state.offset = 0;
      if (this.config.style === "smooth") {
        this.state.opacity = 1;
      }
    }
  }

  /**
   * Cubic easing function for smoother motion
   */
  easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  /**
   * Renders the index counter
   */
  render(ctx, centerX, bottomY, totalImages) {
    switch (this.config.style) {
      case "snap":
        this.renderSnapStyle(ctx, centerX, bottomY, totalImages);
        break;
      case "smooth":
        this.renderSmoothStyle(ctx, centerX, bottomY, totalImages);
        break;
      case "clipped":
        this.renderClippedStyle(ctx, centerX, bottomY, totalImages);
        break;
    }
  }

  /**
   * Renders the original snap-style animation
   */
  renderSnapStyle(ctx, centerX, bottomY, totalImages) {
    const height = this.config.height;

    ctx.save();
    ctx.font = this.config.font;
    ctx.fillStyle = this.config.color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";

    // Create clipping region
    ctx.beginPath();
    ctx.rect(centerX - 50, bottomY - height, 40, height * 2);
    ctx.clip();

    // Draw current number
    const currentY = bottomY + this.state.snapOffset;
    ctx.fillText((this.state.targetIndex + 1).toString(), centerX - 20, currentY);

    // Draw transitioning number if animating
    if (this.state.snapProgress < 1) {
      const prevNumber = this.state.currentIndex + 1;
      const direction = this.state.targetIndex > this.state.currentIndex ? -1 : 1;
      const transitionY = currentY + height * -direction;
      ctx.fillText(prevNumber.toString(), centerX - 20, transitionY);
    }

    ctx.restore();

    // Draw total count
    ctx.font = this.config.font;
    ctx.fillStyle = this.config.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`―  ${totalImages}`, centerX - 12, bottomY);
  }

  /**
   * Renders the smooth-style animation with fade effects
   */
  renderSmoothStyle(ctx, centerX, bottomY, totalImages) {
    ctx.save();
    ctx.font = this.config.font;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";

    // Create clipping region
    const clipHeight = this.config.smooth.numberSpacing * 1.5;
    ctx.beginPath();
    ctx.rect(centerX - 50, bottomY - clipHeight, 40, clipHeight * 2);
    ctx.clip();

    // Draw current (target) number
    const currentY = bottomY + this.state.offset;
    ctx.fillStyle = `rgba(253, 253, 253, ${this.state.opacity})`;
    ctx.fillText((this.state.targetIndex + 1).toString(), centerX - 20, currentY);

    // Draw transitioning number during active transition
    if (this.state.isTransitioning && this.state.transitionProgress < 1) {
      const prevNumber = this.state.currentIndex + 1;
      const transitionY = currentY + this.config.smooth.numberSpacing * -this.state.lastDirection;
      // Exiting number fades out as entering number fades in
      const exitingOpacity = Math.max(
        0,
        1 - this.state.transitionProgress / this.config.smooth.fadeSpeed
      );

      if (exitingOpacity > 0) {
        ctx.fillStyle = `rgba(253, 253, 253, ${exitingOpacity})`;
        ctx.fillText(prevNumber.toString(), centerX - 20, transitionY);
      }
    }

    ctx.restore();

    // Draw total count
    ctx.font = this.config.font;
    ctx.fillStyle = this.config.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`―  ${totalImages}`, centerX - 10, bottomY);
  }

  /**
   * Renders the clipped-style animation
   */
  renderClippedStyle(ctx, centerX, bottomY, totalImages) {
    ctx.save();
    ctx.font = this.config.font;
    ctx.fillStyle = this.config.color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";

    // Create strict clipping region
    const visibleHeight = this.config.clipped.visibleHeight;
    ctx.beginPath();
    ctx.rect(centerX - 50, bottomY - visibleHeight / 2, 40, visibleHeight);
    ctx.clip();

    // Draw current number
    const currentY = bottomY + this.state.offset;
    ctx.fillText((this.state.targetIndex + 1).toString(), centerX - 20, currentY);

    // Draw transitioning number during animation
    if (this.state.isTransitioning) {
      const prevNumber = this.state.currentIndex + 1;
      const transitionY = currentY + this.config.clipped.numberSpacing * -this.state.lastDirection;
      ctx.fillText(prevNumber.toString(), centerX - 20, transitionY);
    }

    ctx.restore();

    // Draw total count
    ctx.font = this.config.font;
    ctx.fillStyle = this.config.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`―  ${totalImages}`, centerX - 10, bottomY);
  }
}

import { StageAnimationSystem } from "./StageAnimationSystem.js";

export class ImageZoomSystem {
  constructor() {
    this.params = {
      transitionSmoothing: 0.13,
      isCompleteThreshold: 0.0000001,
    };

    this.zoomInLocked = false;
    this.zoomOutLocked = false;

    this.state = {
      isActive: false,
      isZoomingOut: false,
      isZoomingIn: false,
      imageIndex: null,
      progress: 0,
    };
  }

  isTransitioning() {
    return this.state.isZoomingIn || this.state.isZoomingOut;
  }

  initStageSystem(nImages) {
    this.stageSystem = new StageAnimationSystem(nImages);
  }

  zoomIn(imageIndex) {
    if (this.state.isZoomingOut) this.state.isZoomingOut = false;

    this.state.isActive = true;
    this.state.isZoomingIn = true;
    this.state.imageIndex = imageIndex;
    this.state.progress = 0;

    this.stageSystem.initializeStage(imageIndex);
  }

  zoomOut() {
    this.state.isZoomingOut = true;
    this.state.isZoomingIn = false;
  }

  transitionToImage(newIndex) {
    if (newIndex !== this.state.imageIndex) {
      this.stageSystem.transitionTo(newIndex);
      this.state.imageIndex = newIndex;
    }
  }

  jumpToImage(newIndex) {
    if (newIndex !== this.state.imageIndex) {
      this.stageSystem.jumpToImage(newIndex);
      this.state.imageIndex = newIndex;
    }
  }

  updateAnimation(dt) {
    if (!this.state.isActive) return false;

    if (this.state.isZoomingIn) dt *= 0.2;
    else dt *= 0.8;

    const targetProgress = this.state.isZoomingOut ? 0 : 1;

    // Update main zoom animation
    this.state.progress +=
      (targetProgress - this.state.progress) * this.params.transitionSmoothing * dt;

    // Update stage system if it's transitioning
    this.stageSystem.updateAnimation(dt);

    // Check if zoom animation is complete
    if (this.state.isZoomingOut && this.state.progress < this.params.isCompleteThreshold) {
      this.state.isZoomingOut = false;
      this.state.isActive = false;
    }
  }

  render(ctx, image, imageRect, maskRect, allImages) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Calculate fullscreen dimensions with proper aspect ratio
    const screenRatio = window.innerWidth / window.innerHeight;
    const imageRatio = image.width / image.height;

    let fullscreenWidth, fullscreenHeight;

    // Ensure image covers screen while maintaining aspect ratio
    if (screenRatio > imageRatio) {
      fullscreenHeight = window.innerHeight;
      fullscreenWidth = window.innerHeight * imageRatio;

      if (fullscreenWidth < window.innerWidth) {
        const scale = window.innerWidth / fullscreenWidth;
        fullscreenWidth = window.innerWidth;
        fullscreenHeight *= scale;
      }
    } else {
      fullscreenWidth = window.innerWidth;
      fullscreenHeight = window.innerWidth / imageRatio;

      if (fullscreenHeight < window.innerHeight) {
        const scale = window.innerHeight / fullscreenHeight;
        fullscreenHeight = window.innerHeight;
        fullscreenWidth *= scale;
      }
    }

    // Use cubic easing for smoother animation
    const easeProgress = this.easeOutCubic(this.state.progress);

    // Calculate sizes
    const currentWidth = this.lerp(imageRect.width, fullscreenWidth, easeProgress);
    const currentHeight = this.lerp(imageRect.height, fullscreenHeight, easeProgress);
    const currentMaskWidth = this.lerp(maskRect.width, window.innerWidth, easeProgress);
    const currentMaskHeight = this.lerp(maskRect.height, window.innerHeight, easeProgress);

    // Calculate the center points of start and end positions
    const startImageCenterX = imageRect.x + imageRect.width / 2;
    const startImageCenterY = imageRect.y + imageRect.height / 2;
    const startMaskCenterX = maskRect.x + maskRect.width / 2;
    const startMaskCenterY = maskRect.y + maskRect.height / 2;

    // Interpolate centers
    const currentImageCenterX = this.lerp(centerX, startImageCenterX, 1 - easeProgress);
    const currentImageCenterY = this.lerp(centerY, startImageCenterY, 1 - easeProgress);
    const currentMaskCenterX = this.lerp(centerX, startMaskCenterX, 1 - easeProgress);
    const currentMaskCenterY = this.lerp(centerY, startMaskCenterY, 1 - easeProgress);

    // Calculate final positions based on centers
    const imageX = currentImageCenterX - currentWidth / 2;
    const imageY = currentImageCenterY - currentHeight / 2;
    const maskX = currentMaskCenterX - currentMaskWidth / 2;
    const maskY = currentMaskCenterY - currentMaskHeight / 2;

    if (this.stageSystem.isTransitioning()) {
      // Use stage system for transitions
      this.stageSystem.render(
        ctx,
        allImages,
        {
          x: imageX,
          y: imageY,
          width: currentWidth,
          height: currentHeight,
        },
        {
          x: maskX,
          y: maskY,
          width: currentMaskWidth,
          height: currentMaskHeight,
        }
      );
    } else {
      // Use normal rendering for single image
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(maskX, maskY, currentMaskWidth, currentMaskHeight, 1);
      ctx.clip();
      ctx.drawImage(image.element, imageX, imageY, currentWidth, currentHeight);
      ctx.restore();
    }
  }

  expDecay(start, end, progress) {
    return start + (end - start) * (1 - Math.exp(-3 * progress));
  }

  // Helper method for linear interpolation
  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  // Helper method for cubic easing
  easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  getCurrentState() {
    return {
      isActive: this.state.isActive,
      isZoomingOut: this.state.isZoomingOut,
      isZoomingIn: this.state.isZoomingIn,
      imageIndex: this.state.imageIndex,
      progress: this.state.progress,
    };
  }

  isActive() {
    return this.state.isActive;
  }
}
